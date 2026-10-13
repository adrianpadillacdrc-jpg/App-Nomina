package com.nomina.numa.repository.jpa;

import com.nomina.numa.model.postgres.Empleado;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import org.springframework.data.jpa.repository.Query;

@Repository
public interface EmpleadoRepository extends JpaRepository<Empleado, Long> {
    
    // ✅ Método para buscar por estado con soporte de paginación
    Page<Empleado> findByEstado(String estado, Pageable pageable);

    // ✅ Conteo por estado ignorando mayúsculas/minúsculas y espacios
    @Query("select count(e) from Empleado e where lower(trim(e.estado)) = lower(:estado)")
    long countByEstadoIgnoreCase(String estado);

    // ✅ NUEVO: Declaración explícita para que compile el conteo por estado
    long countByEstado(String estado);

    @Query("select coalesce(sum(e.salarioBase), 0) from Empleado e where e.estado = 'ACTIVO'")
    Double sumSalariosActivos();
}