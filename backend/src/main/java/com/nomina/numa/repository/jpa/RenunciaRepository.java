package com.nomina.numa.repository.jpa;

import com.nomina.numa.model.postgres.Renuncia;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface RenunciaRepository extends JpaRepository<Renuncia, Long> {
    List<Renuncia> findByIdEmpleado(Long idEmpleado);

    // Última renuncia activa (ENVIADA o ACEPTADA); RETIRADA no cuenta
    List<Renuncia> findByIdEmpleadoAndEstadoInOrderByIdDesc(Long idEmpleado, List<String> estados);

    List<Renuncia> findByEstado(String estado);
}
