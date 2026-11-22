package com.nomina.numa.controller;

import com.nomina.numa.dto.FacturaNominaDto;
import com.nomina.numa.service.FacturaNominaService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/factura-nomina")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class FacturaNominaController {

    private final FacturaNominaService facturaService;

    /**
     * GET /api/factura-nomina/pdf/{pagoId}
     * Genera y descarga el comprobante PDF de un pago de nómina.
     */
    @GetMapping("/pdf/{pagoId}")
    public ResponseEntity<byte[]> descargarPdf(@PathVariable Long pagoId) {
        try {
            FacturaNominaDto factura = facturaService.generarPdf(pagoId);
            return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + factura.getFileName() + "\"")
                    .contentType(MediaType.APPLICATION_PDF)
                    .body(factura.getPdfBytes());
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().build();
        }
    }
}
