package com.nomina.numa.repository.mongo;

import com.nomina.numa.model.mongo.PeriodoNomina;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;

import java.util.List;
import java.util.Optional;

public interface PeriodoNominaRepository extends MongoRepository<PeriodoNomina, String> {
    
    Optional<PeriodoNomina> findTopByEstadoOrderByFechaInicioDesc(String estado);
    
    // Método principal - más robusto
    List<PeriodoNomina> findAllByOrderByFechaInicioDesc();
    
    // Método alternativo usando query nativa por si el ordenamiento falla
    @Query("{}")
    List<PeriodoNomina> findAllPeriodos();
    
    // Buscar por estado sin ordenamiento
    List<PeriodoNomina> findByEstado(String estado);
}