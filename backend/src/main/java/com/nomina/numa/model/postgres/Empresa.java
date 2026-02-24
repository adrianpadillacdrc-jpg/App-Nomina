package com.nomina.numa.model.postgres;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "empresa")
@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class Empresa {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String nitEmpresa;
    private String nombreEmpresa;
    private String representanteLegal;
    private String direccion;
    private String telefono;

    @Builder.Default
    private Boolean activo = true;
}