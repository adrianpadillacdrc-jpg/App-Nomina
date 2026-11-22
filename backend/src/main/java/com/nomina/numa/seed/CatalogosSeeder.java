package com.nomina.numa.seed;

import com.nomina.numa.model.postgres.*;
import com.nomina.numa.repository.jpa.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;

/**
 * Pobla los catálogos y datos iniciales en PostgreSQL al arrancar la aplicación
 * (equivalente del antiguo MongoCollectionInitializer tras la migración a JPA).
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class CatalogosSeeder {

    private final RolRepository rolRepository;
    private final TipoContratoRepository tipoContratoRepository;
    private final ConceptoNominaRepository conceptoNominaRepository;
    private final EmpleadoRepository empleadoRepository;
    private final CargoRepository cargoRepository;
    private final UsuarioRepository usuarioRepository;
    private final PasswordEncoder passwordEncoder;

    @EventListener(ApplicationReadyEvent.class)
    @Transactional
    public void poblarCatalogos() {
        poblarRoles();
        poblarTipoContrato();
        poblarConceptosNomina();
        poblarCargosYEmpleados();
        poblarUsuarioAdmin();
    }

    private void poblarRoles() {
        if (rolRepository.count() > 0)
            return;
        log.info("Poblando roles iniciales");
        rolRepository.saveAll(List.of(
                Rol.builder().rol("ADMIN").descripcion("Administrador del sistema").activo(true).build(),
                Rol.builder().rol("CONTADOR").descripcion("Contador con acceso a nómina").activo(true).build(),
                Rol.builder().rol("EMPLEADO").descripcion("Empleado con portal de autogestión").activo(true).build()));
    }

    private void poblarTipoContrato() {
        if (tipoContratoRepository.count() > 0)
            return;
        log.info("Poblando tipos de contrato iniciales");
        tipoContratoRepository.saveAll(List.of(
                TipoContrato.builder().tipoContrato("FIJO").descripcion("Contrato a término fijo").activo(true).build(),
                TipoContrato.builder().tipoContrato("INDEFINIDO").descripcion("Contrato a término indefinido")
                        .activo(true).build(),
                TipoContrato.builder().tipoContrato("APRENDIZAJE").descripcion("Contrato de aprendizaje (SENA)")
                        .activo(true).build()));
    }

    private void poblarConceptosNomina() {
        if (conceptoNominaRepository.count() > 0)
            return;
        log.info("Poblando conceptos de nómina iniciales");
        conceptoNominaRepository.saveAll(List.of(
                ConceptoNomina.builder().nombreConcepto("Sueldo Base").tipoConcepto("DEVENGADO").activo(true).build(),
                ConceptoNomina.builder().nombreConcepto("Auxilio de Transporte").tipoConcepto("DEVENGADO").activo(true)
                        .build(),
                ConceptoNomina.builder().nombreConcepto("Horas Extras").tipoConcepto("DEVENGADO").activo(true).build(),
                ConceptoNomina.builder().nombreConcepto("Bono").tipoConcepto("DEVENGADO").activo(true).build(),
                ConceptoNomina.builder().nombreConcepto("Salud Trabajador").tipoConcepto("DEDUCCION").activo(true)
                        .build(),
                ConceptoNomina.builder().nombreConcepto("Pensión Trabajador").tipoConcepto("DEDUCCION").activo(true)
                        .build(),
                ConceptoNomina.builder().nombreConcepto("Prestamo").tipoConcepto("DEDUCCION").activo(true).build()));
    }

    private void poblarCargosYEmpleados() {
        if (cargoRepository.count() > 0)
            return;
        log.info("Poblando cargos iniciales");
        List<Cargo> cargos = cargoRepository.saveAll(List.of(
                Cargo.builder().cargo("Desarrollador").salario(3_500_000.0).activo(true).build(),
                Cargo.builder().cargo("Contador").salario(4_200_000.0).activo(true).build(),
                Cargo.builder().cargo("Vendedor").salario(2_500_000.0).activo(true).build(),
                Cargo.builder().cargo("Recepcionista").salario(2_200_000.0).activo(true).build()));

        if (empleadoRepository.count() == 0) {
            log.info("Poblando empleados de ejemplo");
            LocalDate hoy = LocalDate.now();
            empleadoRepository.saveAll(List.of(
                    Empleado.builder()
                            .nombre("Juan").apellido("Pérez").tipoDocumento("CC").numeroDocumento("103020301")
                            .correo("juan.perez@numa.co").direccion("Calle 10 #20-30").genero("MASCULINO")
                            .idCargo(cargos.get(0).getId()).cargo("Desarrollador").salarioBase(3_500_000.0)
                            .tasaArl(2.635).modalidadTrabajo("PRESENCIAL").transporteSuministrado(true)
                            .metodoPago("TRANSFERENCIA").banco("BANCOLOMBIA").tipoCuenta("AHORROS")
                            .numeroCuenta("40012345678").idEmpresa(1L).estado("ACTIVO")
                            .fechaInicioContrato(hoy.minusMonths(6)).fechaCreacion(hoy.minusMonths(6))
                            .build(),
                    Empleado.builder()
                            .nombre("María").apellido("Gómez").tipoDocumento("CC").numeroDocumento("104020402")
                            .correo("maria.gomez@numa.co").direccion("Carrera 15 #30-45").genero("FEMENINO")
                            .idCargo(cargos.get(1).getId()).cargo("Contador").salarioBase(4_200_000.0)
                            .tasaArl(2.635).modalidadTrabajo("REMOTO")
                            .metodoPago("TRANSFERENCIA").banco("DAVIVIENDA").tipoCuenta("AHORROS")
                            .numeroCuenta("50012345678").idEmpresa(1L).estado("ACTIVO")
                            .fechaInicioContrato(hoy.minusYears(1)).fechaCreacion(hoy.minusYears(1))
                            .build(),
                    Empleado.builder()
                            .nombre("Carlos").apellido("Ramírez").tipoDocumento("CC").numeroDocumento("105020503")
                            .correo("carlos.ramirez@numa.co").direccion("Calle 45 #60-80").genero("MASCULINO")
                            .idCargo(cargos.get(2).getId()).cargo("Vendedor").salarioBase(2_500_000.0)
                            .tasaArl(4.350).modalidadTrabajo("PRESENCIAL").transporteSuministrado(false)
                            .metodoPago("TRANSFERENCIA").banco("BANCOLOMBIA").tipoCuenta("CORRIENTE")
                            .numeroCuenta("60012345678").idEmpresa(1L).estado("ACTIVO")
                            .fechaInicioContrato(hoy.minusMonths(3)).fechaCreacion(hoy.minusMonths(3))
                            .build()));
        }
    }

    private void poblarUsuarioAdmin() {
        log.info("Verificando usuarios base del sistema (admin y empleado)");
        crearOActualizarUsuario("admin@numa.co", "admin123", "ADMIN", "Administrador Numa");
        crearOActualizarUsuario("admin@numa.com", "admin123", "ADMIN", "Administrador Numa");
        crearOActualizarUsuario("empleado@numa.co", "admin123", "EMPLEADO", "Empleado Numa");
        crearOActualizarUsuario("empleado@numa.com", "admin123", "EMPLEADO", "Empleado Numa");
    }

    private void crearOActualizarUsuario(String correo, String contrasenaPlana, String rol, String nombre) {
        java.util.Optional<Usuario> existente = usuarioRepository.findByCorreo(correo);
        if (existente.isPresent()) {
            Usuario u = existente.get();
            u.setContrasena(passwordEncoder.encode(contrasenaPlana));
            u.setRol(rol);
            u.setActivo(true);
            usuarioRepository.save(u);
        } else {
            usuarioRepository.save(Usuario.builder()
                    .correo(correo)
                    .contrasena(passwordEncoder.encode(contrasenaPlana))
                    .rol(rol)
                    .nombre(nombre)
                    .activo(true)
                    .build());
        }
    }
}
