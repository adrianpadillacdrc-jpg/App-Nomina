package com.nomina.numa.dto;

import java.util.List;
import java.util.Map;
import com.fasterxml.jackson.annotation.JsonProperty;

public class OptimizerDto {

    public record DemandaFranjaDto(
            double diurna,
            double nocturna,
            @JsonProperty("dom_diurna")  double domDiurna,
            @JsonProperty("dom_nocturna") double domNocturna
    ) {}

    public record CargoInputDto(
            @JsonProperty("cargo_id")        long cargoId,
            @JsonProperty("cargo_nombre")    String cargoNombre,
            @JsonProperty("n_activos")       int nActivos,
            @JsonProperty("salario_promedio") double salarioPromedio,
            DemandaFranjaDto demanda
    ) {}

    public record OptimizarRequestDto(
            List<CargoInputDto> cargos,
            @JsonProperty("horas_semana_max")       Double horasSemanMax,
            @JsonProperty("horas_extra_max_semana") Double horasExtraMaxSemana,
            @JsonProperty("horas_dom_max_semana")   Double horasDomMaxSemana,
            @JsonProperty("creado_por")             String creadoPor
    ) {}

    public record AlertaSobrecargaDto(
            @JsonProperty("cargo_id")                         long cargoId,
            @JsonProperty("cargo_nombre")                     String cargoNombre,
            String nivel,
            String mensaje,
            @JsonProperty("horas_demanda_total")              double horasDemandaTotal,
            @JsonProperty("capacidad_maxima_legal")           double capacidadMaximaLegal,
            @JsonProperty("deficit_horas")                    double deficitHoras,
            @JsonProperty("contrataciones_minimas_requeridas") int contratacionesMinimasRequeridas
    ) {}

    public record DetalleCargoEscenarioDto(
            @JsonProperty("cargo_id")                long cargoId,
            @JsonProperty("cargo_nombre")            String cargoNombre,
            @JsonProperty("n_activos")               int nActivos,
            @JsonProperty("nuevos_a_contratar")      int nuevosAContratar,
            @JsonProperty("total_horas_extra")       double totalHorasExtra,
            @JsonProperty("costo_adicional_semanal") double costoAdicionalSemanal,
            @JsonProperty("costo_total_semanal")     double costoTotalSemanal,
            @JsonProperty("estado_solver")           String estadoSolver
    ) {}

    public record EscenarioResultadoDto(
            String nombre,
            String descripcion,
            boolean factible,
            @JsonProperty("costo_total_adicional")    double costoTotalAdicional,
            @JsonProperty("costo_total_semanal")      double costoTotalSemanal,
            @JsonProperty("total_nuevos_a_contratar") int totalNuevosAContratar,
            @JsonProperty("total_horas_extra")        double totalHorasExtra,
            @JsonProperty("ahorro_vs_conservador")    double ahorroVsConservador,
            List<DetalleCargoEscenarioDto> cargos
    ) {}

    public record SimulacionResponseDto(
            @JsonProperty("fecha_ejecucion")            String fechaEjecucion,
            @JsonProperty("alertas_sobrecarga")         List<AlertaSobrecargaDto> alertasSobrecarga,
            @JsonProperty("hay_violacion_legal_severa") boolean hayViolacionLegalSevera,
            @JsonProperty("escenario_conservador")      EscenarioResultadoDto escenarioConservador,
            @JsonProperty("escenario_optimo")           EscenarioResultadoDto escenarioOptimo,
            @JsonProperty("escenario_expansion")        EscenarioResultadoDto escenarioExpansion,
            @JsonProperty("recomendacion_solver")       String recomendacionSolver,
            @JsonProperty("analisis_gemini")            String analisisGemini,
            Map<String, Object> parametros
    ) {}

    public record OptimizarExternoRequest(
            Map<Long, DemandaFranjaDto> demandaPorCargo,
            Double horasSemanMax,
            Double horasExtraMaxSemana,
            Double horasDomMaxSemana
    ) {}

    public record GenerarVacantesRequest(
            @JsonProperty("contrataciones_por_cargo") Map<Long, Integer> contratacionesPorCargo
    ) {}
}
