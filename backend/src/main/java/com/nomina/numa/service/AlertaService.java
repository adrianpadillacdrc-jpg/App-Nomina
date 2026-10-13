package com.nomina.numa.service;

import com.nomina.numa.model.postgres.Empleado;
import com.nomina.numa.repository.jpa.EmpleadoRepository;
import com.nomina.numa.repository.mongo.ContratacionRepository;
import com.nomina.numa.repository.mongo.PeriodoNominaRepository;
import com.nomina.numa.util.EstadoNominaCompat;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class AlertaService {

    private final EmpleadoRepository empleadoRepository;
    private final ContratacionRepository contratacionRepository;
    private final PeriodoNominaRepository periodoNominaRepository;

    // Días de anticipación para considerar una alerta
    private static final int DIAS_ANTICIPACION_CONTRATO = 15;
    private static final int DIAS_ANTICIPACION_PERIODO = 7;

    public Map<String, Object> getAlertas() {
        LocalDate hoy = LocalDate.now();
        List<Map<String, Object>> alertas = new ArrayList<>();
        List<Empleado> empleados = empleadoRepository.findAll();
        Map<Long, String> nombresPorId = new HashMap<>();
        empleados.forEach(empleado -> {
            String nombre = nombreCompleto(empleado);
            if (empleado.getId() != null && !nombre.isBlank()) {
                nombresPorId.put(empleado.getId(), nombre);
            }
        });

        // 1. Alertas por contratos próximos a vencer (fecha_fin_contrato en PostgreSQL)
        empleados.forEach(empleado -> {
            LocalDate fechaFin = empleado.getFechaFinContrato();
            if (fechaFin == null)
                return;
            if (!EstadoNominaCompat.esEmpleadoActivo(empleado.getEstado()))
                return;

            long dias = ChronoUnit.DAYS.between(hoy, fechaFin);
            if (dias >= 0 && dias <= DIAS_ANTICIPACION_CONTRATO) {
                Map<String, Object> a = new HashMap<>();
                a.put("tipo", "CONTRATO");
                a.put("titulo", "Contrato próximo a vencer");
                a.put("mensaje", "El contrato de " + nombreCompleto(empleado)
                        + " vence el " + fechaFin
                        + (dias == 0 ? " (¡hoy!)" : " (en " + dias + " día" + (dias == 1 ? "" : "s") + ")"));
                a.put("fecha", fechaFin.toString());
                a.put("diasRestantes", dias);
                a.put("nivel", dias <= 3 ? "URGENTE" : "ADVERTENCIA");
                a.put("idReferencia", empleado.getId());
                a.put("nombreEmpleado", nombreCompleto(empleado));
                a.put("documento", empleado.getNumeroDocumento());
                alertas.add(a);
            // Vencidos: solo mostrar si el vencimiento fue en los últimos 30 días
            } else if (dias < 0 && dias >= -30) {
                Map<String, Object> a = new HashMap<>();
                a.put("tipo", "CONTRATO");
                a.put("titulo", "Contrato vencido");
                a.put("mensaje", "El contrato de " + nombreCompleto(empleado)
                        + " venció el " + fechaFin);
                a.put("fecha", fechaFin.toString());
                a.put("diasRestantes", dias);
                a.put("nivel", "VENCIDO");
                a.put("idReferencia", empleado.getId());
                a.put("nombreEmpleado", nombreCompleto(empleado));
                a.put("documento", empleado.getNumeroDocumento());
                alertas.add(a);
            }
        });

        // 2. Alertas por contrataciones (contratos) en MongoDB con estado VIGENTE
        contratacionRepository.findAll().forEach(contratacion -> {
            LocalDate fechaFin = contratacion.getFechaFin();
            if (fechaFin == null)
                return;
            if (!EstadoNominaCompat.esContratacionVigente(contratacion.getEstado()))
                return;

            long dias = ChronoUnit.DAYS.between(hoy, fechaFin);
            if (dias >= 0 && dias <= DIAS_ANTICIPACION_CONTRATO) {
                String nombre = nombresPorId.getOrDefault(contratacion.getIdEmpleado(),
                    "Empleado sin registro (ID " + contratacion.getIdEmpleado() + ")");
                Map<String, Object> a = new HashMap<>();
                a.put("tipo", "CONTRATACION");
                a.put("titulo", "Contratación próxima a vencer");
                a.put("mensaje", "La contratación de " + nombre
                        + " vence el " + fechaFin
                        + (dias == 0 ? " (¡hoy!)" : " (en " + dias + " día" + (dias == 1 ? "" : "s") + ")"));
                a.put("fecha", fechaFin.toString());
                a.put("diasRestantes", dias);
                a.put("nivel", dias <= 3 ? "URGENTE" : "ADVERTENCIA");
                a.put("idReferencia", contratacion.getId());
                a.put("nombreEmpleado", nombre);
                alertas.add(a);
            }
        });

        // 3. Alertas por períodos de nómina próximos a cerrar
        periodoNominaRepository.findAll().forEach(periodo -> {
            LocalDate fechaFin = periodo.getFechaFin();
            if (fechaFin == null)
                return;
            if (!EstadoNominaCompat.esPeriodoAbierto(periodo.getEstado()))
                return;

            long dias = ChronoUnit.DAYS.between(hoy, fechaFin);
            if (dias >= 0 && dias <= DIAS_ANTICIPACION_PERIODO) {
                Map<String, Object> a = new HashMap<>();
                a.put("tipo", "PERIODO");
                a.put("titulo", "Período de nómina por cerrar");
                a.put("mensaje", "El período \"" + periodo.getDescription()
                        + "\" termina el " + fechaFin
                        + (dias == 0 ? " (¡hoy!)" : " (en " + dias + " día" + (dias == 1 ? "" : "s") + ")")
                        + ". Recuerda liquidar la nómina antes del cierre.");
                a.put("fecha", fechaFin.toString());
                a.put("diasRestantes", dias);
                a.put("nivel", dias <= 2 ? "URGENTE" : "ADVERTENCIA");
                a.put("idReferencia", periodo.getId());
                alertas.add(a);
            }
        });

        // Ordenar: primero VENCIDO, luego URGENTE, luego por días restantes
        alertas.sort((x, y) -> {
            Map<String, Integer> orden = Map.of("VENCIDO", 0, "URGENTE", 1, "ADVERTENCIA", 2);
            int cmp = Integer.compare(orden.getOrDefault((String) x.get("nivel"), 3),
                    orden.getOrDefault((String) y.get("nivel"), 3));
            if (cmp != 0)
                return cmp;
            return Long.compare((long) x.get("diasRestantes"), (long) y.get("diasRestantes"));
        });

        Map<String, Object> respuesta = new HashMap<>();
        respuesta.put("alertas", alertas);
        respuesta.put("total", alertas.size());
        respuesta.put("generadoEn", hoy.toString());
        return respuesta;
    }

    private String nombreCompleto(Empleado empleado) {
        String nombre = empleado.getNombre() != null ? empleado.getNombre().trim() : "";
        String apellido = empleado.getApellido() != null ? empleado.getApellido().trim() : "";
        String completo = (nombre + " " + apellido).trim();
        return completo.isBlank() ? "Nombre no disponible" : completo;
    }
}
