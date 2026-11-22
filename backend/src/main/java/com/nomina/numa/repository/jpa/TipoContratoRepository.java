package com.nomina.numa.repository.jpa;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import com.nomina.numa.model.postgres.TipoContrato;

@Repository
public interface TipoContratoRepository extends JpaRepository<TipoContrato, Long> {
}
