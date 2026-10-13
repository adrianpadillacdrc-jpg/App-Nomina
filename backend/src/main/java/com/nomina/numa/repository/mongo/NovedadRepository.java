package com.nomina.numa.repository.mongo;

import com.nomina.numa.model.mongo.Novedad;
import org.springframework.data.mongodb.repository.MongoRepository;
import java.util.List;
import java.time.LocalDate;

public interface NovedadRepository extends MongoRepository<Novedad, String> {
    List<Novedad> findByIdEmpleado(Long idEmpleado);

    List<Novedad> findByPeriodoId(String periodoId);

    List<Novedad> findByPeriodoIdAndEstadoIgnoreCase(String periodoId, String estado);

    List<Novedad> findByEstadoIgnoreCase(String estado);

    List<Novedad> findByEstadoIgnoreCaseAndFechaInicioBetween(
            String estado, LocalDate fechaInicio, LocalDate fechaFin);

    List<Novedad> findByCedula(String cedula); // ← NUEVO
}