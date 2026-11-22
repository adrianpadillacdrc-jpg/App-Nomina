package com.nomina.numa.repository.jpa;

import com.nomina.numa.model.postgres.FirmaContratoCodigo;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface FirmaContratoCodigoRepository extends JpaRepository<FirmaContratoCodigo, Long> {
    Optional<FirmaContratoCodigo> findByIdContratacion(Long idContratacion);
    void deleteByIdContratacion(Long idContratacion);
}
