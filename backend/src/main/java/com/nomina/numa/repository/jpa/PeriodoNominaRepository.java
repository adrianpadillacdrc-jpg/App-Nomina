package com.nomina.numa.repository.jpa;

import com.nomina.numa.model.postgres.PeriodoNomina;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import jakarta.persistence.LockModeType;

import java.util.List;
import java.util.Optional;

@Repository
public interface PeriodoNominaRepository extends JpaRepository<PeriodoNomina, Long> {

    Optional<PeriodoNomina> findTopByEstadoOrderByFechaInicioDesc(String estado);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select p from PeriodoNomina p where p.id = :id")
    Optional<PeriodoNomina> findByIdForUpdate(@Param("id") Long id);

    // Método principal - más robusto
    List<PeriodoNomina> findAllByOrderByFechaInicioDesc();

    // Buscar por estado sin ordenamiento
    List<PeriodoNomina> findByEstado(String estado);

    boolean existsByFechaInicioLessThanEqualAndFechaFinGreaterThanEqual(
            java.time.LocalDate fechaInicio, java.time.LocalDate fechaFin);
}
