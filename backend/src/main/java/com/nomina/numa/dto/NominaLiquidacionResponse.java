package com.nomina.numa.dto;

import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
public class NominaLiquidacionResponse {
    private String periodoId;
    private String estadoPeriodo;
    private List<EmpleadoLiquidacion> empleados;
    private long totalDevengado;
    private long totalDeducciones;
    private long totalPagar;
    private long totalAportesEmpleador;
    private long totalProvisionesPrestacionales;
    private long costoTotalEmpleador;

    @Data
    @Builder
    public static class EmpleadoLiquidacion {
        private Long id;
        private String nombre;
        private String apellido;
        private long sueldoBase;
        private long devengos;
        private long deducciones;
        private long totalPagar;
        private long aportesEmpleador;
        private long provisionesPrestacionales;
        private long costoTotalEmpleador;
        private List<ConceptoLiquidado> detalleAportesEmpleador;
        private List<ConceptoLiquidado> detalleDevengos;
        private List<ConceptoLiquidado> detalleDeducciones;
    }

    @Data
    @Builder
    public static class ConceptoLiquidado {
        private String tipo;
        private String concepto;
        private long valor;
    }
}
