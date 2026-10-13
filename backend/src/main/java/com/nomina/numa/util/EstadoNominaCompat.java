package com.nomina.numa.util;

import java.util.Locale;

public final class EstadoNominaCompat {

    private EstadoNominaCompat() {
    }

    public static String normalizar(String estado) {
        if (estado == null) {
            return "";
        }
        return estado.trim().toUpperCase(Locale.ROOT);
    }

    public static boolean esEmpleadoActivo(String estado) {
        String valor = normalizar(estado);
        return "ACTIVO".equals(valor) || "VIGENTE".equals(valor);
    }

    public static boolean esContratacionVigente(String estado) {
        String valor = normalizar(estado);
        return "VIGENTE".equals(valor) || "ACTIVO".equals(valor);
    }

    public static boolean esPeriodoAbierto(String estado) {
        String valor = normalizar(estado);
        return "ABIERTO".equals(valor) || "ACTIVO".equals(valor) || "VIGENTE".equals(valor);
    }
}
