package com.nomina.numa.dto;

import lombok.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FacturaNominaDto {
    private byte[] pdfBytes;
    private String fileName;
}
