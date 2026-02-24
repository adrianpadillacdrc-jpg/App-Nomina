package com.nomina.numa.controller;

import java.util.List;

import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.nomina.numa.model.mongo.Rol;
import com.nomina.numa.service.RolService;

import io.swagger.v3.oas.annotations.parameters.RequestBody;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/roles")
@CrossOrigin(origins = "http://localhost:4200")
@RequiredArgsConstructor
public class RolController {
    private final RolService service;

    @GetMapping
    public List<Rol> getAll() { return service.findAll(); }

    @PostMapping
    public Rol create(@RequestBody Rol r) { return service.save(r); }
}