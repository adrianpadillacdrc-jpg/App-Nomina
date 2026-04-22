package com.nomina.numa.model.mongo;

import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.TypeAlias;
import org.springframework.data.mongodb.core.mapping.Document;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Document(collection = "novedades")
@TypeAlias("com.nomina.numamodel.mongo.Novedad")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Novedad {
    @Id
    private String id;
    private String periodoId;
    private Long idEmpleado;
    private String cedula; // ← NUEVO: cédula del empleado
    private String tipoNovedad; // ← AUXILIO_TRANSPORTE, BONO, HORAS_EXTRAS, etc.
    private LocalDate fechaInicio;
    private LocalDate fechaFin;
    private String horaInicio; // ← NUEVO: hora de inicio (HH:MM)
    private String horaFin; // ← NUEVO: hora de fin (HH:MM)
    private Integer horas; // ← Cantidad de horas
    private Double valor; // ← Valor total
    private Double valorHora; // ← NUEVO: valor por hora (para horas extras)
    private String tipoHora; // ← NUEVO: diurnas, nocturnas, festivas
    private Double monto; // ← NUEVO: monto (para auxilio o bono)
    private String concepto; // ← NUEVO: concepto (para auxilio)
    private String motivo; // ← NUEVO: motivo (para bono)
    private String observaciones;
    private String estado; // PENDIENTE, APROBADA, RECHAZADA
    private LocalDateTime createdAt; // ← NUEVO: fecha de creación
    private LocalDateTime updatedAt; // ← NUEVO: fecha de actualización

    @Builder.Default
    private String estadoDefault = "PENDIENTE";
}