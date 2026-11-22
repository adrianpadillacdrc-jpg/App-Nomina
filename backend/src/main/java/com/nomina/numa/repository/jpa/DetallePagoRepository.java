package com.nomina.numa.repository.jpa;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import com.nomina.numa.model.postgres.DetallePago;

@Repository
public interface DetallePagoRepository extends JpaRepository<DetallePago, Long> {
}
