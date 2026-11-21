package com.nomina.numa.repository.jpa;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import com.nomina.numa.model.postgres.Contratacion;
import java.util.List;

@Repository
public interface ContratacionRepository extends JpaRepository<Contratacion, Long> {
    List<Contratacion> findByIdEmpleado(Long idEmpleado);
}
