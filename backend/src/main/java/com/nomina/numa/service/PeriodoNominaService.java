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
public class PeriodoNominaService {
    private final PeriodoNominaRepository repo;

    public PeriodoNomina getActual() {
        List<PeriodoNomina> periodos = repo.findAll();

        return periodos.stream()
                .filter(p -> p != null && EstadoNominaCompat.esPeriodoAbierto(p.getEstado()))
                .sorted(Comparator.comparing(
                        PeriodoNomina::getFechaInicio,
                        Comparator.nullsLast(Comparator.naturalOrder())
                ).reversed())
                .findFirst()
                .orElseThrow(() -> new RuntimeException("No hay período abierto"));
    }
}