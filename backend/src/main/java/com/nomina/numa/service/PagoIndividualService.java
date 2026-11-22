package com.nomina.numa.service;

import com.nomina.numa.dto.PagoIndividualRequest;
import com.nomina.numa.model.postgres.Empleado;
import com.nomina.numa.model.postgres.PagoNomina;
import com.nomina.numa.repository.jpa.EmpleadoRepository;
import com.nomina.numa.repository.jpa.PagoNominaRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;

@Service
@RequiredArgsConstructor
public class PagoIndividualService {

    private final PagoNominaRepository pagoRepo;
    private final EmpleadoRepository empleadoRepository;

    @Transactional
    public PagoNomina registrar(PagoIndividualRequest req) {
        if (req.getEmpleadoId() == null) {
            throw new IllegalArgumentException("empleadoId es requerido");
        }
        if (req.getMonto() == null || req.getMonto() <= 0) {
            throw new IllegalArgumentException("El monto debe ser mayor a cero");
        }

        Empleado emp = empleadoRepository.findById(req.getEmpleadoId())
                .orElseThrow(() -> new IllegalArgumentException(
                        "Empleado no encontrado con id: " + req.getEmpleadoId()));

        String nombre = ((emp.getNombre() != null ? emp.getNombre().trim() : "")
                + " " + (emp.getApellido() != null ? emp.getApellido().trim() : "")).trim();

        String metodo = (req.getMetodoPago() != null && !req.getMetodoPago().isBlank())
                ? req.getMetodoPago().trim().toUpperCase()
                : "TRANSFERENCIA";

        PagoNomina pago = PagoNomina.builder()
                .idNomina("INDIVIDUAL")        // sin período asociado
                .idEmpleado(emp.getId())
                .nombreEmpleado(nombre)
                .sueldoBase(emp.getSalarioBase() != null ? emp.getSalarioBase().doubleValue() : 0.0)
                .totalDevengado(req.getMonto())
                .totalDeducciones(0.0)
                .totalPagar(req.getMonto())
                .aportesEmpleador(0.0)
                .provisionesPrestacionales(0.0)
                .costoTotalEmpleador(req.getMonto())
                .metodoPago(metodo)
                .fechaPago(LocalDate.now())
                .estado("PAGADO")
                .build();

        return pagoRepo.save(pago);
    }
}
