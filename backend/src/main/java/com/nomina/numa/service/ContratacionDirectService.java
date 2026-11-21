package com.nomina.numa.service;

import com.nomina.numa.model.postgres.Contratacion;
import com.nomina.numa.repository.jpa.ContratacionRepository;
import org.springframework.stereotype.Service;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import java.util.ArrayList;
import java.util.List;

/**
 * Servicio de diagnóstico de contrataciones; tras la migración a PostgreSQL
 * consulta la tabla contratacion vía JPA.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ContratacionDirectService {

    private final ContratacionRepository contratacionRepository;

    public List<Contratacion> findAllAsDocuments() {
        log.info("=== ContratacionDirectService.findAllAsDocuments ===");
        try {
            List<Contratacion> contratos = contratacionRepository.findAll();
            log.info("Contrataciones recuperadas: {}", contratos.size());
            if (!contratos.isEmpty()) {
                log.info("Primera contratacion: {}", contratos.get(0).getId());
            }
            return contratos;
        } catch (Exception e) {
            log.error("Error al obtener contrataciones: {}", e.getMessage(), e);
            return new ArrayList<>();
        }
    }

    public long count() {
        try {
            long count = contratacionRepository.count();
            log.info("Count contratacion: {}", count);
            return count;
        } catch (Exception e) {
            log.error("Error al contar: {}", e.getMessage());
            return 0;
        }
    }
}
