package com.nomina.numa.model.postgres;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "pago_nomina")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PagoNomina {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String idNomina;
    private LocalDate fechaPago;
    private String metodoPago;

    private Long idEmpleado;
    private String nombreEmpleado;

    @Builder.Default
    private Double totalDevengado = 0.0;

    @Builder.Default
    private Double totalDeducciones = 0.0;

    @Builder.Default
    private Double totalPagar = 0.0;

    @Builder.Default
    private Double aportesEmpleador = 0.0;

    @Builder.Default
    private Double provisionesPrestacionales = 0.0;

    @Builder.Default
    private Double costoTotalEmpleador = 0.0;

    @Builder.Default
    private String estado = "PENDIENTE"; // PENDIENTE, PAGADO, ANULADO

    /** Sueldo base usado para la liquidación (histórico, no se modifica). */
    private Double sueldoBase;
}
