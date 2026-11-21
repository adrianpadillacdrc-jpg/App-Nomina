package com.nomina.numa.service;

import com.nomina.numa.model.postgres.Novedad;
import com.nomina.numa.repository.jpa.NovedadRepository;
import org.springframework.stereotype.Service;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import java.util.ArrayList;
import java.util.List;

/**
 * Servicio de diagnóstico de novedades; tras la migración a PostgreSQL
 * consulta la tabla novedades vía JPA.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class NovedadDirectService {

    private final NovedadRepository novedadRepository;

    public List<Novedad> findAllAsDocuments() {
        log.info("=== NovedadDirectService.findAllAsDocuments ===");
        try {
            List<Novedad> novedades = novedadRepository.findAll();
            log.info("Novedades recuperadas: {}", novedades.size());
            if (!novedades.isEmpty()) {
                log.info("Primera novedad: {}", novedades.get(0).getId());
            }
            return novedades;
        } catch (Exception e) {
            log.error("Error al obtener novedades: {}", e.getMessage(), e);
            return new ArrayList<>();
        }
    }

    public long count() {
        try {
            long count = novedadRepository.count();
            log.info("Count novedades: {}", count);
            return count;
        } catch (Exception e) {
            log.error("Error al contar: {}", e.getMessage());
            return 0;
        }
    }
}
