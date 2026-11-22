package com.nomina.numa.model.postgres;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "roles")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Rol {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String rol; // ADMIN, EMPLEADO, CONTADOR
    private String descripcion;

    @Builder.Default
    private Boolean activo = true;
}
