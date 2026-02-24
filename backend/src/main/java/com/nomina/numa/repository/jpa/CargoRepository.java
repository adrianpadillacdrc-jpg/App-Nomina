package com.nomina.numa.repository.jpa;

import org.springframework.data.jpa.repository.JpaRepository;
import com.nomina.numa.model.postgres.Cargo;

public interface CargoRepository extends JpaRepository<Cargo, Long> {}