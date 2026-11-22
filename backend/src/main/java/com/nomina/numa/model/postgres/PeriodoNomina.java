package com.nomina.numa.model.postgres;

import jakarta.persistence.*;
import lombok.*;

import com.fasterxml.jackson.annotation.JsonFormat;

import java.time.LocalDate;

@Entity
@Table(name = "periodo_nomina")
@Data
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PeriodoNomina {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    public Long getId() {
        return this.id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd")
    private LocalDate fechaInicio;

    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd")
    private LocalDate fechaFin;

    private String description;

    // ABIERTO, CERRADO, PENDIENTE
    private String estado;

    private Integer anio;

    // 1ra, 2da, QUINCENAL
    private String tipo;

    // Costo de nómina en millones COP
    private Double costoMillones;

    // Costo de nómina en COP
    private Double costoCOP;

    private Boolean costoEstimado;

    private String origenCosto;

    // Método helper para obtener descripción formateada
    public String getDescription() {

        if (description != null && !description.isEmpty()) {
            return description;
        }

        if (fechaInicio != null && tipo != null) {

            String mes = obtenerMes(fechaInicio.getMonthValue());

            return String.format(
                    "%s %s %d",
                    tipo,
                    mes,
                    fechaInicio.getYear());
        }

        return "Período sin descripción";
    }

    // Método helper para obtener mes en español
    private String obtenerMes(int mes) {

        String[] meses = {
                "Enero",
                "Febrero",
                "Marzo",
                "Abril",
                "Mayo",
                "Junio",
                "Julio",
                "Agosto",
                "Septiembre",
                "Octubre",
                "Noviembre",
                "Diciembre"
        };

        return meses[mes - 1];
    }

    // Validar si el período está activo
    public boolean isActivo() {

        return "ABIERTO".equalsIgnoreCase(estado);
    }
}
