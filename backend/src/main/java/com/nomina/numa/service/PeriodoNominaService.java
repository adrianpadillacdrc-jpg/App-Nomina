package com.nomina.numa.service;

import com.nomina.numa.model.mongo.PeriodoNomina;
import com.nomina.numa.repository.mongo.PeriodoNominaRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class PeriodoNominaService {
    private final PeriodoNominaRepository repo;

    public PeriodoNomina getActual() {
        return repo.findTopByEstadoOrderByFechaInicioDesc("ABIERTO")
                .orElseThrow(() -> new RuntimeException("No hay período abierto"));
    }
}