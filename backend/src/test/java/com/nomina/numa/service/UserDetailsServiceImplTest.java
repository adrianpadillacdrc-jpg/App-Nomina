package com.nomina.numa.service;

import com.nomina.numa.model.postgres.Usuario;
import com.nomina.numa.repository.jpa.UsuarioRepository;
import org.junit.jupiter.api.Test;
import org.springframework.security.core.userdetails.UserDetails;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class UserDetailsServiceImplTest {
    private final UsuarioRepository usuarioRepository = mock(UsuarioRepository.class);
    private final UserDetailsServiceImpl service = new UserDetailsServiceImpl(usuarioRepository);

    @Test
    void inactiveUsersCannotAuthenticate() {
        when(usuarioRepository.findByCorreo("user@example.test")).thenReturn(Optional.of(Usuario.builder()
                .correo("user@example.test")
                .contrasena("encoded-password")
                .rol("ADMIN")
                .activo(false)
                .build()));

        UserDetails user = service.loadUserByUsername("user@example.test");

        assertFalse(user.isEnabled());
        assertTrue(user.getAuthorities().stream()
                .anyMatch(authority -> authority.getAuthority().equals("ROLE_ADMIN")));
    }

    @Test
    void activeUsersReceiveSpringSecurityRolePrefix() {
        when(usuarioRepository.findByCorreo("user@example.test")).thenReturn(Optional.of(Usuario.builder()
                .correo("user@example.test")
                .contrasena("encoded-password")
                .rol("ADMIN")
                .activo(true)
                .build()));

        UserDetails user = service.loadUserByUsername("user@example.test");

        assertTrue(user.isEnabled());
        assertTrue(user.getAuthorities().stream()
                .anyMatch(authority -> authority.getAuthority().equals("ROLE_ADMIN")));
    }
}
