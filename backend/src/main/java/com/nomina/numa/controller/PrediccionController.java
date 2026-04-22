package com.nomina.numa.controller;

import com.nomina.numa.dto.PrediccionDTO;
import com.nomina.numa.service.PrediccionNominaService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import java.util.*;

@RestController
@RequestMapping("/api/prediccion")
@CrossOrigin(origins = { "http://localhost:4200",
        "http://localhost:8080" }, allowedHeaders = "*", allowCredentials = "true")
@RequiredArgsConstructor
public class PrediccionController {

    private final PrediccionNominaService service;

    @GetMapping("/quincenas-2026")
    public Map<String, Object> predecirQuincenas2026() {
        Map<String, Object> response = service.getPrediccionDetallada();
        System.out.println("📤 Enviando predicción al frontend");
        return response;
    }

    @GetMapping("/weka-prediccion")
    public Map<String, Object> predecirConWeka() {
        System.out.println("📊 Solicitando predicción con Weka");
        return service.getPrediccionConWeka();
    }

    @GetMapping("/nomina/{anioInicio}/{anioFin}")
    public PrediccionDTO predecirNomina(@PathVariable int anioInicio, @PathVariable int anioFin) {
        return service.predecir(anioInicio, anioFin);
    }
}