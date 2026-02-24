package com.nomina.numa.controller;

import java.util.List;

import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.nomina.numa.model.mongo.TipoContrato;
import com.nomina.numa.service.TipoContratoService;

import io.swagger.v3.oas.annotations.parameters.RequestBody;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/tipos-contrato")
@CrossOrigin(origins = "http://localhost:4200")
@RequiredArgsConstructor
public class TipoContratoController {
    private final TipoContratoService service;

    @GetMapping
    public List<TipoContrato> getAll() { return service.findAll(); }

    @PostMapping
    public TipoContrato create(@RequestBody TipoContrato t) { return service.save(t); }
}
