package com.nomina.numa.config;

import com.nomina.numa.security.JwtAuthenticationFilter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import java.util.List;

@Configuration
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtAuthenticationFilter;

    public SecurityConfig(JwtAuthenticationFilter jwtAuthenticationFilter) {
        this.jwtAuthenticationFilter = jwtAuthenticationFilter;
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
                // Deshabilitamos CSRF completamente (necesario para POST sin token)
                .csrf(csrf -> csrf.disable())

                // CORS primero (tu configuración original mejorada)
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))

                // Autorización de rutas - más explícita
                .authorizeHttpRequests(auth -> auth
                        // Permitir TODOS los métodos en /api/auth/**
                        .requestMatchers("/api/auth/**").permitAll()
                        // Swagger y docs abiertos
                        .requestMatchers("/swagger-ui/**", "/v3/api-docs/**", "/swagger-resources/**", "/webjars/**")
                        .permitAll()
                        // Rutas ADMIN
                        .requestMatchers("/api/admin/**", "/api/empleados/**", "/api/liquidar/**", "/api/registro/**")
                        .hasRole("ADMIN")
                        // Rutas EMPLEADO
                        .requestMatchers("/api/consulta-empleado/**").hasRole("EMPLEADO")
                        // Todo lo demás requiere autenticación
                        .anyRequest().authenticated())

                // Sesión stateless (obligatorio para JWT)
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))

                // Filtro JWT
                .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    // Método separado para CORS (más claro y permite OPTIONS preflight)
    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        configuration.setAllowedOrigins(List.of("http://localhost:4200"));
        configuration.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS"));
        configuration.setAllowedHeaders(List.of("*"));
        configuration.setAllowCredentials(true);
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }
}