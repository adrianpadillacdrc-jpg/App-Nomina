package com.nomina.numa.service;

import lombok.RequiredArgsConstructor;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

import com.nomina.numa.model.postgres.Usuario;
import com.nomina.numa.repository.jpa.UsuarioRepository;

import java.util.Collections;

@Service
@RequiredArgsConstructor
public class UserDetailsServiceImpl implements UserDetailsService {

    private final UsuarioRepository usuarioRepository;

    @Override
    public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
        Usuario usuario = usuarioRepository.findByCorreo(username)
                .orElseThrow(() -> new UsernameNotFoundException("Usuario no encontrado"));

        String role = usuario.getRol();
        if (role == null || role.isBlank()) {
            throw new UsernameNotFoundException("El usuario no tiene un rol configurado");
        }
        if (!role.startsWith("ROLE_")) {
            role = "ROLE_" + role;
        }

        return User.builder()
                .username(usuario.getCorreo())
                .password(usuario.getContrasena())
                .authorities(Collections.singletonList(new SimpleGrantedAuthority(role)))
                .disabled(!Boolean.TRUE.equals(usuario.getActivo()))
                .build();
    }
}
