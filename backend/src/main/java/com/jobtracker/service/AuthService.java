package com.jobtracker.service;

import java.time.Instant;

import org.springframework.dao.DuplicateKeyException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import com.jobtracker.dto.auth.AuthResponse;
import com.jobtracker.dto.auth.LoginRequest;
import com.jobtracker.dto.auth.RegisterRequest;
import com.jobtracker.exception.DuplicateEmailException;
import com.jobtracker.exception.InvalidCredentialsException;
import com.jobtracker.model.User;
import com.jobtracker.repository.UserRepository;
import com.jobtracker.security.JwtUtil;

import lombok.extern.slf4j.Slf4j;

/**
 * Business logic for registration and login.
 *
 * <p>Both operations return the issued JWT string alongside user info via
 * {@link AuthResult}, so the controller layer can attach the JWT to the
 * response as an httpOnly cookie while keeping the JSON body limited to
 * user-facing fields.</p>
 */
@Slf4j
@Service
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;
    private final ColumnService columnService;

    public AuthService(
            UserRepository userRepository,
            PasswordEncoder passwordEncoder,
            JwtUtil jwtUtil,
            ColumnService columnService
    ) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtUtil = jwtUtil;
        this.columnService = columnService;
    }

    /**
     * Creates a new user account with a BCrypt-hashed password and issues
     * a JWT for the newly created account.
     *
     * @param request the validated registration payload
     * @return the issued JWT plus the created user's public info
     * @throws DuplicateEmailException if the email is already registered
     */
    public AuthResult register(RegisterRequest request) {
        // Normalized once, here, and used for every lookup/store below —
        // see normalizeEmail()'s Javadoc for why this must happen before
        // the very first repository call rather than being applied
        // piecemeal at each use site.
        String email = normalizeEmail(request.email());

        userRepository.findByEmail(email).ifPresent(existing -> {
            throw new DuplicateEmailException("An account with this email already exists");
        });

        User user = User.builder()
                .name(request.name())
                .email(email)
                .passwordHash(passwordEncoder.encode(request.password()))
                .createdAt(Instant.now())
                .build();

        User saved;
        try {
            saved = userRepository.save(user);
        } catch (DuplicateKeyException ex) {
            // Defense-in-depth: the findByEmail check above is racy under
            // concurrent registrations for the same email — two requests
            // can both pass it before either saves. The unique index on
            // User.email (auto-index-creation: true) is the real guard;
            // this translates its violation into the same 409 the
            // application-level check produces, instead of an unhandled
            // 500 from a raw Mongo duplicate-key error.
            throw new DuplicateEmailException("An account with this email already exists");
        }

        // Every new account starts with the standard 5-column board; only
        // happens here at registration, never on login.
        columnService.seedDefaultColumns(saved.getId());

        String token = jwtUtil.generate(saved.getEmail());
        // Business-event audit trail — email is a stored, already-returned
        // field (not a secret); never log the password or the token value.
        log.info("User registered: {}", saved.getEmail());
        return new AuthResult(token, toAuthResponse(saved));
    }

    /**
     * Verifies the supplied credentials against the stored account and
     * issues a fresh JWT on success.
     *
     * @param request the validated login payload
     * @return the issued JWT plus the authenticated user's public info
     * @throws InvalidCredentialsException if the email is unknown or the password doesn't match
     */
    public AuthResult login(LoginRequest request) {
        User user = userRepository.findByEmail(normalizeEmail(request.email()))
                .orElseThrow(() -> new InvalidCredentialsException("Invalid email or password"));

        if (!passwordEncoder.matches(request.password(), user.getPasswordHash())) {
            throw new InvalidCredentialsException("Invalid email or password");
        }

        String token = jwtUtil.generate(user.getEmail());
        log.info("User logged in: {}", user.getEmail());
        return new AuthResult(token, toAuthResponse(user));
    }

    /**
     * Maps a persisted {@link User} to the public {@link AuthResponse} DTO
     * shared by register/login/{@code /me} — never exposes the password
     * hash. Public (not private) so {@code AuthController} can reuse it for
     * {@code GET /api/auth/me}, which returns the same shape for an
     * already-authenticated session without issuing a new token.
     *
     * @param user the persisted user document
     * @return the public-facing DTO for {@code user}
     */
    public AuthResponse toAuthResponse(User user) {
        return new AuthResponse(user.getId(), user.getName(), user.getEmail());
    }

    /**
     * Normalizes an email to lowercase, the single point both
     * {@link #register} and {@link #login} funnel through before touching
     * {@code userRepository}. Without this, {@code Aurko@example.com} and
     * {@code aurko@example.com} register as two distinct accounts (the
     * unique index on {@code User.email} is case-sensitive) and a user who
     * registered with one capitalization can't log back in with another.
     * Centralizing the lowercasing here — rather than scattering
     * {@code .toLowerCase()} calls at each repository call site — means
     * every current and future lookup/save automatically stays consistent.
     *
     * @param email the raw, as-typed email from the request
     * @return the same address, lowercased
     */
    private String normalizeEmail(String email) {
        return email.toLowerCase();
    }

    /** Carries both the raw JWT (for the cookie) and the public user DTO (for the JSON body) back to the controller. */
    public record AuthResult(String token, AuthResponse user) {
    }
}
