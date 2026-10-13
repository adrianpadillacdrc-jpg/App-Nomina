package com.nomina.numa.service;

import com.nomina.numa.model.mongo.PeriodoNomina;
import com.nomina.numa.repository.mongo.PeriodoNominaRepository;
import com.nomina.numa.util.EstadoNominaCompat;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.Comparator;
import java.util.List;

@Service
@RequiredArgsConstructor
public class NominaService {
    private final PeriodoNominaRepository periodoRepo;

    public PeriodoNomina getPeriodoActual() {
        List<PeriodoNomina> periodos = periodoRepo.findAll();

        return periodos.stream()
                .filter(p -> p != null && EstadoNominaCompat.esPeriodoAbierto(p.getEstado()))
                .sorted(Comparator.comparing(
                        PeriodoNomina::getFechaInicio,
                        Comparator.nullsLast(Comparator.naturalOrder())
                ).reversed())
                .findFirst()
                .orElseThrow(() -> new RuntimeException("No hay período abierto"));
    }

    public String liquidarNomina(String periodoId) {
        return "Nómina liquidada para período: " + periodoId;
    }
}