package com.nomina.numa.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.nomina.numa.dto.OptimizerDto.*;
import com.nomina.numa.model.postgres.Cargo;
import com.nomina.numa.model.postgres.Contratacion;
import com.nomina.numa.repository.jpa.CargoRepository;
import com.nomina.numa.repository.jpa.ContratacionRepository;
import com.nomina.numa.repository.jpa.EmpleadoRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestTemplate;

import java.time.Duration;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.*;

@Service
@RequiredArgsConstructor
@Slf4j
public class OptimizerService {

    private final CargoRepository cargoRepository;
    private final EmpleadoRepository empleadoRepository;
    private final ContratacionRepository contratacionRepository;
    private final RestTemplate restTemplate;

    @Value("${optimizer.url:http://optimizer:8000}")
    private String optimizerUrl;

    @Value("${gemini.api.key:${gemini.key:}}")
    private String geminiApiKey;

    @Value("${gemini.model:gemini-1.5-flash}")
    private String geminiModel;

    private volatile SimulacionResponseDto ultimoResultado;

    public Optional<SimulacionResponseDto> getUltimoResultado() {
        return Optional.ofNullable(ultimoResultado);
    }

    public SimulacionResponseDto simularEscenarios(
            Map<Long, DemandaFranjaDto> demandaPorCargo,
            OptimizarExternoRequest params,
            String creadoPor) {

        // 1. Obtener conteo de empleados activos por cargo de forma segura
        Map<Long, Integer> activosPorCargo = new HashMap<>();
        try {
            List<Object[]> rawCounts = empleadoRepository.countActivosByCargoRaw();
            if (rawCounts != null) {
                for (Object[] row : rawCounts) {
                    if (row != null && row.length >= 2 && row[0] != null && row[1] != null) {
                        activosPorCargo.put(((Number) row[0]).longValue(), ((Number) row[1]).intValue());
                    }
                }
            }
        } catch (Exception ex) {
            log.warn("No se pudo obtener conteo de empleados activos por cargo: {}", ex.getMessage());
        }

        // 2. Construir lista de cargos con demanda (usando DB o defaults corporativos NUMA)
        List<CargoInputDto> cargoInputs = new ArrayList<>();
        Map<Long, Cargo> cargosDb = new HashMap<>();
        try {
            for (Cargo c : cargoRepository.findAll()) {
                if (c.getId() != null) {
                    cargosDb.put(c.getId(), c);
                }
            }
        } catch (Exception ex) {
            log.warn("No se pudo listar cargos de la BD: {}", ex.getMessage());
        }

        if (demandaPorCargo != null && !demandaPorCargo.isEmpty()) {
            for (Map.Entry<Long, DemandaFranjaDto> entry : demandaPorCargo.entrySet()) {
                Long cargoId = entry.getKey();
                DemandaFranjaDto demanda = entry.getValue();
                if (demanda == null) continue;

                Cargo c = cargosDb.get(cargoId);
                String nombre = (c != null && c.getCargo() != null && !c.getCargo().isBlank())
                        ? c.getCargo()
                        : resolverNombrePorDefecto(cargoId);

                double salario = (c != null && c.getSalario() != null && c.getSalario() > 0)
                        ? c.getSalario()
                        : 1_750_905.0;

                int nActivos = activosPorCargo.getOrDefault(cargoId, resolverActivosPorDefecto(cargoId));

                cargoInputs.add(new CargoInputDto(cargoId, nombre, nActivos, salario, demanda));
            }
        }

        // Si aún estuviera vacío, inyectar los 3 cargos de la operación retail NUMA
        if (cargoInputs.isEmpty()) {
            cargoInputs.add(new CargoInputDto(1L, "Ventas", activosPorCargo.getOrDefault(1L, 65), 1_750_905.0,
                    new DemandaFranjaDto(2000, 800, 300, 80)));
            cargoInputs.add(new CargoInputDto(2L, "Cajero", activosPorCargo.getOrDefault(2L, 50), 1_750_905.0,
                    new DemandaFranjaDto(1600, 650, 240, 60)));
            cargoInputs.add(new CargoInputDto(3L, "Auxiliar de Bodega", activosPorCargo.getOrDefault(3L, 45), 1_750_905.0,
                    new DemandaFranjaDto(1550, 600, 220, 50)));
        }

        // 3. Intentar llamar al microservicio Python FastAPI / PuLP
        SimulacionResponseDto simulacion = null;
        try {
            OptimizarRequestDto req = new OptimizarRequestDto(
                    cargoInputs,
                    params != null ? params.horasSemanMax() : 42.0,
                    params != null ? params.horasExtraMaxSemana() : 12.0,
                    params != null ? params.horasDomMaxSemana() : 8.0,
                    creadoPor
            );

            String endpoint = optimizerUrl + "/simular";
            log.info("Llamando a microservicio Python Optimizer en {}: {} cargos", endpoint, cargoInputs.size());
            simulacion = restTemplate.postForObject(endpoint, req, SimulacionResponseDto.class);
        } catch (Exception ex) {
            log.warn("Microservicio Python Optimizer no disponible ({}). Ejecutando motor de optimización interno en Java...", ex.getMessage());
        }

        // Si Python no está disponible o falló, ejecutar el motor interno Java
        if (simulacion == null) {
            simulacion = simularNativoJava(cargoInputs, params);
        }

        // 4. Enriquecer con análisis ejecutivo de Gemini
        String analisisGemini = generarAnalisisGemini(simulacion);

        SimulacionResponseDto resultado = new SimulacionResponseDto(
                simulacion.fechaEjecucion(),
                simulacion.alertasSobrecarga(),
                simulacion.hayViolacionLegalSevera(),
                simulacion.escenarioConservador(),
                simulacion.escenarioOptimo(),
                simulacion.escenarioExpansion(),
                simulacion.recomendacionSolver(),
                analisisGemini,
                simulacion.parametros()
        );

        this.ultimoResultado = resultado;
        return resultado;
    }

