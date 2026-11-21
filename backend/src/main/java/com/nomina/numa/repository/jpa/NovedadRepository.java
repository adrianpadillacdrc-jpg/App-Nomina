package com.nomina.numa.repository.jpa;

import com.nomina.numa.model.postgres.Novedad;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.time.LocalDate;

@Repository
public interface NovedadRepository extends JpaRepository<Novedad, Long> {
    List<Novedad> findByIdEmpleado(Long idEmpleado);

    List<Novedad> findByPeriodoId(String periodoId);

    List<Novedad> findByPeriodoIdAndEstadoIgnoreCase(String periodoId, String estado);

    List<Novedad> findByEstadoIgnoreCase(String estado);

    List<Novedad> findByEstadoIgnoreCaseAndFechaInicioBetween(
            String estado, LocalDate fechaInicio, LocalDate fechaFin);

    List<Novedad> findByCedula(String cedula);
}
