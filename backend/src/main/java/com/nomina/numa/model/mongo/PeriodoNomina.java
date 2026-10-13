package com.nomina.numa.model.mongo;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.mapping.Field;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.fasterxml.jackson.databind.annotation.JsonDeserialize;
import com.fasterxml.jackson.databind.annotation.JsonSerialize;
import com.fasterxml.jackson.datatype.jsr310.deser.LocalDateDeserializer;
import com.fasterxml.jackson.datatype.jsr310.ser.LocalDateSerializer;

import java.time.LocalDate;

@Document(collection = "periodonomina")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PeriodoNomina {

    @Id
    private String id;

    @Field("fechaInicio")
    @JsonSerialize(using = LocalDateSerializer.class)
    @JsonDeserialize(using = LocalDateDeserializer.class)
    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd")
    private LocalDate fechaInicio;

    @Field("fechaFin")
    @JsonSerialize(using = LocalDateSerializer.class)
    @JsonDeserialize(using = LocalDateDeserializer.class)
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