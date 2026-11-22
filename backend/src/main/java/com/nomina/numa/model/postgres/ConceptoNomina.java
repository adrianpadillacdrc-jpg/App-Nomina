package com.nomina.numa.model.postgres;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "concepto_nomina")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ConceptoNomina {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String nombreConcepto;
    private String tipoConcepto; // DEVENGADO / DEDUCCION

    @Builder.Default
    private Boolean activo = true;
}
