package com.nomina.numa.repository.jpa;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import com.nomina.numa.model.postgres.ConceptoNomina;

@Repository
public interface ConceptoNominaRepository extends JpaRepository<ConceptoNomina, Long> {
}
