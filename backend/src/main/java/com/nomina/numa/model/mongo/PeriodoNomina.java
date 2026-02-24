package com.nomina.numa.model.mongo;

import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import java.time.LocalDate;

@Document(collection = "periodo_nomina")
@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class PeriodoNomina {
    @Id
    private String id;

    private LocalDate fechaInicio;
    private LocalDate fechaFin;

    @Builder.Default
    private String estado = "ABIERTO"; // ABIERTO, CERRADO, LIQUIDADO
}