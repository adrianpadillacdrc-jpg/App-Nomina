package com.nomina.numa.controller;

import java.util.List;

import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.nomina.numa.model.mongo.ConceptoNomina;
import com.nomina.numa.service.ConceptoNominaService;

import io.swagger.v3.oas.annotations.parameters.RequestBody;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/conceptos-nomina")
@CrossOrigin(origins = "http://localhost:4200")
@RequiredArgsConstructor
public class ConceptoNominaController {
    private final ConceptoNominaService service;

    @GetMapping
    public List<ConceptoNomina> getAll() { return service.findAll(); }

    @PostMapping
    public ConceptoNomina create(@RequestBody ConceptoNomina c) { return service.save(c); }
}
