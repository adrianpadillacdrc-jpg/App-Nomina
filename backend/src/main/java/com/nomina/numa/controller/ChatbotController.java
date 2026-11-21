package com.nomina.numa.controller;

import com.nomina.numa.dto.ChatRequest;
import com.nomina.numa.dto.ChatResponse;
import com.nomina.numa.security.JwtUtil;
import com.nomina.numa.service.ChatbotService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class ChatbotController {
    private static final String PORTAL_EMPLOYEE_ROLE = "ROLE_PORTAL_EMPLOYEE";
    private static final String PORTAL_EMPLOYEE_SUBJECT = "portal-employee:";

    private final ChatbotService chatbotService;
    private final JwtUtil jwtUtil;

    @PostMapping("/chat/admin")
    @PreAuthorize("hasRole('ADMIN')")
    public ChatResponse chatAdministrador(
            @Valid @RequestBody ChatRequest request,
            Authentication authentication) {
        return new ChatResponse(chatbotService.responderAdministrador(authentication.getName(), request));
    }

    @PostMapping("/portal/chat")
    public ChatResponse chatEmpleado(
            @RequestHeader(name = "Authorization", required = false) String authorization,
            @Valid @RequestBody ChatRequest request) {
        Long empleadoId = obtenerEmpleadoAutenticado(authorization);
        return new ChatResponse(chatbotService.responderEmpleado(empleadoId, request));
    }

    private Long obtenerEmpleadoAutenticado(String authorization) {
        if (authorization == null || !authorization.startsWith("Bearer ")) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Se requiere iniciar sesión en el portal.");
        }

        try {
            String token = authorization.substring("Bearer ".length());
            if (!PORTAL_EMPLOYEE_ROLE.equals(jwtUtil.extractRole(token)) || jwtUtil.isTokenExpired(token)) {
                throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "La sesión del portal expiró.");
            }

            String subject = jwtUtil.extractUsername(token);
            if (subject == null || !subject.startsWith(PORTAL_EMPLOYEE_SUBJECT)) {
                throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "La sesión del portal no es válida.");
            }
            return Long.parseLong(subject.substring(PORTAL_EMPLOYEE_SUBJECT.length()));
        } catch (ResponseStatusException exception) {
            throw exception;
        } catch (RuntimeException exception) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "La sesión del portal no es válida.");
        }
    }
}
