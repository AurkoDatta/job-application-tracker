package com.jobtracker.security;

import java.io.IOException;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

/**
 * Authenticates each request by reading the JWT from the {@code token}
 * httpOnly cookie, rather than an {@code Authorization} header.
 *
 * <p>The token is delivered as an httpOnly cookie (set by
 * {@code AuthController} on login/register) specifically so it is never
 * reachable from client-side JavaScript, which mitigates XSS-based token
 * theft compared to storing it in localStorage and sending it via an
 * Authorization header.</p>
 */
@Component
public class JwtAuthFilter extends OncePerRequestFilter {

    private static final String COOKIE_NAME = "token";
    private static final Logger log = LoggerFactory.getLogger(JwtAuthFilter.class);

    private final JwtUtil jwtUtil;
    private final CustomUserDetailsService userDetailsService;

    public JwtAuthFilter(JwtUtil jwtUtil, CustomUserDetailsService userDetailsService) {
        this.jwtUtil = jwtUtil;
        this.userDetailsService = userDetailsService;
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain
    ) throws ServletException, IOException {
        String token = extractTokenFromCookies(request);

        // No cookie, or a malformed/expired token: leave the security
        // context unpopulated and continue the chain unauthenticated.
        // Spring Security's authorization rules (see SecurityConfig) then
        // reject access to protected endpoints normally — this filter
        // itself never throws for that case.
        if (token != null && jwtUtil.validate(token)) {
            try {
                String email = jwtUtil.extractEmail(token);
                UserDetails userDetails = userDetailsService.loadUserByUsername(email);

                UsernamePasswordAuthenticationToken authToken =
                        new UsernamePasswordAuthenticationToken(userDetails, null, userDetails.getAuthorities());
                authToken.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                SecurityContextHolder.getContext().setAuthentication(authToken);
            } catch (Exception ex) {
                // A well-signed, unexpired token can still fail to resolve
                // to a user (e.g. the account was deleted after the token
                // was issued) — loadUserByUsername throws
                // UsernameNotFoundException in that case. This filter runs
                // before DispatcherServlet, so GlobalExceptionHandler's
                // @RestControllerAdvice cannot catch it; left unhandled it
                // would surface as a raw 500 instead of the filter's
                // intended fail-closed behavior. Catching broadly (not just
                // UsernameNotFoundException) keeps that same fail-closed
                // guarantee against any other lookup failure too — treat it
                // exactly like a missing/invalid cookie: log and continue
                // unauthenticated, let SecurityConfig's authorization rules
                // reject protected endpoints normally.
                log.debug("Failed to resolve user for a validly-signed token; continuing unauthenticated", ex);
            }
        }

        filterChain.doFilter(request, response);
    }

    /** Scans the request's cookies for the one named "token"; returns null if absent. */
    private String extractTokenFromCookies(HttpServletRequest request) {
        Cookie[] cookies = request.getCookies();
        if (cookies == null) {
            return null;
        }
        for (Cookie cookie : cookies) {
            if (COOKIE_NAME.equals(cookie.getName())) {
                return cookie.getValue();
            }
        }
        return null;
    }
}