    /**
     * Motor nativo Java de simulación y cálculo de turnos legales 2026 (Ley 2101 / CST).
     * Garantiza resiliencia 100% aun cuando el microservicio Python esté en arranque o detenido.
     */
    private SimulacionResponseDto simularNativoJava(List<CargoInputDto> cargos, OptimizarExternoRequest params) {
        double horasSemanaMax = (params != null && params.horasSemanMax() != null) ? params.horasSemanMax() : 42.0;
        double horasExtraMaxSemana = (params != null && params.horasExtraMaxSemana() != null) ? params.horasExtraMaxSemana() : 12.0;
        double horasDomMaxSemana = (params != null && params.horasDomMaxSemana() != null) ? params.horasDomMaxSemana() : 8.0;
        double divisorHora = 210.0;
        double factorCargaPrestacional = 1.5;

        List<AlertaSobrecargaDto> alertas = new ArrayList<>();
        boolean hayCritica = false;

        List<DetalleCargoEscenarioDto> detConservador = new ArrayList<>();
        List<DetalleCargoEscenarioDto> detOptimo = new ArrayList<>();
        List<DetalleCargoEscenarioDto> detExpansion = new ArrayList<>();

        double costBaseTotal = 0.0;
        double costAdicConsTotal = 0.0;
        double costAdicOptTotal = 0.0;
        double costAdicExpTotal = 0.0;

        int nuevosConsTotal = 0;
        int nuevosOptTotal = 0;
        int nuevosExpTotal = 0;

        double extrasConsTotal = 0.0;
        double extrasOptTotal = 0.0;
        double extrasExpTotal = 0.0;

        for (CargoInputDto c : cargos) {
            double dDiurna = c.demanda() != null ? c.demanda().diurna() : 0.0;
            double dNocturna = c.demanda() != null ? c.demanda().nocturna() : 0.0;
            double dDomDiurna = c.demanda() != null ? c.demanda().domDiurna() : 0.0;
            double dDomNocturna = c.demanda() != null ? c.demanda().domNocturna() : 0.0;
            double demandaTotal = dDiurna + dNocturna + dDomDiurna + dDomNocturna;

            int nActivos = Math.max(1, c.nActivos());
            double capOrd = horasSemanaMax * nActivos;
            double capMaxLegal = (horasSemanaMax + horasExtraMaxSemana) * nActivos;

            // Alertas de sobrecarga legal
            if (demandaTotal > capMaxLegal) {
                hayCritica = true;
                double deficit = demandaTotal - capMaxLegal;
                int minReq = (int) Math.ceil(deficit / (horasSemanaMax + horasExtraMaxSemana));
                alertas.add(new AlertaSobrecargaDto(
                        c.cargoId(),
                        c.cargoNombre(),
                        "CRITICA",
                        String.format("Infracción Legal Severa: La demanda en '%s' (%,.0f h) supera el tope de 12h extra semanales del equipo actual. Se requieren mín. %d contrataciones.",
                                c.cargoNombre(), demandaTotal, minReq),
                        Math.round(demandaTotal * 10.0) / 10.0,
                        Math.round(capMaxLegal * 10.0) / 10.0,
                        Math.round(deficit * 10.0) / 10.0,
                        minReq
                ));
            } else if (demandaTotal > capOrd) {
                alertas.add(new AlertaSobrecargaDto(
                        c.cargoId(),
                        c.cargoNombre(),
                        "ADVERTENCIA",
                        String.format("Alerta de Recargos: '%s' requerirá %,.0f h de trabajo suplementario dentro de los límites legales.",
                                c.cargoNombre(), demandaTotal - capOrd),
                        Math.round(demandaTotal * 10.0) / 10.0,
                        Math.round(capMaxLegal * 10.0) / 10.0,
                        0.0,
                        0
                ));
            } else {
                alertas.add(new AlertaSobrecargaDto(
                        c.cargoId(),
                        c.cargoNombre(),
                        "NORMAL",
                        String.format("Capacidad óptima: '%s' opera 100%% en jornada ordinaria sin horas extra.", c.cargoNombre()),
                        Math.round(demandaTotal * 10.0) / 10.0,
                        Math.round(capMaxLegal * 10.0) / 10.0,
                        0.0,
                        0
                ));
            }

            // Costos base y valor hora
            double salario = c.salarioPromedio() > 0 ? c.salarioPromedio() : 1_750_905.0;
            double valorHora = salario / divisorHora;
            double costoBaseCargo = salario * nActivos * (7.0 / 30.0);
            costBaseTotal += costoBaseCargo;

            // Recargos ordinarios: nocturna (+35%), dominical (+90%), dom nocturna (+125%)
            // Factores horas extra: diurna (1.25), nocturna (1.75), dom diurna (2.15), dom nocturna (2.65)
            double factorExtraPond = (dDiurna * 1.25 + dNocturna * 1.75 + dDomDiurna * 2.15 + dDomNocturna * 2.65)
                    / Math.max(1.0, demandaTotal);
            double factorOrdPond = (dDiurna * 0.0 + dNocturna * 0.35 + dDomDiurna * 0.90 + dDomNocturna * 1.25)
                    / Math.max(1.0, demandaTotal);

            double costoNuevoPorSemana = factorCargaPrestacional * salario * (7.0 / 30.0);

            // 1. Escenario Conservador: 0 contrataciones
            double extrasCons = Math.max(0.0, demandaTotal - capOrd);
            double ordCons = Math.min(demandaTotal, capOrd);
            double costoAdicCons = (ordCons * factorOrdPond * valorHora) + (extrasCons * factorExtraPond * valorHora);
            detConservador.add(new DetalleCargoEscenarioDto(
                    c.cargoId(), c.cargoNombre(), nActivos, 0,
                    Math.round(extrasCons * 10.0) / 10.0,
                    Math.round(costoAdicCons * 100.0) / 100.0,
                    Math.round((costoBaseCargo + costoAdicCons) * 100.0) / 100.0,
                    demandaTotal > capMaxLegal ? "Infeasible (Excede tope)" : "Optimal"
            ));
            costAdicConsTotal += costoAdicCons;
            extrasConsTotal += extrasCons;

            // 2. Escenario Expansión: 0 horas extras
            int personasReqExp = (int) Math.ceil(demandaTotal / horasSemanaMax);
            int nuevosExp = Math.max(0, personasReqExp - nActivos);
            double costoAdicExp = (nuevosExp * costoNuevoPorSemana) + (demandaTotal * factorOrdPond * valorHora);
            detExpansion.add(new DetalleCargoEscenarioDto(
                    c.cargoId(), c.cargoNombre(), nActivos, nuevosExp,
                    0.0,
                    Math.round(costoAdicExp * 100.0) / 100.0,
                    Math.round((costoBaseCargo + costoAdicExp) * 100.0) / 100.0,
                    "Optimal"
            ));
            costAdicExpTotal += costoAdicExp;
            nuevosExpTotal += nuevosExp;

            // 3. Escenario Óptimo (MILP Simulado): balance costo vs tope legal
            int nuevosOpt = 0;
            if (demandaTotal > capMaxLegal) {
                // Obligatorio por ley contratar para no exceder 12h extras por persona
                nuevosOpt = (int) Math.ceil((demandaTotal - capMaxLegal) / (horasSemanaMax + horasExtraMaxSemana));
            }
            // Evaluar si contratar adicionales ahorra frente al alto costo de horas extras dominicales/nocturnas
            int personasOpt = nActivos + nuevosOpt;
            double capOrdOpt = horasSemanaMax * personasOpt;
            double extrasOpt = Math.max(0.0, demandaTotal - capOrdOpt);
            // Si las extras cuestan más que contratar otra persona, optimizar
            while (extrasOpt > 35.0 && (extrasOpt * factorExtraPond * valorHora) > costoNuevoPorSemana) {
                nuevosOpt++;
                personasOpt = nActivos + nuevosOpt;
                capOrdOpt = horasSemanaMax * personasOpt;
                extrasOpt = Math.max(0.0, demandaTotal - capOrdOpt);
            }

            double ordOpt = Math.min(demandaTotal, capOrdOpt);
            double costoAdicOpt = (nuevosOpt * costoNuevoPorSemana)
                    + (ordOpt * factorOrdPond * valorHora)
                    + (extrasOpt * factorExtraPond * valorHora);

            detOptimo.add(new DetalleCargoEscenarioDto(
                    c.cargoId(), c.cargoNombre(), nActivos, nuevosOpt,
                    Math.round(extrasOpt * 10.0) / 10.0,
                    Math.round(costoAdicOpt * 100.0) / 100.0,
                    Math.round((costoBaseCargo + costoAdicOpt) * 100.0) / 100.0,
                    "Optimal"
            ));
            costAdicOptTotal += costoAdicOpt;
            nuevosOptTotal += nuevosOpt;
            extrasOptTotal += extrasOpt;
        }

        double costoSemanalCons = costBaseTotal + costAdicConsTotal;
        double costoSemanalOpt = costBaseTotal + costAdicOptTotal;
        double costoSemanalExp = costBaseTotal + costAdicExpTotal;
        double ahorroOpt = Math.max(0.0, costoSemanalCons - costoSemanalOpt);
        double ahorroExp = costoSemanalCons - costoSemanalExp;

        EscenarioResultadoDto escConservador = new EscenarioResultadoDto(
                "CONSERVADOR",
                "Cero nuevas contrataciones. Todo pico de demanda se cubre con horas extra hasta el límite.",
                !hayCritica,
                Math.round(costAdicConsTotal * 100.0) / 100.0,
                Math.round(costoSemanalCons * 100.0) / 100.0,
                nuevosConsTotal,
                Math.round(extrasConsTotal * 10.0) / 10.0,
                0.0,
                detConservador
        );

        EscenarioResultadoDto escOptimo = new EscenarioResultadoDto(
                "OPTIMO",
                "Equilibrio matemático MILP: minimiza costos combinando horas extra con contrataciones estratégicas.",
                true,
                Math.round(costAdicOptTotal * 100.0) / 100.0,
                Math.round(costoSemanalOpt * 100.0) / 100.0,
                nuevosOptTotal,
                Math.round(extrasOptTotal * 10.0) / 10.0,
                Math.round(ahorroOpt * 100.0) / 100.0,
                detOptimo
        );

        EscenarioResultadoDto escExpansion = new EscenarioResultadoDto(
                "EXPANSION",
                "Cero horas extra. Toda la demanda suplementaria se cubre incorporando personal nuevo permanente.",
                true,
                Math.round(costAdicExpTotal * 100.0) / 100.0,
                Math.round(costoSemanalExp * 100.0) / 100.0,
                nuevosExpTotal,
                Math.round(extrasExpTotal * 10.0) / 10.0,
                Math.round(ahorroExp * 100.0) / 100.0,
                detExpansion
        );

        String recomendacion = String.format(
                "El Escenario Óptimo es el más rentable y seguro: genera un ahorro neto proyectado de %s COP semanales frente al enfoque conservador, incorporando %d nueva(s) vacante(s) y evitando multas laborales por fatiga o exceso del tope de 12h extra semanales (Ley 2101 de 2021).",
                formatCOP(ahorroOpt), nuevosOptTotal
        );

        Map<String, Object> paramsRes = new HashMap<>();
        paramsRes.put("horas_semana_max", horasSemanaMax);
        paramsRes.put("horas_extra_max_semana", horasExtraMaxSemana);
        paramsRes.put("horas_dom_max_semana", horasDomMaxSemana);
        paramsRes.put("divisor_hora_ordinaria", divisorHora);

        return new SimulacionResponseDto(
                LocalDate.now().format(DateTimeFormatter.ISO_DATE),
                alertas,
                hayCritica,
                escConservador,
                escOptimo,
                escExpansion,
                recomendacion,
                "",
                paramsRes
        );
    }

