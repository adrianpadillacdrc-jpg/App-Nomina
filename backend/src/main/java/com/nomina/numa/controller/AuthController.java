package com.nomina.numa.controller;

import com.nomina.numa.security.JwtUtil;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final JwtUtil jwtUtil;

    public AuthController(JwtUtil jwtUtil) {
        this.jwtUtil = jwtUtil;
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest request) {
        // Hardcodeado - asegúrate de que coincida con lo que envías desde frontend
        if ("admin".equals(request.getUsername()) && "numa2025".equals(request.getPassword())) {
            String token = jwtUtil.generateToken("admin", "ADMIN");
            return ResponseEntity.ok(new LoginResponse(token));
        } else if ("empleado".equals(request.getUsername()) && "empleado123".equals(request.getPassword())) {
            String token = jwtUtil.generateToken("empleado", "EMPLEADO");
            return ResponseEntity.ok(new LoginResponse(token));
        }

        return ResponseEntity.status(401).body("Credenciales inválidas");
    }
}

// DTOs
class LoginRequest {
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

class LoginResponse {
    private String token;

    public LoginResponse(String token) {
        this.token = token;
    }

    public String getToken() {
        return token;
    }
}