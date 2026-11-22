package com.nomina.numa.repository.jpa;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import com.nomina.numa.model.postgres.Rol;

@Repository
public interface RolRepository extends JpaRepository<Rol, Long> {
}
