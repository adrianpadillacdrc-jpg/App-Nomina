package com.nomina.numa.repository.jpa;

import org.springframework.data.jpa.repository.JpaRepository;
import com.nomina.numa.model.postgres.Empresa;

public interface EmpresaRepository extends JpaRepository<Empresa, Long> {
}