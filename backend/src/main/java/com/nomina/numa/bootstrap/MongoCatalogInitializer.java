package com.nomina.numa.bootstrap;

import com.nomina.numa.model.mongo.ConceptoNomina;
import com.nomina.numa.model.mongo.Contratacion;
import com.nomina.numa.model.mongo.DetallePago;
import com.nomina.numa.model.mongo.Novedad;
import com.nomina.numa.model.mongo.Rol;
import com.nomina.numa.model.mongo.TipoContrato;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.stereotype.Component;

import java.util.Arrays;
import java.util.HashSet;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Slf4j
@Component
@RequiredArgsConstructor
public class MongoCatalogInitializer {

    private static final Map<String, String> TIPO_CONTRATO_DESCRIPCIONES = Map.of(
            "INDEFINIDO", "Contrato indefinido",
            "APRENDIZAJE", "Contrato de aprendizaje",
            "FIJO", "Contrato fijo",
            "TERMINO_FIJO", "Contrato a término fijo",
            "OBRA_LABOR", "Contrato por obra o labor",
            "PRESTACION_SERVICIOS", "Contrato de prestación de servicios");

    private static final Map<String, ConceptoDefinicion> CONCEPTOS = Map.of(
            "SUELDO_BASE", new ConceptoDefinicion("Sueldo base", "DEVENGADO"),
            "HORAS_EXTRAS", new ConceptoDefinicion("Horas extras", "DEVENGADO"),
            "AUXILIO_TRANSPORTE", new ConceptoDefinicion("Auxilio de transporte", "DEVENGADO"),
            "BONO", new ConceptoDefinicion("Bono", "DEVENGADO"),
            "BONIFICACION", new ConceptoDefinicion("Bonificación", "DEVENGADO"),
            "COMISION", new ConceptoDefinicion("Comisión", "DEVENGADO"),
            "PRESTAMO", new ConceptoDefinicion("Préstamo", "DEDUCCION"),
            "EMBARGO", new ConceptoDefinicion("Embargo judicial", "DEDUCCION"),
            "EMBARGO JUDICIAL", new ConceptoDefinicion("Embargo judicial", "DEDUCCION"),
            "INCAPACIDAD", new ConceptoDefinicion("Incapacidad", "DEDUCCION"));

    private static final List<RolDefinicion> ROLES = List.of(
            new RolDefinicion("ADMIN", "Administrador del sistema"),
            new RolDefinicion("EMPLEADO", "Usuario empleado"),
            new RolDefinicion("CONTADOR", "Usuario contador"),
            new RolDefinicion("USER", "Usuario registrado"));

    private final MongoTemplate mongoTemplate;

    @EventListener(ApplicationReadyEvent.class)
    public void initializeMissingCatalogs() {
        int rolesAdded = initializeRoles();
        int contractTypesAdded = initializeContractTypes();
        int conceptsAdded = initializeConcepts();
        log.info("Catálogos Mongo revisados: roles agregados={}, tipos de contrato agregados={}, "
                        + "conceptos agregados={}",
                rolesAdded, contractTypesAdded, conceptsAdded);
    }

    private int initializeRoles() {
        Set<String> existing = mongoTemplate.findAll(Rol.class).stream()
                .map(Rol::getRol)
                .filter(value -> value != null && !value.isBlank())
                .collect(Collectors.toCollection(HashSet::new));

        int added = 0;
        for (RolDefinicion definition : ROLES) {
            if (existing.add(definition.codigo())) {
                mongoTemplate.save(Rol.builder()
                        .rol(definition.codigo())
                        .descripcion(definition.descripcion())
                        .activo(true)
                        .build());
                added++;
            }
        }
        return added;
    }

    private int initializeContractTypes() {
        Set<String> existing = mongoTemplate.findAll(TipoContrato.class).stream()
                .map(TipoContrato::getTipoContrato)
                .filter(value -> value != null && !value.isBlank())
                .collect(Collectors.toCollection(HashSet::new));

        int added = 0;
        for (String code : distinctValues("idTipoContrato", Contratacion.class)) {
            if (existing.add(code)) {
                mongoTemplate.save(TipoContrato.builder()
                        .tipoContrato(code)
                        .descripcion(TIPO_CONTRATO_DESCRIPCIONES.getOrDefault(code, humanize(code)))
                        .activo(true)
                        .build());
                added++;
            }
        }
        return added;
    }

    private int initializeConcepts() {
        Set<String> existing = mongoTemplate.findAll(ConceptoNomina.class).stream()
                .map(ConceptoNomina::getNombreConcepto)
                .filter(value -> value != null && !value.isBlank())
                .collect(Collectors.toCollection(HashSet::new));

        Set<String> usedCodes = new LinkedHashSet<>();
        usedCodes.addAll(distinctValues("tipoConcepto", DetallePago.class));
        usedCodes.addAll(distinctValues("tipoNovedad", Novedad.class));

        int added = 0;
        for (String code : usedCodes) {
            ConceptoDefinicion definition = CONCEPTOS.get(code);
            if (definition == null) {
                log.warn("Concepto Mongo sin clasificación configurada; se omite del catálogo: {}", code);
                continue;
            }
            if (existing.add(definition.nombre())) {
                mongoTemplate.save(ConceptoNomina.builder()
                        .nombreConcepto(definition.nombre())
                        .tipoConcepto(definition.tipo())
                        .activo(true)
                        .build());
                added++;
            }
        }
        return added;
    }

    private <T> List<String> distinctValues(String field, Class<T> entityType) {
        return mongoTemplate.findDistinct(field, entityType, String.class).stream()
                .filter(value -> value != null && !value.isBlank())
                .distinct()
                .sorted()
                .toList();
    }

    private static String humanize(String code) {
        return Arrays.stream(code.toLowerCase(Locale.ROOT).split("_"))
                .map(word -> Character.toUpperCase(word.charAt(0)) + word.substring(1))
                .collect(Collectors.joining(" "));
    }

    private record RolDefinicion(String codigo, String descripcion) {
    }

    private record ConceptoDefinicion(String nombre, String tipo) {
    }
}
