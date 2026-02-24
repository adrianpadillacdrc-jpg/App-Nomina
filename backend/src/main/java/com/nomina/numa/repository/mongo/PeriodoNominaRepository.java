package com.nomina.numa.repository.mongo;

import com.nomina.numa.model.mongo.PeriodoNomina;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;
import java.util.Optional;

public interface PeriodoNominaRepository extends MongoRepository<PeriodoNomina, String> {
    Optional<PeriodoNomina> findTopByEstadoOrderByFechaInicioDesc(String estado);
    List<PeriodoNomina> findAllByOrderByFechaInicioDesc();
}