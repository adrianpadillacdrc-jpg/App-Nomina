package com.nomina.numa.controller;

import com.nomina.numa.model.mongo.Novedad;
import com.nomina.numa.model.mongo.Renuncia;
import com.nomina.numa.model.postgres.Empleado;
import com.nomina.numa.repository.jpa.EmpleadoRepository;
import com.nomina.numa.repository.mongo.NovedadRepository;
import com.nomina.numa.repository.mongo.PeriodoNominaRepository;
import com.nomina.numa.repository.mongo.RenunciaRepository;
import com.nomina.numa.security.JwtUtil;
import com.nomina.numa.util.EstadoNominaCompat;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.text.Normalizer;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.*;

/**
 * Portal de auto-servicio del EMPLEADO.
 * Acceso con nombre + cédula (sin usuario de sistema).
 */
@Slf4j
@RestController
@RequestMapping("/api/portal")
@RequiredArgsConstructor
public class PortalEmpleadoController {

    private final EmpleadoRepository empleadoRepository;
    private final NovedadRepository novedadRepository;
    private final PeriodoNominaRepository periodoNominaRepository;
    private final RenunciaRepository renunciaRepository;
    private final JwtUtil jwtUtil;

    // ===== 1. LOGIN (nombre + cédula) =====
    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody Map<String, String> cred) {
        String nombre = cred.getOrDefault("nombre", "").trim();
        String cedula = cred.getOrDefault("cedula", "").trim();

        if (nombre.isBlank() || cedula.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Nombre y cédula son obligatorios"));
        }

        // Busca por cédula exacta y nombre (primero o segundo nombre)
        List<Empleado> candidatos = empleadoRepository.findAll().stream()
                .filter(e -> Objects.equals(
                        e.getNumeroDocumento() == null ? null : e.getNumeroDocumento().trim(),
                        cedula))
                .filter(e -> EstadoNominaCompat.esEmpleadoActivo(e.getEstado()))
                .filter(e -> normalizar(e.getNombre() + " " + e.getApellido()).contains(normalizar(nombre))
                        || normalizar(e.getNombre()).contains(normalizar(nombre)))
                .toList();

        if (candidatos.isEmpty()) {
            return ResponseEntity.status(401).body(Map.of("error", "Credenciales incorrectas"));
        }

        Empleado emp = candidatos.get(0);
        Map<String, Object> resp = new LinkedHashMap<>();
        resp.put("id", emp.getId());
        resp.put("nombre", emp.getNombre());
        resp.put("apellido", emp.getApellido());
        resp.put("cargo", emp.getCargo());
        resp.put("salarioBase", emp.getSalarioBase());
        resp.put("estado", emp.getEstado());
        resp.put("chatToken", jwtUtil.generateToken("portal-employee:" + emp.getId(), "ROLE_PORTAL_EMPLOYEE"));
        return ResponseEntity.ok(resp);
    }

    private String normalizar(String s) {
        if (s == null) {
            return "";
        }
        return Normalizer.normalize(s, Normalizer.Form.NFD)
                .replaceAll("\\p{M}+", "")
                .toLowerCase(Locale.ROOT)
                .trim()
                .replaceAll("\\s+", " ");
    }

    // ===== 2. MI NÓMINA (resumen) =====
    @GetMapping("/{id}/resumen")
    public ResponseEntity<?> resumen(@PathVariable Long id) {
        Optional<Empleado> optEmp = empleadoRepository.findById(id);
        if (optEmp.isEmpty()) return ResponseEntity.notFound().build();
        Empleado emp = optEmp.get();

        double salarioBase = emp.getSalarioBase() != null ? emp.getSalarioBase() : 0.0;
        List<Novedad> aprobadas = novedadRepository.findByIdEmpleado(id).stream()
                .filter(n -> "APROBADA".equalsIgnoreCase(n.getEstado()))
                .toList();

        double devengos = 0, deducciones = 0;
        List<Map<String, Object>> detalleAprobadas = new ArrayList<>();
        for (Novedad n : aprobadas) {
            double valor = n.getValor() != null ? n.getValor() : (n.getMonto() != null ? n.getMonto() : 0.0);
            boolean esDeduccion = esDeduccion(n.getTipoNovedad());
            if (esDeduccion) deducciones += valor; else devengos += valor;
            Map<String, Object> d = new LinkedHashMap<>();
            d.put("tipo", n.getTipoNovedad());
            d.put("concepto", n.getConcepto() != null ? n.getConcepto()
                    : n.getMotivo() != null ? n.getMotivo()
                    : n.getObservaciones() != null ? n.getObservaciones()
                    : n.getTipoNovedad());
            d.put("valor", valor);
            d.put("esDeduccion", esDeduccion);
            d.put("fecha", n.getFechaInicio() != null ? n.getFechaInicio().toString() : null);
            detalleAprobadas.add(d);
        }

        Map<String, Object> resp = new LinkedHashMap<>();
        resp.put("salarioBase", salarioBase);
        resp.put("devengos", devengos);
        resp.put("deducciones", deducciones);
        resp.put("neto", salarioBase + devengos - deducciones);
        resp.put("novedadesAprobadas", detalleAprobadas);
        return ResponseEntity.ok(resp);
    }

    private boolean esDeduccion(String tipo) {
        return tipo != null && (tipo.equals("PRESTAMO") || tipo.equals("EMBARGO")
                || tipo.equals("EMBARGO JUDICIAL")
                || tipo.equals("DEDUCCION") || tipo.equals("INCAPACIDAD")
                || tipo.equals("PERMISO_NO_REMUNERADO"));
    }

    // ===== 3. NOVEDADES (lista con estado) =====
    @GetMapping("/{id}/novedades")
    public ResponseEntity<List<Novedad>> novedades(@PathVariable Long id) {
        List<Novedad> lista = novedadRepository.findByIdEmpleado(id).stream()
                .sorted(Comparator.comparing(Novedad::getId).reversed())
                .toList();
        return ResponseEntity.ok(lista);
    }

    // ===== 4. CREAR NOVEDAD =====
    @PostMapping("/{id}/novedades")
    public ResponseEntity<?> crearNovedad(@PathVariable Long id, @RequestBody Map<String, Object> body) {
        Optional<Empleado> optEmp = empleadoRepository.findById(id);
        if (optEmp.isEmpty()) return ResponseEntity.notFound().build();
        Empleado emp = optEmp.get();

        String tipo = (String) body.getOrDefault("tipoNovedad", "OTRO");
        Novedad n = Novedad.builder()
                .idEmpleado(id)
                .cedula(emp.getNumeroDocumento())
                .tipoNovedad(tipo)
                .observaciones((String) body.get("observaciones"))
                .estado("PENDIENTE")
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();

        // Asociar al período ABIERTO actual
        periodoNominaRepository.findTopByEstadoOrderByFechaInicioDesc("ABIERTO")
                .ifPresent(p -> n.setPeriodoId(p.getId()));

        // Fechas
        try {
            if (body.get("fechaInicio") != null && !body.get("fechaInicio").toString().isBlank())
                n.setFechaInicio(LocalDate.parse(body.get("fechaInicio").toString()));
            if (body.get("fechaFin") != null && !body.get("fechaFin").toString().isBlank())
                n.setFechaFin(LocalDate.parse(body.get("fechaFin").toString()));
        } catch (Exception e) {
            log.warn("Fecha inválida en novedad del portal: {}", e.getMessage());
        }

        // Valor según tipo
        double valor = body.get("valor") != null ? Double.parseDouble(body.get("valor").toString()) : 0;
        if (valor > 0) n.setValor(valor);
        if (tipo.equals("HORAS_EXTRAS")) {
            double horas = body.get("horas") != null ? Double.parseDouble(body.get("horas").toString()) : 0;
            n.setHoras(horas);
            n.setTipoHora(body.get("tipoHora") == null ? "diurnas" : body.get("tipoHora").toString());
        }
        if (tipo.equals("AUXILIO_TRANSPORTE")) {
            n.setMonto(valor);
            n.setConcepto("Auxilio de transporte");
        }
        if (tipo.equals("BONO")) {
            n.setMotivo(body.get("motivo") != null ? body.get("motivo").toString() : "Solicitud del empleado");
        }

        return ResponseEntity.ok(novedadRepository.save(n));
    }

    // ===== 5. RENUNCIA =====

    /** Estado de la renuncia actual + liquidación estimada si está aceptada. */
    @GetMapping("/{id}/renuncia")
    public ResponseEntity<?> renuncia(@PathVariable Long id) {
        List<Renuncia> activas = renunciaRepository.findByIdEmpleadoAndEstadoInOrderByIdDesc(
                id, List.of("ENVIADA", "ACEPTADA"));

        Map<String, Object> resp = new LinkedHashMap<>();
        resp.put("renuncia", activas.isEmpty() ? null : activas.get(0));
        if (!activas.isEmpty() && "ACEPTADA".equalsIgnoreCase(activas.get(0).getEstado())) {
            resp.put("liquidacion", calcularLiquidacion(id, activas.get(0)));
        } else {
            resp.put("liquidacion", null);
        }
        return ResponseEntity.ok(resp);
    }

    /** Crear y enviar carta de renuncia (autogenerada). */
    @PostMapping("/{id}/renuncia")
    public ResponseEntity<?> enviarRenuncia(@PathVariable Long id, @RequestBody Map<String, String> body) {
        Optional<Empleado> optEmp = empleadoRepository.findById(id);
        if (optEmp.isEmpty()) return ResponseEntity.notFound().build();
        Empleado emp = optEmp.get();

        // Ya existe una activa? no permitir duplicar
        List<Renuncia> activas = renunciaRepository.findByIdEmpleadoAndEstadoInOrderByIdDesc(
                id, List.of("ENVIADA", "ACEPTADA"));
        if (!activas.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Ya existe una renuncia activa"));
        }

        String motivo = body.getOrDefault("motivo", "motivos personales");
        String nombreEmpresa = body.getOrDefault("empresa", "NUMA Nómina");
        String carta = generarCarta(emp, motivo, nombreEmpresa);

        Renuncia r = Renuncia.builder()
                .idEmpleado(id)
                .nombreEmpleado(emp.getNombre() + " " + emp.getApellido())
                .cargoEmpleado(emp.getCargo())
                .motivo(motivo)
                .contenidoCarta(carta)
                .estado("ENVIADA")
                .fechaEnvio(LocalDate.now())
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();

        return ResponseEntity.ok(renunciaRepository.save(r));
    }

    /**  Subir PDF de la carta de renuncia (multipart). */
    @PostMapping("/{id}/renuncia/pdf")
    public ResponseEntity<?> subirPdfRenuncia(
            @PathVariable Long id,
            @RequestParam("archivo") MultipartFile archivo) {
        try {
            if (archivo == null || archivo.isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("error", "No se recibió ningún archivo"));
            }
            String nombre = archivo.getOriginalFilename();
            if (nombre == null || !nombre.toLowerCase().endsWith(".pdf")) {
                return ResponseEntity.badRequest().body(Map.of("error", "Solo se aceptan archivos PDF"));
            }
            if (archivo.getSize() > 10 * 1024 * 1024) { // 10 MB máx
                return ResponseEntity.badRequest().body(Map.of("error", "El PDF supera el límite de 10 MB"));
            }

            Renuncia r = renunciaRepository.findByIdEmpleadoAndEstadoInOrderByIdDesc(
                    id, List.of("ENVIADA", "ACEPTADA")).stream().findFirst().orElse(null);
            if (r == null) {
                return ResponseEntity.badRequest().body(Map.of("error", "Primero debes enviar la renuncia"));
            }

            byte[] bytes = archivo.getBytes();
            r.setNombrePdf(nombre);
            r.setPdfBase64(Base64.getEncoder().encodeToString(bytes));
            r.setUpdatedAt(LocalDateTime.now());
            renunciaRepository.save(r);

            log.info("PDF de renuncia guardado - empleado {} - {} ({} bytes)", id, nombre, bytes.length);
            return ResponseEntity.ok(Map.of(
                    "mensaje", "PDF adjuntado correctamente",
                    "nombrePdf", nombre));
        } catch (Exception e) {
            log.error("Error al subir PDF de renuncia", e);
            return ResponseEntity.status(500).body(Map.of("error", "Error al procesar el PDF"));
        }
    }

    /**  Descargar el PDF adjunto de la renuncia. */
    @GetMapping("/renuncia/{idRenuncia}/pdf")
    public ResponseEntity<byte[]> descargarPdf(@PathVariable String idRenuncia) {
        Optional<Renuncia> opt = renunciaRepository.findById(idRenuncia);
        if (opt.isEmpty() || opt.get().getPdfBase64() == null) {
            return ResponseEntity.notFound().build();
        }
        byte[] bytes = Base64.getDecoder().decode(opt.get().getPdfBase64());
        String nombre = opt.get().getNombrePdf() != null ? opt.get().getNombrePdf()
                : "carta-renuncia.pdf";
        return ResponseEntity.ok()
                .header("Content-Disposition", "attachment; filename=\"" + nombre + "\"")
                .contentType(MediaType.APPLICATION_PDF)
                .body(bytes);
    }

    /** Retirar la solicitud de renuncia. */
    @PostMapping("/{id}/renuncia/retirar")
    public ResponseEntity<?> retirarRenuncia(@PathVariable Long id) {
        List<Renuncia> activas = renunciaRepository.findByIdEmpleadoAndEstadoInOrderByIdDesc(
                id, List.of("ENVIADA", "ACEPTADA"));
        if (activas.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "No hay renuncia activa para retirar"));
        }
        Renuncia r = activas.get(0);
        if ("ACEPTADA".equalsIgnoreCase(r.getEstado())) {
            return ResponseEntity.badRequest().body(Map.of("error", "La renuncia ya fue aceptada y no se puede retirar"));
        }
        r.setEstado("RETIRADA");
        r.setUpdatedAt(LocalDateTime.now());
        return ResponseEntity.ok(renunciaRepository.save(r));
    }

    /** ADMIN: aceptar renuncia → activa liquidación estimada. */
    @PostMapping("/renuncia/{idRenuncia}/aceptar")
    public ResponseEntity<?> aceptarRenuncia(@PathVariable String idRenuncia) {
        Optional<Renuncia> opt = renunciaRepository.findById(idRenuncia);
        if (opt.isEmpty()) return ResponseEntity.notFound().build();
        Renuncia r = opt.get();
        r.setEstado("ACEPTADA");
        r.setFechaAceptacion(LocalDate.now());
        r.setUpdatedAt(LocalDateTime.now());

        // Guardar el total de la liquidación en la renuncia
        Map<String, Object> liq = calcularLiquidacion(r.getIdEmpleado(), r);
        if (liq.get("total") != null) {
            r.setLiquidacionEstimada(Double.parseDouble(liq.get("total").toString()));
        }

        // Marcar empleado como RETIRADO
        Optional<Empleado> emp = empleadoRepository.findById(r.getIdEmpleado());
        emp.ifPresent(e -> {
            e.setEstado("INACTIVO");
            e.setFechaFinContrato(LocalDate.now());
            empleadoRepository.save(e);
        });

        Renuncia guardada = renunciaRepository.save(r);
        Map<String, Object> resp = new LinkedHashMap<>();
        resp.put("renuncia", guardada);
        resp.put("liquidacion", calcularLiquidacion(r.getIdEmpleado(), guardada));
        return ResponseEntity.ok(resp);
    }

    // ===== 7. PANEL ADMIN: PENDIENTES =====
    @GetMapping("/admin/pendientes")
    public ResponseEntity<?> pendientes() {
        List<Novedad> novedadesPend = novedadRepository.findAll().stream()
                .filter(n -> "PENDIENTE".equalsIgnoreCase(n.getEstado()))
                .toList();
        List<Renuncia> renunciasPend = renunciaRepository.findByEstado("ENVIADA").stream()
                .filter(r -> !"RECHAZADA".equalsIgnoreCase(r.getEstado()))
                .toList();
        List<Renuncia> renunciasPendienteDirecto = renunciaRepository.findByEstado("PENDIENTE");
        Map<String, Renuncia> porId = new LinkedHashMap<>();
        renunciasPend.forEach(r -> porId.put(r.getId(), r));
        renunciasPendienteDirecto.forEach(r -> porId.putIfAbsent(r.getId(), r));
        renunciasPend = List.copyOf(porId.values());
        List<Renuncia> liquidadas = renunciaRepository.findByEstado("ACEPTADA");

        Map<String, Object> resp = new LinkedHashMap<>();
        resp.put("novedades", novedadesPend);
        resp.put("renuncias", renunciasPend);
        resp.put("liquidadas", liquidadas);
        return ResponseEntity.ok(resp);
    }

    /** ADMIN: aprobar o rechazar una novedad (decN). */
    @PostMapping("/novedades/{idNovedad}/responder")
    public ResponseEntity<?> responderNovedad(@PathVariable String idNovedad, @RequestBody Map<String, String> body) {
        Optional<Novedad> opt = novedadRepository.findById(idNovedad);
        if (opt.isEmpty()) return ResponseEntity.notFound().build();
        Novedad n = opt.get();
        String decision = body.getOrDefault("estado", "APROBADA").toUpperCase();
        if (!decision.equals("APROBADA") && !decision.equals("RECHAZADA")) {
            return ResponseEntity.badRequest().body(Map.of("error", "Estado inválido"));
        }
        n.setEstado(decision);
        n.setAprobadoPor(body.getOrDefault("aprobadoPor", "Administrador"));
        n.setFechaRespuesta(LocalDateTime.now());
        n.setUpdatedAt(LocalDateTime.now());
        return ResponseEntity.ok(novedadRepository.save(n));
    }

    /** ADMIN: rechazar una renuncia (decR). */
    @PostMapping("/renuncia/{idRenuncia}/rechazar")
    public ResponseEntity<?> rechazarRenuncia(@PathVariable String idRenuncia) {
        Optional<Renuncia> opt = renunciaRepository.findById(idRenuncia);
        if (opt.isEmpty()) return ResponseEntity.notFound().build();
        Renuncia r = opt.get();
        r.setEstado("RECHAZADA");
        r.setUpdatedAt(LocalDateTime.now());
        return ResponseEntity.ok(renunciaRepository.save(r));
    }

    /** ADMIN: marcar la liquidación como pagada (pagar). */
    @PostMapping("/renuncia/{idRenuncia}/pagar")
    public ResponseEntity<?> pagarLiquidacion(@PathVariable String idRenuncia) {
        Optional<Renuncia> opt = renunciaRepository.findById(idRenuncia);
        if (opt.isEmpty()) return ResponseEntity.notFound().build();
        Renuncia r = opt.get();
        if (!"ACEPTADA".equalsIgnoreCase(r.getEstado())) {
            return ResponseEntity.badRequest().body(Map.of("error", "Solo se puede pagar una renuncia aceptada"));
        }
        r.setEstadoPago("PAGADO");
        r.setFechaPago(LocalDate.now());
        r.setUpdatedAt(LocalDateTime.now());
        return ResponseEntity.ok(renunciaRepository.save(r));
    }

    // ===== 6. LIQUIDACIÓN ESTIMADA =====
    private Map<String, Object> calcularLiquidacion(Long idEmpleado, Renuncia renuncia) {
        Optional<Empleado> optEmp = empleadoRepository.findById(idEmpleado);
        if (optEmp.isEmpty()) return Map.of();

        Empleado emp = optEmp.get();
        double salarioBase = emp.getSalarioBase() != null ? emp.getSalarioBase() : 0.0;

        LocalDate inicio = emp.getFechaInicioContrato() != null ? emp.getFechaInicioContrato()
                : (emp.getFechaCreacion() != null ? emp.getFechaCreacion() : LocalDate.now().minusMonths(12));
        LocalDate fin = renuncia.getFechaAceptacion() != null ? renuncia.getFechaAceptacion() : LocalDate.now();
        long dias = Math.max(0, ChronoUnit.DAYS.between(inicio, fin));

        double salarioDiario = salarioBase / 30.0;
        double cesantias = salarioDiario * dias;                    // 1 mes por año
        double interesesCesantias = cesantias * 0.12 * (dias / 360.0); // 12% EA
        double prima = salarioBase * dias / 360.0;                  // prima semestral
        double vacaciones = salarioBase * dias / 720.0;             // 15 días por año
        double total = cesantias + interesesCesantias + prima + vacaciones;

        Map<String, Object> liq = new LinkedHashMap<>();
        liq.put("diasTrabajados", dias);
        liq.put("salarioBase", salarioBase);
        liq.put("cesantias", Math.round(cesantias * 100.0) / 100.0);
        liq.put("interesesCesantias", Math.round(interesesCesantias * 100.0) / 100.0);
        liq.put("prima", Math.round(prima * 100.0) / 100.0);
        liq.put("vacaciones", Math.round(vacaciones * 100.0) / 100.0);
        liq.put("total", Math.round(total * 100.0) / 100.0);
        return liq;
    }

    // ===== Carta autogenerada =====
    private String generarCarta(Empleado emp, String motivo, String nombreEmpresa) {
        LocalDate hoy = LocalDate.now();
        String[] meses = {"enero","febrero","marzo","abril","mayo","junio",
                "julio","agosto","septiembre","octubre","noviembre","diciembre"};
        String fecha = hoy.getDayOfMonth() + " de " + meses[hoy.getMonthValue() - 1] + " de " + hoy.getYear();
        String nombre = emp.getNombre() + " " + emp.getApellido();

        return "CARTA DE RENUNCIA\n\n" + fecha + "\n\n" +
                "Señor(a)\n" + nombreEmpresa + "\nPresente.\n\n" +
                "Por medio de la presente, yo, " + nombre +
                ", identificado(a) con cédula " + emp.getNumeroDocumento() +
                ", ocupando actualmente el cargo de " +
                (emp.getCargo() != null ? emp.getCargo() : "empleado") +
                ", comunico formalmente mi decisión de renunciar al cargo que desempeño en la empresa, por motivos de " +
                motivo + ".\n\n" +
                "Agradezco sinceramente la oportunidad, la confianza depositada en mí y la experiencia adquirida durante mi tiempo en la empresa. " +
                "Estoy disponible para realizar el proceso de entrega de responsabilidades y facilitar una transición ordenada.\n\n" +
                "Atentamente,\n\n" +
                nombre + "\n" +
                (emp.getCargo() != null ? emp.getCargo() : "");
    }
}
