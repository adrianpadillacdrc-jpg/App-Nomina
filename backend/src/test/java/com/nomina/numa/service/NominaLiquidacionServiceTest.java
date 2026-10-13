package com.nomina.numa.service;

import com.nomina.numa.dto.NominaLiquidacionResponse;
import com.nomina.numa.model.mongo.Novedad;
import com.nomina.numa.model.mongo.PeriodoNomina;
import com.nomina.numa.model.postgres.Empleado;
import com.nomina.numa.repository.jpa.EmpleadoRepository;
import com.nomina.numa.repository.mongo.NovedadRepository;
import com.nomina.numa.repository.mongo.PeriodoNominaRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Optional;
import java.time.LocalDate;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.mockito.Mockito.mock;

class NominaLiquidacionServiceTest {
    private final PeriodoNominaRepository periodoRepo = mock(PeriodoNominaRepository.class);
    private final EmpleadoRepository empleadoRepo = mock(EmpleadoRepository.class);
    private final NovedadRepository novedadRepo = mock(NovedadRepository.class);
    private NominaLiquidacionService service;

    @BeforeEach
    void setUp() {
        service = new NominaLiquidacionService(periodoRepo, empleadoRepo, novedadRepo);
        when(periodoRepo.findById("abierto")).thenReturn(Optional.of(
                PeriodoNomina.builder().id("abierto").estado("ABIERTO")
                        .fechaInicio(LocalDate.of(2026, 10, 1))
                        .fechaFin(LocalDate.of(2026, 10, 15))
                        .build()));
        when(novedadRepo.findByPeriodoIdAndEstadoIgnoreCase("abierto", "APROBADA"))
                .thenReturn(List.of());
        when(novedadRepo.findByEstadoIgnoreCaseAndFechaInicioBetween(
                "APROBADA", LocalDate.of(2026, 10, 1), LocalDate.of(2026, 10, 15)))
                .thenReturn(List.of());
    }

    @Test
    void calculatesOnlyApprovedPeriodNoveltiesForActiveEmployees() {
        Empleado activo = Empleado.builder()
                .id(7L).nombre("Ana").apellido("Ejemplo").estado("VIGENTE")
                .salarioBase(2_000_000.0).tasaArl(0.522).modalidadTrabajo("REMOTO").numeroDocumento("123")
                .build();
        Empleado inactivo = Empleado.builder()
                .id(8L).estado("INACTIVO").salarioBase(800_000.0)
                .build();
        when(empleadoRepo.findAll()).thenReturn(List.of(activo, inactivo));
        when(novedadRepo.findByEstadoIgnoreCaseAndFechaInicioBetween(
                "APROBADA", LocalDate.of(2026, 10, 1), LocalDate.of(2026, 10, 16)))
                .thenReturn(List.of(
                        Novedad.builder().id("bono").periodoId("periodo-antiguo")
                                .idEmpleado(7L).tipoNovedad("BONIFICACION")
                                .fechaInicio(LocalDate.of(2026, 10, 5))
                                .valor(50_000.0).motivo("Bono").build(),
                        Novedad.builder().id("embargo").idEmpleado(7L).tipoNovedad("EMBARGO JUDICIAL")
                                .fechaInicio(LocalDate.of(2026, 10, 8))
                                .monto(10_000.0).build(),
                        Novedad.builder().id("fuera-periodo").idEmpleado(7L).tipoNovedad("BONO")
                                .fechaInicio(LocalDate.of(2025, 1, 1))
                                .valor(500_000.0).build(),
                        Novedad.builder().id("siguiente-periodo").idEmpleado(7L).tipoNovedad("BONO")
                                .fechaInicio(LocalDate.of(2026, 10, 16))
                                .valor(500_000.0).build()));

        NominaLiquidacionResponse result = service.calcular("abierto");

        assertEquals(1, result.getEmpleados().size());
        NominaLiquidacionResponse.EmpleadoLiquidacion empleado = result.getEmpleados().get(0);
        assertEquals(1_000_000, empleado.getSueldoBase());
        assertEquals(50_000, empleado.getDevengos());
        assertEquals(94_000, empleado.getDeducciones());
        assertEquals(956_000, empleado.getTotalPagar());
        assertEquals(1_050_000, result.getTotalDevengado());
        assertEquals(94_000, result.getTotalDeducciones());
        assertEquals(956_000, result.getTotalPagar());
        verify(novedadRepo).findByPeriodoIdAndEstadoIgnoreCase("abierto", "APROBADA");
        verify(novedadRepo).findByEstadoIgnoreCaseAndFechaInicioBetween(
                "APROBADA", LocalDate.of(2026, 10, 1), LocalDate.of(2026, 10, 16));
    }

