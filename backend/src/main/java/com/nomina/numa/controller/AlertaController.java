package com.nomina.numa.controller;

import com.nomina.numa.service.AlertaService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/alertas")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class AlertaController {

    private final AlertaService alertaService;

    @GetMapping
    public ResponseEntity<Map<String, Object>> getAlertas() {
        return ResponseEntity.ok(alertaService.getAlertas());
    }
}
