package com.nomina.numa.service;

import com.nomina.numa.model.postgres.Usuario;
import com.nomina.numa.repository.jpa.UsuarioRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import java.util.List;

@Service
@RequiredArgsConstructor
public class UsuarioService {
    private final UsuarioRepository repo;
    public List<Usuario> findAll() { return repo.findAll(); }
    @SuppressWarnings("null")
    public Usuario save(Usuario u) { return repo.save(u); }
}