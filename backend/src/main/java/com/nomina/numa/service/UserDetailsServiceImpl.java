package com.nomina.numa.service;

import org.springframework.beans.factory.annotation.Autowired;
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
public class UserDetailsServiceImpl implements UserDetailsService {

    @Autowired
    private UsuarioRepository usuarioRepository;

    @Override
    public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
        System.err.println("=== UserDetailsServiceImpl: Buscando usuario: " + username);
        
        Usuario usuario = usuarioRepository.findByCorreo(username)
                .orElseThrow(() -> {
                    System.err.println("Usuario no encontrado: " + username);
                    return new UsernameNotFoundException("Usuario no encontrado: " + username);
                });

        System.err.println("Usuario encontrado: " + usuario.getCorreo());
        System.err.println("Rol en BD: " + usuario.getRol());
        System.err.println("Activo: " + usuario.getActivo());

        String role = usuario.getRol();
        // Asegurar que el rol tenga el prefijo ROLE_
        if (role != null && !role.startsWith("ROLE_")) {
            role = "ROLE_" + role;
        }

        System.err.println("Rol para Spring Security: " + role);

        return User.builder()
                .username(usuario.getCorreo())
                .password(usuario.getContrasena())
                .authorities(Collections.singletonList(new SimpleGrantedAuthority(role)))
                .build();
    }
}
