package com.nomina.numa.repository.jpa;

import org.springframework.data.jpa.repository.JpaRepository;
import com.nomina.numa.model.postgres.Usuario;

public interface UsuarioRepository extends JpaRepository<Usuario, Long> {
}