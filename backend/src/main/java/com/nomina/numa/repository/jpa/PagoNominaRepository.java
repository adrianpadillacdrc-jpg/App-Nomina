package com.nomina.numa.repository.jpa;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import com.nomina.numa.model.postgres.PagoNomina;
import java.util.List;

@Repository
public interface PagoNominaRepository extends JpaRepository<PagoNomina, Long> {
    List<PagoNomina> findByIdNominaAndIdEmpleadoIsNotNull(String idNomina);

    List<PagoNomina> findByIdNominaAndIdEmpleadoIsNull(String idNomina);

    List<PagoNomina> findByIdEmpleadoOrderByFechaPagoDesc(Long idEmpleado);
}
