package com.nomina.numa.util;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class EstadoNominaCompatTest {

    @Test
    void normalizaEstadosSinRomperValoresActuales() {
        assertTrue(EstadoNominaCompat.esEmpleadoActivo("ACTIVO"));
        assertTrue(EstadoNominaCompat.esEmpleadoActivo(" vigente "));
        assertFalse(EstadoNominaCompat.esEmpleadoActivo("INACTIVO"));

        assertTrue(EstadoNominaCompat.esContratacionVigente("VIGENTE"));
        assertTrue(EstadoNominaCompat.esContratacionVigente("activo"));
        assertFalse(EstadoNominaCompat.esContratacionVigente("FINALIZADO"));

        assertTrue(EstadoNominaCompat.esPeriodoAbierto("ABIERTO"));
        assertTrue(EstadoNominaCompat.esPeriodoAbierto("activo"));
        assertTrue(EstadoNominaCompat.esPeriodoAbierto("vigente"));
        assertFalse(EstadoNominaCompat.esPeriodoAbierto("CERRADO"));
    }
}
