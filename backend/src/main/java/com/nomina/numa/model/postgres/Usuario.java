package com.nomina.numa.model.postgres;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "usuario")
@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class Usuario {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String nombre;
    private String correo;
    private String contrasena;
    private String rol;

    @Builder.Default
    private Boolean activo = true;
}