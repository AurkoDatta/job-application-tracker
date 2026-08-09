package com.jobtracker.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.Instant;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.dao.DuplicateKeyException;

import com.jobtracker.dto.auth.AuthResponse;
import com.jobtracker.dto.auth.LoginRequest;
import com.jobtracker.dto.auth.RegisterRequest;
import com.jobtracker.exception.DuplicateEmailException;
import com.jobtracker.exception.InvalidCredentialsException;
import com.jobtracker.model.User;
import com.jobtracker.repository.UserRepository;
import com.jobtracker.security.JwtUtil;
import org.springframework.security.crypto.password.PasswordEncoder;

/**
 * Unit tests for {@link AuthService}, covering registration (including the
 * Task 2 duplicate-email translation) and login (including the
 * deliberately-indistinguishable unknown-email/wrong-password paths).
 */
@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private JwtUtil jwtUtil;

    @Mock
    private ColumnService columnService;

    private AuthService authService;

    private RegisterRequest registerRequest;

    @BeforeEach
    void setUp() {
        authService = new AuthService(userRepository, passwordEncoder, jwtUtil, columnService);
        registerRequest = new RegisterRequest("Jane Doe", "jane@example.com", "password123");
    }

    @Test
    void register_success_encodesPasswordSeedsColumnsAndReturnsResultWithoutSecrets() {
        when(userRepository.findByEmail("jane@example.com")).thenReturn(Optional.empty());
        when(passwordEncoder.encode("password123")).thenReturn("hashed-password");

        User saved = User.builder()
                .id("user-1")
                .name("Jane Doe")
                .email("jane@example.com")
                .passwordHash("hashed-password")
                .createdAt(Instant.now())
                .build();
        when(userRepository.save(any(User.class))).thenReturn(saved);
        when(jwtUtil.generate("jane@example.com")).thenReturn("signed-jwt-token");

        AuthService.AuthResult result = authService.register(registerRequest);

        // Verify the raw password was never persisted directly: save() must
        // have been called with the encoded hash, not the plaintext.
        ArgumentCaptor<User> userCaptor = ArgumentCaptor.forClass(User.class);
        verify(userRepository).save(userCaptor.capture());
        assertThat(userCaptor.getValue().getPasswordHash()).isEqualTo("hashed-password");
        verify(passwordEncoder).encode("password123");

        verify(columnService).seedDefaultColumns("user-1");

        assertThat(result.token()).isEqualTo("signed-jwt-token");
        AuthResponse response = result.user();
        assertThat(response.id()).isEqualTo("user-1");
        assertThat(response.name()).isEqualTo("Jane Doe");
        assertThat(response.email()).isEqualTo("jane@example.com");
        // AuthResponse is a fixed 3-field record (id/name/email) so there is
        // no password/JWT field it could leak through even by accident;
        // asserting the fields above already proves the shape.
    }

    @Test
    void register_emailAlreadyExists_throwsDuplicateEmailException() {
        when(userRepository.findByEmail("jane@example.com"))
                .thenReturn(Optional.of(User.builder().id("existing-user").build()));

        assertThatThrownBy(() -> authService.register(registerRequest))
                .isInstanceOf(DuplicateEmailException.class);

        verify(userRepository, never()).save(any(User.class));
        verify(columnService, never()).seedDefaultColumns(anyString());
    }

    /**
     * Regression test for the Task 2 code-review fix: the application-level
     * findByEmail check is racy under concurrent registrations for the same
     * email, so the unique index on User.email is the real guard. A
     * DuplicateKeyException surfacing from save() must be translated into
     * the same DuplicateEmailException the pre-check produces, not left to
     * bubble up as an unhandled 500.
     */
    @Test
    void register_duplicateKeyOnSave_throwsDuplicateEmailException() {
        when(userRepository.findByEmail("jane@example.com")).thenReturn(Optional.empty());
        when(passwordEncoder.encode("password123")).thenReturn("hashed-password");
        when(userRepository.save(any(User.class))).thenThrow(new DuplicateKeyException("E11000 duplicate key"));

        assertThatThrownBy(() -> authService.register(registerRequest))
                .isInstanceOf(DuplicateEmailException.class);

        verify(columnService, never()).seedDefaultColumns(anyString());
    }

    @Test
    void login_success_returnsValidResult() {
        User user = User.builder()
                .id("user-1")
                .name("Jane Doe")
                .email("jane@example.com")
                .passwordHash("hashed-password")
                .build();
        LoginRequest loginRequest = new LoginRequest("jane@example.com", "password123");
        when(userRepository.findByEmail("jane@example.com")).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("password123", "hashed-password")).thenReturn(true);
        when(jwtUtil.generate("jane@example.com")).thenReturn("signed-jwt-token");

        AuthService.AuthResult result = authService.login(loginRequest);

        assertThat(result.token()).isEqualTo("signed-jwt-token");
        assertThat(result.user().id()).isEqualTo("user-1");
        assertThat(result.user().email()).isEqualTo("jane@example.com");
    }

    @Test
    void login_wrongPassword_throwsInvalidCredentialsException() {
        User user = User.builder()
                .id("user-1")
                .email("jane@example.com")
                .passwordHash("hashed-password")
                .build();
        LoginRequest loginRequest = new LoginRequest("jane@example.com", "wrong-password");
        when(userRepository.findByEmail("jane@example.com")).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("wrong-password", "hashed-password")).thenReturn(false);

        assertThatThrownBy(() -> authService.login(loginRequest))
                .isInstanceOf(InvalidCredentialsException.class)
                .hasMessage("Invalid email or password");
    }

    /**
     * Deliberately asserts the exact same exception type AND message as the
     * wrong-password case above — this is the Task 2 security decision that
     * an unknown email must not be distinguishable from a known email with
     * a wrong password, so nothing here should differ from
     * login_wrongPassword_throwsInvalidCredentialsException's assertions.
     */
    @Test
    void login_unknownEmail_throwsInvalidCredentialsExceptionIndistinguishableFromWrongPassword() {
        LoginRequest loginRequest = new LoginRequest("nobody@example.com", "password123");
        when(userRepository.findByEmail("nobody@example.com")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> authService.login(loginRequest))
                .isInstanceOf(InvalidCredentialsException.class)
                .hasMessage("Invalid email or password");

        verify(passwordEncoder, never()).matches(anyString(), anyString());
    }

    @Test
    void toAuthResponse_mapsFieldsAndExcludesPasswordAndToken() {
        User user = User.builder()
                .id("user-1")
                .name("Jane Doe")
                .email("jane@example.com")
                .passwordHash("hashed-password")
                .createdAt(Instant.now())
                .build();

        AuthResponse response = authService.toAuthResponse(user);

        assertThat(response.id()).isEqualTo("user-1");
        assertThat(response.name()).isEqualTo("Jane Doe");
        assertThat(response.email()).isEqualTo("jane@example.com");
        // AuthResponse is declared with exactly (id, name, email) — there is
        // no passwordHash/token component to leak; the record's fixed shape
        // is itself the guarantee, reinforced by the field assertions above.
    }
}
