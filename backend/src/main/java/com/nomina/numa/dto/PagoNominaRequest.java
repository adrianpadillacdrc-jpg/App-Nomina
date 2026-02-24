package com.nomina.numa.dto;

import lombok.*;
import java.util.List;

@Data @NoArgsConstructor @AllArgsConstructor
public class PagoNominaRequest {
    private String periodoId;
    private List<DetalleNomina> detalles;

    @Data @NoArgsConstructor @AllArgsConstructor
    public static class DetalleNomina {
        private Long idEmpleado;
        private Double totalDevengado;
        private Double totalDeducciones;
        private Double totalPagar;
    }
}