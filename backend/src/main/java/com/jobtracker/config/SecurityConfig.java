package com.jobtracker.config;

import java.util.Map;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfigurationSource;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.jobtracker.exception.ErrorResponseFactory;
import com.jobtracker.security.JwtAuthFilter;

/**
 * Wires up Spring Security for a stateless, cookie-delivered JWT API.
 *
 * <p>Sessions are disabled entirely ({@link SessionCreationPolicy#STATELESS})
 * since authentication state lives in the signed JWT, not server-side
 * session storage. CSRF protection is disabled because CSRF tokens defend
 * session-cookie-based form auth; a SameSite=Lax httpOnly JWT cookie
 * combined with no session state does not need it for this API's JSON
 * endpoints.</p>
 */
@Configuration
public class SecurityConfig {

    private final JwtAuthFilter jwtAuthFilter;
    private final UserDetailsService userDetailsService;
    private final CorsConfigurationSource corsConfigurationSource;
    private final ObjectMapper objectMapper;

    public SecurityConfig(
            JwtAuthFilter jwtAuthFilter,
            UserDetailsService userDetailsService,
            CorsConfigurationSource corsConfigurationSource,
            ObjectMapper objectMapper
    ) {
        this.jwtAuthFilter = jwtAuthFilter;
        this.userDetailsService = userDetailsService;
        this.corsConfigurationSource = corsConfigurationSource;
        this.objectMapper = objectMapper;
    }

    /**
     * Defines the HTTP security rules: public auth endpoints, everything
     * else under {@code /api/**} requires authentication, and the JWT
     * filter runs before the standard username/password filter so the
     * security context is populated from the cookie before Spring's own
     * auth machinery would otherwise look for form credentials.
     */
    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
                .cors(cors -> cors.configurationSource(corsConfigurationSource))
                .csrf(AbstractHttpConfigurer::disable)
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                // Without an explicit entry point, Spring Security falls back
                // to Http403ForbiddenEntryPoint for any unauthenticated
                // request to a protected endpoint — a bare 403 with Spring
                // Boot's generic {timestamp, status, error, path} body, not
                // this project's standard error shape. jsonAuthenticationEntryPoint()
                // below replaces that with a 401 (the semantically correct
                // code for "no valid credentials were presented") carrying
                // the same {message, status, timestamp} shape
                // GlobalExceptionHandler produces for everything that reaches
                // a controller — this request never does, since the security
                // filter chain rejects it first.
                .exceptionHandling(exceptions -> exceptions.authenticationEntryPoint(jsonAuthenticationEntryPoint()))
                .authorizeHttpRequests(auth -> auth
                        // More specific matcher must precede the broader
                        // "/api/auth/**" permitAll() below — Spring Security
                        // evaluates authorizeHttpRequests rules in
                        // declaration order and uses the first match, so
                        // "/api/auth/me" would silently inherit permitAll()
                        // (defeating the point of the endpoint) if it were
                        // declared after the wildcard instead of before it.
                        .requestMatchers("/api/auth/me").authenticated()
                        .requestMatchers("/api/auth/**").permitAll()
                        .requestMatchers("/api/**").authenticated()
                        .anyRequest().permitAll()
                )
                .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    /**
     * Writes this project's standard {@code {message, status, timestamp}}
     * JSON error body (via {@link ErrorResponseFactory}, the same builder
     * {@code GlobalExceptionHandler} uses) with a 401 status, for any
     * request that reaches a protected endpoint without valid credentials.
     * This runs inside the security filter chain — before
     * {@code DispatcherServlet} and therefore before
     * {@code GlobalExceptionHandler}'s {@code @RestControllerAdvice} could
     * ever see the request — so the body has to be written directly to the
     * response here rather than by throwing something the advice could
     * catch.
     */
    @Bean
    public AuthenticationEntryPoint jsonAuthenticationEntryPoint() {
        return (request, response, authException) -> {
            response.setStatus(HttpStatus.UNAUTHORIZED.value());
            response.setContentType(MediaType.APPLICATION_JSON_VALUE);
            Map<String, Object> body = ErrorResponseFactory.build(
                    HttpStatus.UNAUTHORIZED, "Authentication required"
            );
            objectMapper.writeValue(response.getWriter(), body);
        };
    }

    /** BCrypt is the standard, adaptive-cost hashing algorithm for password storage. */
    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    /**
     * Exposes an {@link AuthenticationManager} backed by our
     * {@link UserDetailsService} and {@link PasswordEncoder}, for
     * {@code AuthService} to verify login credentials against.
     */
    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration config) throws Exception {
        return config.getAuthenticationManager();
    }

    /** Wires the DAO-based provider so the AuthenticationManager above knows how to look up and check users. */
    @Bean
    public DaoAuthenticationProvider authenticationProvider(PasswordEncoder passwordEncoder) {
        DaoAuthenticationProvider provider = new DaoAuthenticationProvider();
        provider.setUserDetailsService(userDetailsService);
        provider.setPasswordEncoder(passwordEncoder);
        return provider;
    }
}
