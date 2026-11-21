package com.nomina.numa.model.postgres;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "tipo_contrato")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TipoContrato {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String tipoContrato; // FIJO, INDEFINIDO, APRENDIZAJE
    private String descripcion;

    @Builder.Default
    private Boolean activo = true;
}
