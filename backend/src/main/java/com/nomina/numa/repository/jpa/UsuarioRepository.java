// src/main/java/com/nomina/numa/repository/jpa/UsuarioRepository.java
package com.nomina.numa.repository.jpa;

import com.nomina.numa.model.postgres.Usuario;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface UsuarioRepository extends JpaRepository<Usuario, Long> {

    Optional<Usuario> findByNombre(String nombre);

    Optional<Usuario> findByCorreo(String correo);
}