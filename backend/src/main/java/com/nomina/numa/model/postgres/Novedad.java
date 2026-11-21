package com.nomina.numa.model.postgres;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "novedades")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Novedad {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String periodoId;
    private Long idEmpleado;
    private String cedula;
    private String tipoNovedad;
    private LocalDate fechaInicio;
    private LocalDate fechaFin;
    private String horaInicio;
    private String horaFin;
    private Double horas;
    private Double valor;
    private Double valorHora;
    private String tipoHora;
    private Double monto;
    private String concepto;
    private String motivo;
    private String observaciones;

    @Builder.Default
    private String estado = "PENDIENTE";

    private String aprobadoPor;
    private LocalDateTime fechaRespuesta;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
