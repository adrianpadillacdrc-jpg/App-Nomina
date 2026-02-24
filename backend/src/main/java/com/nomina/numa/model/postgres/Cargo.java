package com.nomina.numa.model.postgres;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "cargos")
@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class Cargo {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String cargo;
    private Double salario;

    @Builder.Default
    private Boolean activo = true;
}
