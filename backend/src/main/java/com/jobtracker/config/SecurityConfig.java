package com.jobtracker.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfigurationSource;

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

    public SecurityConfig(
            JwtAuthFilter jwtAuthFilter,
            UserDetailsService userDetailsService,
            CorsConfigurationSource corsConfigurationSource
    ) {
        this.jwtAuthFilter = jwtAuthFilter;
        this.userDetailsService = userDetailsService;
        this.corsConfigurationSource = corsConfigurationSource;
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
