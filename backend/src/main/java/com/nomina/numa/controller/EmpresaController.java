package com.nomina.numa.controller;

import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.nomina.numa.model.postgres.Empresa;
import com.nomina.numa.service.EmpresaService;

import io.swagger.v3.oas.annotations.parameters.RequestBody;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/empresas")
@CrossOrigin(origins = "http://localhost:4200")
@RequiredArgsConstructor
public class EmpresaController {
    private final EmpresaService service;

    @GetMapping
    public List<Empresa> getAll() { return service.findAll(); }

    @GetMapping("/{id}")
    public ResponseEntity<Empresa> getById(@PathVariable Long id) {
        return service.findById(id).map(ResponseEntity::ok).orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public Empresa create(@RequestBody Empresa e) { return service.save(e); }

    @PutMapping("/{id}")
    public Empresa update(@PathVariable Long id, @RequestBody Empresa e) {
        e.setId(id);
        return service.save(e);
    }
}