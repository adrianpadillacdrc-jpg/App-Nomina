package com.nomina.numa.service;

import com.nomina.numa.model.mongo.PeriodoNomina;
import com.nomina.numa.repository.mongo.PeriodoNominaRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class NominaService {
    private final PeriodoNominaRepository periodoRepo;

    public PeriodoNomina getPeriodoActual() {
        return periodoRepo.findTopByEstadoOrderByFechaInicioDesc("ABIERTO")
                .orElseThrow(() -> new RuntimeException("No hay período abierto"));
    }

    public String liquidarNomina(String periodoId) {
        return "Nómina liquidada para período: " + periodoId;
    }
}