package com.nomina.numa.controller;

import java.util.List;

import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.nomina.numa.model.postgres.Cargo;
import com.nomina.numa.service.CargoService;

import io.swagger.v3.oas.annotations.parameters.RequestBody;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/cargos")
@CrossOrigin(origins = "http://localhost:4200")
@RequiredArgsConstructor
public class CargoController {
    private final CargoService service;

    @GetMapping
    public List<Cargo> getAll() { return service.findAll(); }

    @PostMapping
    public Cargo create(@RequestBody Cargo c) { return service.save(c); }

    @PutMapping("/{id}")
    public Cargo update(@PathVariable Long id, @RequestBody Cargo c) {
        c.setId(id);
        return service.save(c);
    }
}