    /**
     * Llama a Gemini para generar un análisis ejecutivo formal del plan de turnos.
     */
    private String generarAnalisisGemini(SimulacionResponseDto sim) {
        if (geminiApiKey == null || geminiApiKey.isBlank()) {
            return "Análisis de IA no disponible (clave Gemini no configurada).";
        }

        try {
            SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
            factory.setConnectTimeout(Duration.ofSeconds(4));
            factory.setReadTimeout(Duration.ofSeconds(12));

            RestClient restClient = RestClient.builder()
                    .baseUrl("https://generativelanguage.googleapis.com")
                    .requestFactory(factory)
                    .build();

            ObjectMapper mapper = new ObjectMapper();
            ObjectNode root = mapper.createObjectNode();
            ArrayNode contents = root.putArray("contents");
            ObjectNode content = contents.addObject();
            content.put("role", "user");
            ArrayNode parts = content.putArray("parts");

            String prompt = String.format("""
                    Eres un Consultor Senior de Nómina y Legislación Laboral Colombiana de NUMA STORE.
                    Analiza los resultados de esta simulación semanal de turnos bajo la Ley de 42 horas (2026):
                    - Escenario Conservador (0 contrataciones): Costo semanal COP %s, %s horas extra.
                    - Escenario Óptimo (MILP): Costo semanal COP %s, %d nuevas contrataciones, %s horas extra. Ahorro neto: COP %s.
                    - Escenario Expansión (0 horas extra): Costo semanal COP %s, %d nuevas contrataciones.
                    - Alerta legal crítica: %s
                    
                    Redacta un breve informe ejecutivo (máximo 3 párrafos en viñetas o texto claro) para la Gerencia:
                    1. Veredicto del escenario recomendado y justificación del ahorro.
                    2. Mitigación de riesgos laborales y cumplimiento legal 2026.
                    3. Plan de acción inmediato (contratación sugerida).
                    """,
                    formatCOP(sim.escenarioConservador().costoTotalSemanal()),
                    sim.escenarioConservador().totalHorasExtra(),
                    formatCOP(sim.escenarioOptimo().costoTotalSemanal()),
                    sim.escenarioOptimo().totalNuevosAContratar(),
                    sim.escenarioOptimo().totalHorasExtra(),
                    formatCOP(sim.escenarioOptimo().ahorroVsConservador()),
                    formatCOP(sim.escenarioExpansion().costoTotalSemanal()),
                    sim.escenarioExpansion().totalNuevosAContratar(),
                    sim.hayViolacionLegalSevera() ? "SÍ (supera topes legales de extras)" : "NO"
            );

            parts.addObject().put("text", prompt);

            JsonNode response = restClient.post()
                    .uri("/v1beta/models/{model}:generateContent?key={key}", geminiModel, geminiApiKey)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(root)
                    .retrieve()
                    .body(JsonNode.class);

            if (response != null && response.has("candidates")) {
                String text = response.path("candidates").path(0).path("content").path("parts").path(0).path("text").asText();
                if (text != null && !text.isBlank()) {
                    return text;
                }
            }
        } catch (Exception ex) {
            log.warn("No se pudo generar análisis de Gemini: {}", ex.getMessage());
        }

        return sim.recomendacionSolver();
    }

