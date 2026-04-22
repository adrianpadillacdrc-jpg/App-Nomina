package com.nomina.numa.controller;

import com.nomina.numa.dto.LoginRequest;
import com.nomina.numa.dto.LoginResponse;
import com.nomina.numa.dto.RegisterRequest;
import com.nomina.numa.model.postgres.Usuario;
import com.nomina.numa.repository.jpa.UsuarioRepository;
import com.nomina.numa.security.JwtService;

import java.util.HashMap;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    @Autowired
    private AuthenticationManager authenticationManager;

    @Autowired
    private JwtService jwtService;

    @Autowired
    private UserDetailsService userDetailsService;

    @Autowired
    private UsuarioRepository usuarioRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest request) {
        try {
            System.err.println("========== LOGIN INICIADO ==========");
            System.err.println("Username recibido: " + request.getUsername());
            
            Authentication authentication = authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(
                            request.getUsername(),
                            request.getPassword()));

            UserDetails userDetails = userDetailsService.loadUserByUsername(request.getUsername());
            System.err.println("UserDetails cargado: " + userDetails.getUsername());

            Usuario usuario = usuarioRepository.findByCorreo(request.getUsername())
                    .orElseThrow(() -> new RuntimeException("Usuario no encontrado"));
            
            System.err.println("Usuario encontrado en BD:");
            System.err.println("  - Nombre: " + usuario.getNombre());
            System.err.println("  - Correo: " + usuario.getCorreo());
            System.err.println("  - Rol: " + usuario.getRol());

            String userRole = usuario.getRol();
            
            // Asegurar que el rol tenga el formato correcto
            if (userRole == null || userRole.isEmpty()) {
                userRole = "ROLE_USER";
                System.err.println("Rol era nulo, asignando ROLE_USER");
            } else if (!userRole.startsWith("ROLE_")) {
                userRole = "ROLE_" + userRole;
                System.err.println("Rol sin prefijo, agregando: " + userRole);
            }
            
            System.err.println("Rol final para token: '" + userRole + "'");
            
            String token = jwtService.generateToken(userDetails.getUsername(), userRole);
            System.err.println("Token generado. Longitud: " + token.length());
            
            LoginResponse response = new LoginResponse(
                    token,
                    usuario.getNombre(),
                    usuario.getCorreo(),
                    userRole
            );
            
            System.err.println("========== LOGIN EXITOSO ==========");
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            System.err.println("ERROR EN LOGIN: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(401).body("Credenciales invalidas: " + e.getMessage());
        }
    }

    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody RegisterRequest request) {
        if (usuarioRepository.existsByCorreo(request.getCorreo())) {
            return ResponseEntity.badRequest().body("El correo ya esta registrado");
        }

        Usuario usuario = new Usuario();
        usuario.setNombre(request.getNombre());
        usuario.setCorreo(request.getCorreo());
        usuario.setContrasena(passwordEncoder.encode(request.getPassword()));
        usuario.setRol("ROLE_USER");
        usuario.setActivo(true);

        usuarioRepository.save(usuario);

        return ResponseEntity.ok("Usuario registrado exitosamente");
    }

    @GetMapping("/test")
    public ResponseEntity<String> test() {
        return ResponseEntity.ok("Backend funcionando correctamente");
    }

    @GetMapping("/ping")
    public ResponseEntity<String> ping() {
        return ResponseEntity.ok("pong");
    }

    @GetMapping("/health")
    public ResponseEntity<Map<String, Object>> health() {
        Map<String, Object> response = new HashMap<>();
        response.put("status", "UP");
        response.put("service", "Nomina API");
        response.put("timestamp", System.currentTimeMillis());
        return ResponseEntity.ok(response);
    }
}
