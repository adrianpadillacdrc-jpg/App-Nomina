package com.nomina.numa.controller;

import com.nomina.numa.model.postgres.Usuario;
import com.nomina.numa.repository.jpa.UsuarioRepository;
import com.nomina.numa.security.JwtUtil;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import lombok.RequiredArgsConstructor;
import java.util.Optional;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final JwtUtil jwtUtil;
    private final UsuarioRepository usuarioRepository;
    private final PasswordEncoder passwordEncoder;

    // ====================== LOGIN ======================
    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest request) {
        Optional<Usuario> opt = usuarioRepository.findByNombre(request.getUsername());

        if (opt.isPresent() && passwordEncoder.matches(request.getPassword(), opt.get().getContrasena())) {
            Usuario user = opt.get();
            String token = jwtUtil.generateToken(user.getNombre(), user.getRol());
            return ResponseEntity.ok(new LoginResponse(token));
        }

        return ResponseEntity.status(401).body("Credenciales inválidas");
    }

    // ====================== REGISTRO NUEVO ======================
    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody RegisterRequest request) {

        // Validaciones
        if (request.getNombre() == null || request.getNombre().trim().isEmpty()) {
            return ResponseEntity.badRequest().body("El nombre de usuario es obligatorio");
        }
        if (request.getCorreo() == null || request.getCorreo().trim().isEmpty()) {
            return ResponseEntity.badRequest().body("El correo es obligatorio");
        }
        if (request.getContrasena() == null || request.getContrasena().length() < 6) {
            return ResponseEntity.badRequest().body("La contraseña debe tener mínimo 6 caracteres");
        }
        if (!"ADMIN".equalsIgnoreCase(request.getRol()) && !"EMPLEADO".equalsIgnoreCase(request.getRol())) {
            return ResponseEntity.badRequest().body("Rol inválido. Solo ADMIN o EMPLEADO");
        }

        // Verificar duplicados
        if (usuarioRepository.findByNombre(request.getNombre().trim()).isPresent()) {
            return ResponseEntity.badRequest().body("El nombre de usuario ya existe");
        }
        if (usuarioRepository.findByCorreo(request.getCorreo().trim()).isPresent()) {
            return ResponseEntity.badRequest().body("El correo ya está registrado");
        }

        // Crear usuario
        Usuario nuevo = new Usuario();
        nuevo.setNombre(request.getNombre().trim());
        nuevo.setCorreo(request.getCorreo().trim());
        nuevo.setContrasena(passwordEncoder.encode(request.getContrasena()));
        nuevo.setRol(request.getRol().toUpperCase());
        nuevo.setActivo(true);

        usuarioRepository.save(nuevo);

        return ResponseEntity.ok("Usuario registrado correctamente. Ahora puedes iniciar sesión.");
    }

    // ====================== DTOs ======================
    static class LoginRequest {
        private String username;
        private String password;

        public String getUsername() {
            return username;
        }

        public void setUsername(String username) {
            this.username = username;
        }

        public String getPassword() {
            return password;
        }

        public void setPassword(String password) {
            this.password = password;
        }
    }

    static class LoginResponse {
        private String token;

        public LoginResponse(String token) {
            this.token = token;
        }

        public String getToken() {
            return token;
        }
    }

    static class RegisterRequest {
        private String nombre;
        private String correo;
        private String contrasena;
        private String rol;

        public String getNombre() {
            return nombre;
        }

        public void setNombre(String nombre) {
            this.nombre = nombre;
        }

        public String getCorreo() {
            return correo;
        }

        public void setCorreo(String correo) {
            this.correo = correo;
        }

        public String getContrasena() {
            return contrasena;
        }

        public void setContrasena(String contrasena) {
            this.contrasena = contrasena;
        }

        public String getRol() {
            return rol;
        }

        public void setRol(String rol) {
            this.rol = rol;
        }
    }
}