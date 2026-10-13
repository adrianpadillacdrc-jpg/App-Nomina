package com.nomina.numa.service;

import com.nomina.numa.model.mongo.PeriodoNomina;
import com.nomina.numa.repository.mongo.PeriodoNominaRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import weka.classifiers.functions.LinearRegression;
import weka.core.*;
import java.time.LocalDate;
import java.time.format.TextStyle;
import java.util.*;

@Service
@RequiredArgsConstructor
public class PrediccionNominaService {

    private final PeriodoNominaRepository periodoRepository;

    // Método principal con Weka
    public Map<String, Object> getPrediccionConWeka() {
        Map<String, Object> resultado = new LinkedHashMap<>();

        try {
            // 1. Obtener costos históricos REALES de MongoDB
            List<PeriodoNomina> periodosCerrados = periodoRepository.findAll().stream()
                    .filter(p -> "CERRADO".equals(p.getEstado()))
                    .filter(p -> p.getCostoMillones() != null && p.getCostoMillones() > 0)
                    .filter(p -> !Boolean.TRUE.equals(p.getCostoEstimado()))
                    .filter(p -> "LIQUIDACION_PAGADA".equals(p.getOrigenCosto()))
                    .filter(p -> p.getFechaInicio() != null && p.getFechaFin() != null)
                    .sorted(Comparator.comparing(PeriodoNomina::getFechaInicio))
                    .toList();

            if (periodosCerrados.size() < 3) {
                resultado.put("error", "Se necesitan al menos 3 períodos históricos para la predicción");
                resultado.put("periodosEncontrados", periodosCerrados.size());
                resultado.put("quincenas", new ArrayList<>());
                resultado.put("metodo", "No hay suficientes datos históricos");
                resultado.put("periodosHistoricos", periodosCerrados.size());
                resultado.put("tendenciaPorcentaje", 0);
                return resultado;
            }

            System.out.println("📊 Períodos históricos con costo: " + periodosCerrados.size());

            // 2. Entrenar modelo Weka con datos históricos
            LinearRegression modelo = entrenarModeloConWeka(periodosCerrados);

            // Predict the next 12 months, based on the latest real closed payroll.
            List<Map<String, Object>> predicciones = predecirQuincenasFuturas(modelo, periodosCerrados);

            // 4. Calcular totales
            double totalMillones = predicciones.stream()
                    .mapToDouble(p -> (double) p.get("costoMillonesWeka"))
                    .sum();

            resultado.put("quincenas", predicciones);
            resultado.put("totalMillones", Math.round(totalMillones * 100.0) / 100.0);
            resultado.put("totalCOP", (long) (totalMillones * 1_000_000));
            resultado.put("totalBillones", Math.round((totalMillones / 1000) * 100.0) / 100.0);
            resultado.put("metodo", "Regresión Lineal (Weka) con datos históricos reales");
            resultado.put("periodosHistoricos", periodosCerrados.size());
            resultado.put("tendenciaPorcentaje", calcularTendencia(periodosCerrados));

        } catch (Exception e) {
            resultado.put("error", "Error en predicción: " + e.getMessage());
            resultado.put("quincenas", new ArrayList<>());
            resultado.put("metodo", "Error");
            resultado.put("periodosHistoricos", 0);
            resultado.put("tendenciaPorcentaje", 0);
            e.printStackTrace();
        }

        return resultado;
    }

    private LinearRegression entrenarModeloConWeka(List<PeriodoNomina> periodos) throws Exception {
        ArrayList<Attribute> atributos = new ArrayList<>();
        atributos.add(new Attribute("quincena_num"));
        atributos.add(new Attribute("costo_millones"));

        Instances data = new Instances("quincenas", atributos, 0);
        data.setClassIndex(1);

        int numQuincena = 1;
        for (PeriodoNomina periodo : periodos) {
            Instance inst = new DenseInstance(2);
            inst.setValue(atributos.get(0), numQuincena++);
            inst.setValue(atributos.get(1), periodo.getCostoMillones());
            data.add(inst);
        }

        System.out.println("📈 Entrenando Weka con " + data.size() + " quincenas históricas");

        LinearRegression model = new LinearRegression();
        model.buildClassifier(data);

        System.out.println("✅ Modelo Weka entrenado");

        return model;
    }

    private List<Map<String, Object>> predecirQuincenasFuturas(LinearRegression modelo, List<PeriodoNomina> periodos)
            throws Exception {
        List<Map<String, Object>> predicciones = new ArrayList<>();

        int siguienteQuincena = periodos.size();
        LocalDate inicio = periodos.get(periodos.size() - 1).getFechaFin().plusDays(1);

        for (int i = 0; i < 24; i++) {
            LocalDate fin = inicio.getDayOfMonth() <= 15
                    ? inicio.withDayOfMonth(15)
                    : inicio.withDayOfMonth(inicio.lengthOfMonth());
            double prediccionWeka = predecirConWeka(modelo, ++siguienteQuincena);
            if (!Double.isFinite(prediccionWeka) || prediccionWeka <= 0) {
                throw new IllegalStateException(
                        "El modelo no produjo una predicción positiva a partir de los costos reales");
            }

            Map<String, Object> quincena = new LinkedHashMap<>();
            quincena.put("quincena", inicio.getDayOfMonth() <= 15 ? "1ra" : "2da");
            quincena.put("mes", inicio.getMonth().getDisplayName(TextStyle.FULL, Locale.forLanguageTag("es-CO")));
            quincena.put("mesNumero", inicio.getMonthValue());
            quincena.put("anio", inicio.getYear());
            quincena.put("costoMillonesWeka", Math.round(prediccionWeka * 100.0) / 100.0);
            quincena.put("costoCOPWeka", (long) (prediccionWeka * 1_000_000));
            predicciones.add(quincena);

            inicio = fin.plusDays(1);
        }

        return predicciones;
    }

    private double predecirConWeka(LinearRegression model, int quincenaNum) throws Exception {
        ArrayList<Attribute> atributos = new ArrayList<>();
        atributos.add(new Attribute("quincena_num"));
        atributos.add(new Attribute("costo_millones"));

        Instances data = new Instances("prediccion", atributos, 1);
        data.setClassIndex(1);

        Instance inst = new DenseInstance(2);
        inst.setValue(atributos.get(0), quincenaNum);
        data.add(inst);

        return model.classifyInstance(data.firstInstance());
    }

    private double calcularTendencia(List<PeriodoNomina> periodos) {
        if (periodos.size() < 2)
            return 0;
        double primero = periodos.get(0).getCostoMillones();
        double ultimo = periodos.get(periodos.size() - 1).getCostoMillones();
        if (primero <= 0)
            return 0;
        double crecimientoTotal = (ultimo - primero) / primero;
        return Math.round((crecimientoTotal / periodos.size()) * 100 * 100.0) / 100.0;
    }

}