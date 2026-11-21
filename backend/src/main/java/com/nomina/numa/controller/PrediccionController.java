package com.nomina.numa.controller;

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

    @GetMapping("/weka-prediccion")
    public Map<String, Object> predecirConWeka() {
        System.out.println("📊 Solicitando predicción con Weka");
        return service.getPrediccionConWeka();
    }

}