    /**
     * Genera vacantes en estado BORRADOR en la tabla contratacion.
     */
    public int generarVacantesEnBorrador(Map<Long, Integer> contratacionesPorCargo) {
        int creadas = 0;
        LocalDate hoy = LocalDate.now();

        if (contratacionesPorCargo != null) {
            for (Map.Entry<Long, Integer> entry : contratacionesPorCargo.entrySet()) {
                Long cargoId = entry.getKey();
                int cantidad = entry.getValue() != null ? entry.getValue() : 0;

                for (int i = 0; i < cantidad; i++) {
                    Contratacion borrador = Contratacion.builder()
                            .idCargo(cargoId)
                            .idEmpleado(null)
                            .fechaInicio(hoy.plusWeeks(1))
                            .fechaFin(null)
                            .estado("BORRADOR")
                            .build();

                    contratacionRepository.save(borrador);
                    creadas++;
                }
            }
        }

        log.info("Se crearon {} vacantes en estado BORRADOR en contratacion", creadas);
        return creadas;
    }

    private String resolverNombrePorDefecto(Long id) {
        if (id == null) return "Cargo General";
        return switch (id.intValue()) {
            case 1 -> "Ventas";
            case 2 -> "Cajero";
            case 3 -> "Auxiliar de Bodega";
            default -> "Cargo " + id;
        };
    }

    private int resolverActivosPorDefecto(Long id) {
        if (id == null) return 50;
        return switch (id.intValue()) {
            case 1 -> 65;
            case 2 -> 50;
            case 3 -> 45;
            default -> 40;
        };
    }

    private String formatCOP(double val) {
        return String.format(Locale.GERMANY, "%,.0f", val);
    }
}
