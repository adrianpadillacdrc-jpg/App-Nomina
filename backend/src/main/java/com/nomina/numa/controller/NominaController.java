package com.nomina.numa.controller;

import com.nomina.numa.service.NominaService;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/nomina")
@CrossOrigin(origins = "http://localhost:4200")
@RequiredArgsConstructor
public class NominaController {
    private final NominaService nominaService;

    @PostMapping("/liquidar")
    public ResponseEntity<String> liquidar() {
        String resultado = nominaService.liquidarNomina(null);
        return ResponseEntity.ok(resultado);
    }

    @GetMapping("/estado")
    public ResponseEntity<String> estado() {
        return ResponseEntity.ok("NÓMINA API 100% OPERATIVA - NUMA STORE 2025");
    }
}