package com.nomina.numa.service;

import com.nomina.numa.model.postgres.Contratacion;
import com.nomina.numa.model.postgres.Empleado;
import com.nomina.numa.model.postgres.FirmaContratoCodigo;
import com.nomina.numa.repository.jpa.ContratacionRepository;
import com.nomina.numa.repository.jpa.EmpleadoRepository;
import com.nomina.numa.repository.jpa.FirmaContratoCodigoRepository;
import com.nomina.numa.util.EstadoNominaCompat;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Slf4j
@Service
@RequiredArgsConstructor
public class ContratacionService {
    private final ContratacionRepository repo;
    private final FirmaContratoCodigoRepository firmaRepo;
    private final EmpleadoRepository empleadoRepo;
    private final EmailService emailService;
    private final PasswordEncoder passwordEncoder;

    public List<Contratacion> findByEmpleado(Long idEmpleado) {  // ← Cambiar a Long
        return repo.findByIdEmpleado(idEmpleado);
    }

    public List<Contratacion> findAll() {
        return repo.findAll();
    }

    public Contratacion save(Contratacion contratacion) {
        if (contratacion.getEstado() == null || contratacion.getEstado().isBlank()) {
            contratacion.setEstado("VIGENTE");
        } else {
            contratacion.setEstado(EstadoNominaCompat.normalizar(contratacion.getEstado()));
        }
        return repo.save(contratacion);
    }

    public Contratacion updateEstado(Long id, String estado) {
        Optional<Contratacion> contratoOpt = repo.findById(id);
        if (contratoOpt.isPresent()) {
            Contratacion contrato = contratoOpt.get();
            contrato.setEstado(EstadoNominaCompat.normalizar(estado));
            return repo.save(contrato);
        }
        throw new RuntimeException("Contrato no encontrado con id: " + id);
    }

    public Optional<Contratacion> findById(Long id) {
        return repo.findById(id);
    }

    public Contratacion guardarFirmaEmpleado(Long id, String firma) {
        Contratacion contrato = repo.findById(id)
                .orElseThrow(() -> new RuntimeException("Contrato no encontrado con id: " + id));
        contrato.setFirmaEmpleado(firma);
        contrato.setFechaFirmaEmpleado(java.time.LocalDate.now());
        return repo.save(contrato);
    }

    public Contratacion guardarFirmaEmpleador(Long id, String firma) {
        Contratacion contrato = repo.findById(id)
                .orElseThrow(() -> new RuntimeException("Contrato no encontrado con id: " + id));
        contrato.setFirmaEmpleador(firma);
        contrato.setFechaFirmaEmpleador(java.time.LocalDate.now());
        return repo.save(contrato);
    }

    @Transactional
    public Map<String, Object> solicitarCodigoFirma(Long idContratacion) {
        Contratacion contrato = repo.findById(idContratacion)
                .orElseThrow(() -> new RuntimeException("Contrato no encontrado con id: " + idContratacion));

        Empleado empleado = empleadoRepo.findById(contrato.getIdEmpleado())
                .orElseThrow(() -> new RuntimeException("Empleado no encontrado con id: " + contrato.getIdEmpleado()));

        String correo = empleado.getCorreo();
        if (correo == null || correo.isBlank()) {
            throw new RuntimeException("El empleado no tiene un correo electrónico registrado.");
        }

        SecureRandom random = new SecureRandom();
        String pin = String.format("%06d", random.nextInt(1_000_000));

        FirmaContratoCodigo registro = firmaRepo.findByIdContratacion(idContratacion)
                .orElseGet(FirmaContratoCodigo::new);

        registro.setIdContratacion(idContratacion);
        registro.setIdEmpleado(empleado.getId());
        registro.setCorreoDestinatario(correo);
        registro.setCodigoHash(passwordEncoder.encode(pin));
        registro.setExpiraEn(LocalDateTime.now().plusHours(24));
        registro.setIntentos(0);

        firmaRepo.save(registro);

        boolean correoEnviado = emailService.enviarCodigoFirmaContrato(correo, empleado.getNombre(), pin);

        String correoEnmascarado = enmascararCorreo(correo);

        Map<String, Object> resp = new HashMap<>();
        resp.put("exito", true);
        resp.put("correoEnviado", correoEnviado);
        resp.put("correoEnmascarado", correoEnmascarado);
        resp.put("mensaje", correoEnviado
                ? "Código enviado exitosamente a " + correoEnmascarado
                : "Código generado (ver en consola si falta configurar SMTP). Enviado a: " + correoEnmascarado);
        return resp;
    }

    @Transactional
    public Contratacion verificarYFirmarContrato(Long idContratacion, String codigoIngresado, String firmaBase64) {
        if (codigoIngresado == null || codigoIngresado.trim().isEmpty()) {
            throw new RuntimeException("Debes ingresar el código de verificación.");
        }

        FirmaContratoCodigo reg = firmaRepo.findByIdContratacion(idContratacion)
                .orElseThrow(() -> new RuntimeException("No hay una solicitud de firma activa para este contrato. Solicita un código primero."));

        if (reg.getIntentos() != null && reg.getIntentos() >= 3) {
            throw new RuntimeException("Código bloqueado por superar 3 intentos fallidos. Solicita un nuevo código.");
        }

        if (reg.getExpiraEn() != null && LocalDateTime.now().isAfter(reg.getExpiraEn())) {
            throw new RuntimeException("El código de verificación ha expirado. Por favor solicita uno nuevo.");
        }

        if (!passwordEncoder.matches(codigoIngresado.trim(), reg.getCodigoHash())) {
            int intentos = (reg.getIntentos() != null ? reg.getIntentos() : 0) + 1;
            reg.setIntentos(intentos);
            firmaRepo.save(reg);
            int restantes = Math.max(0, 3 - intentos);
            if (restantes == 0) {
                throw new RuntimeException("Código incorrecto. Has superado el límite de 3 intentos. Solicita un nuevo código.");
            }
            throw new RuntimeException("Código incorrecto. Te quedan " + restantes + " intento(s).");
        }

        Contratacion contrato = repo.findById(idContratacion)
                .orElseThrow(() -> new RuntimeException("Contrato no encontrado con id: " + idContratacion));

        String marcaFirma = (firmaBase64 != null && !firmaBase64.isBlank()) 
                ? firmaBase64 
                : "FIRMADO_ELECTRONICAMENTE_OTP:" + reg.getCorreoDestinatario() + ":" + LocalDateTime.now();

        contrato.setFirmaEmpleado(marcaFirma);
        contrato.setFechaFirmaEmpleado(LocalDate.now());
        contrato.setEstado("VIGENTE");
        Contratacion guardado = repo.save(contrato);

        empleadoRepo.findById(contrato.getIdEmpleado()).ifPresent(emp -> {
            if (firmaBase64 != null && !firmaBase64.isBlank()) {
                emp.setFirmaDigital(firmaBase64);
                empleadoRepo.save(emp);
            }
        });

        firmaRepo.delete(reg);

        return guardado;
    }

    private String enmascararCorreo(String correo) {
        if (correo == null || !correo.contains("@")) return correo;
        int atIndex = correo.indexOf('@');
        String name = correo.substring(0, atIndex);
        String domain = correo.substring(atIndex);
        if (name.length() <= 2) {
            return name.charAt(0) + "***" + domain;
        }
        return name.charAt(0) + "***" + name.charAt(name.length() - 1) + domain;
    }
}