    @Test
    void payrollUsesApprovedNoveltyPersistedInTheDatabase() {
        Empleado activo = Empleado.builder()
                .id(7L).nombre("Ana").apellido("Ejemplo").estado("ACTIVO")
                .salarioBase(2_000_000.0).tasaArl(0.522).modalidadTrabajo("REMOTO").build();
        when(empleadoRepo.findAll()).thenReturn(List.of(activo));
        when(novedadRepo.findByPeriodoIdAndEstadoIgnoreCase("abierto", "APROBADA"))
                .thenReturn(List.of(Novedad.builder().id("bono-real").idEmpleado(7L)
                        .tipoNovedad("BONO").fechaInicio(LocalDate.of(2026, 10, 7))
                        .valor(20_000.0).concepto("Bono registrado").estado("APROBADA").build()));

        var resultado = service.calcular("abierto").getEmpleados().get(0);

        assertEquals(20_000, resultado.getDevengos());
        assertEquals("Bono registrado", resultado.getDetalleDevengos().get(0).getConcepto());
        assertEquals(20_000, resultado.getDetalleDevengos().get(0).getValor());
        verify(novedadRepo).findByPeriodoIdAndEstadoIgnoreCase("abierto", "APROBADA");
    }

    @Test
    void refusesApprovedNoveltyTypesWithoutALiquidationRule() {
        Empleado activo = Empleado.builder()
                .id(7L).estado("ACTIVO").salarioBase(2_000_000.0)
                .tasaArl(0.522).modalidadTrabajo("REMOTO")
                .build();
        when(empleadoRepo.findAll()).thenReturn(List.of(activo));
        when(novedadRepo.findByEstadoIgnoreCaseAndFechaInicioBetween(
                "APROBADA", LocalDate.of(2026, 10, 1), LocalDate.of(2026, 10, 16)))
                .thenReturn(List.of(Novedad.builder().id("unknown").idEmpleado(7L)
                        .tipoNovedad("TIPO_DESCONOCIDO").fechaInicio(LocalDate.of(2026, 10, 4))
                        .valor(1_000.0).build()));

        IllegalArgumentException error = assertThrows(
                IllegalArgumentException.class, () -> service.calcular("abierto"));

        assertTrue(error.getMessage().contains("TIPO_DESCONOCIDO"));
    }

    @Test
    void refusesActiveEmployeesWithoutValidSalary() {
        when(empleadoRepo.findAll()).thenReturn(List.of(
                Empleado.builder().id(7L).estado("ACTIVO").salarioBase(0.0).build()));

        IllegalStateException error = assertThrows(
                IllegalStateException.class, () -> service.calcular("abierto"));

        assertEquals("Hay empleados activos sin identificación o salario base válido", error.getMessage());
    }

    @Test
    void calculatesTransportContributionsAndMonthlyProvisionsForMinimumWage() {
        when(empleadoRepo.findAll()).thenReturn(List.of(Empleado.builder()
                .id(9L).estado("ACTIVO").salarioBase(1_750_905.0).tasaArl(0.522)
                .modalidadTrabajo("PRESENCIAL").build()));

        NominaLiquidacionResponse.EmpleadoLiquidacion empleado =
                service.calcular("abierto").getEmpleados().get(0);

        assertEquals(875_453, empleado.getSueldoBase());
        assertEquals(124_548, empleado.getDevengos());
        assertEquals(70_036, empleado.getDeducciones());
        assertEquals(144_642, empleado.getAportesEmpleador());
        assertEquals(203_976, empleado.getProvisionesPrestacionales());
        assertEquals(1_348_619, empleado.getCostoTotalEmpleador());
    }

    @Test
    void calculatesOvertimeFromMonthlySalaryInsteadOfClientSuppliedAmount() {
        Empleado empleado = Empleado.builder()
                .id(7L).estado("ACTIVO").salarioBase(2_000_000.0)
                .tasaArl(0.522).modalidadTrabajo("REMOTO").build();
        when(empleadoRepo.findAll()).thenReturn(List.of(empleado));
        when(novedadRepo.findByEstadoIgnoreCaseAndFechaInicioBetween(
                "APROBADA", LocalDate.of(2026, 10, 1), LocalDate.of(2026, 10, 16)))
                .thenReturn(List.of(Novedad.builder().id("extra").idEmpleado(7L)
                        .tipoNovedad("HORAS_EXTRAS").tipoHora("diurnas").horas(2.0)
                        .valor(1.0).fechaInicio(LocalDate.of(2026, 10, 5)).build()));

        var liquidacion = service.calcular("abierto").getEmpleados().get(0);

        assertEquals(23_810, liquidacion.getDevengos());
    }

    @Test
    void rejectsOvertimeAboveDailyLimit() {
        when(empleadoRepo.findAll()).thenReturn(List.of(Empleado.builder()
                .id(7L).estado("ACTIVO").salarioBase(2_000_000.0)
                .tasaArl(0.522).modalidadTrabajo("REMOTO").build()));
        when(novedadRepo.findByEstadoIgnoreCaseAndFechaInicioBetween(
                "APROBADA", LocalDate.of(2026, 10, 1), LocalDate.of(2026, 10, 16)))
                .thenReturn(List.of(Novedad.builder().id("extra").idEmpleado(7L)
                        .tipoNovedad("HORAS_EXTRAS").tipoHora("diurnas").horas(2.5)
                        .fechaInicio(LocalDate.of(2026, 10, 5)).build()));

        IllegalStateException error = assertThrows(
                IllegalStateException.class, () -> service.calcular("abierto"));

        assertTrue(error.getMessage().contains("2 por día"));
    }
}
