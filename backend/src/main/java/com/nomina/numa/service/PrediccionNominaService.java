package com.nomina.numa.service;

import com.nomina.numa.dto.PrediccionDTO;
import com.nomina.numa.model.mongo.PeriodoNomina;
import com.nomina.numa.repository.mongo.PeriodoNominaRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import weka.classifiers.functions.LinearRegression;
import weka.core.*;
import java.util.*;

@Service
@RequiredArgsConstructor
public class PrediccionNominaService {

    private final PeriodoNominaRepository periodoRepository;

    // Constantes
    private static final double CRECIMIENTO_QUINCENAL = 0.02; // 2% por quincena
    private static final double COSTO_BASE_QUINCENA = 12294.24; // millones COP (valor real)

    // Método principal con Weka
    public Map<String, Object> getPrediccionConWeka() {
        Map<String, Object> resultado = new LinkedHashMap<>();

        try {
            // 1. Obtener costos históricos REALES de MongoDB
            List<PeriodoNomina> periodosCerrados = periodoRepository.findAll().stream()
                    .filter(p -> "CERRADO".equals(p.getEstado()))
                    .filter(p -> p.getCostoMillones() != null && p.getCostoMillones() > 0)
                    .sorted(Comparator.comparing(PeriodoNomina::getFechaInicio))
                    .toList();

            if (periodosCerrados.size() < 3) {
                resultado.put("error", "Se necesitan al menos 3 períodos históricos para la predicción");
                resultado.put("periodosEncontrados", periodosCerrados.size());
                resultado.put("quincenas", new ArrayList<>());
                resultado.put("totalMillones", 0);
                resultado.put("totalCOP", 0);
                resultado.put("totalBillones", 0);
                resultado.put("metodo", "No hay suficientes datos históricos");
                resultado.put("periodosHistoricos", periodosCerrados.size());
                resultado.put("tendenciaPorcentaje", 0);
                return resultado;
            }

            System.out.println("📊 Períodos históricos con costo: " + periodosCerrados.size());

            // 2. Entrenar modelo Weka con datos históricos
            LinearRegression modelo = entrenarModeloConWeka(periodosCerrados);

            // 3. Predecir quincenas futuras (mayo a diciembre 2026)
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
            resultado.put("totalMillones", 0);
            resultado.put("totalCOP", 0);
            resultado.put("totalBillones", 0);
            resultado.put("metodo", "Error");
            resultado.put("periodosHistoricos", 0);
            resultado.put("tendenciaPorcentaje", 0);
            e.printStackTrace();
        }

        return resultado;
    }

    // Método legacy (para compatibilidad)
    public Map<String, Object> getPrediccionDetallada() {
        Map<String, Object> resultado = new LinkedHashMap<>();

        // Obtener costo real de la última quincena
        double costoBaseReal = obtenerCostoUltimaQuincena();
        if (costoBaseReal <= 0) {
            costoBaseReal = COSTO_BASE_QUINCENA;
        }

        System.out.println("💰 Costo base real última quincena: $" + costoBaseReal + " millones");

        // Generar predicciones con crecimiento
        List<Double> predicciones = new ArrayList<>();
        double ultimoCosto = costoBaseReal;

        for (int i = 1; i <= 16; i++) {
            double prediccion = ultimoCosto * (1 + CRECIMIENTO_QUINCENAL);
            predicciones.add(prediccion);
            ultimoCosto = prediccion;
        }

        String[] meses = { "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre" };

        List<Map<String, Object>> quincenas = new ArrayList<>();
        int idx = 0;

        for (int i = 0; i < meses.length; i++) {
            Map<String, Object> q1 = new LinkedHashMap<>();
            q1.put("quincena", "1ra");
            q1.put("mes", meses[i]);
            q1.put("costoMillones", Math.round(predicciones.get(idx++) * 100.0) / 100.0);
            q1.put("costoCOP", (long) (predicciones.get(idx - 1) * 1_000_000));
            quincenas.add(q1);

            Map<String, Object> q2 = new LinkedHashMap<>();
            q2.put("quincena", "2da");
            q2.put("mes", meses[i]);
            q2.put("costoMillones", Math.round(predicciones.get(idx++) * 100.0) / 100.0);
            q2.put("costoCOP", (long) (predicciones.get(idx - 1) * 1_000_000));
            quincenas.add(q2);
        }

        double totalMillones = predicciones.stream().mapToDouble(Double::doubleValue).sum();

        resultado.put("quincenas", quincenas);
        resultado.put("totalMillones", Math.round(totalMillones * 100.0) / 100.0);
        resultado.put("totalCOP", (long) (totalMillones * 1_000_000));
        resultado.put("totalBillones", Math.round((totalMillones / 1000) * 100.0) / 100.0);
        resultado.put("metodo", "Crecimiento del " + (CRECIMIENTO_QUINCENAL * 100) + "%");
        resultado.put("tendenciaPorcentaje", CRECIMIENTO_QUINCENAL * 100);
        resultado.put("costoBaseReal", costoBaseReal);

        return resultado;
    }

    private double obtenerCostoUltimaQuincena() {
        try {
            Optional<PeriodoNomina> ultimoPeriodo = periodoRepository.findAll().stream()
                    .filter(p -> "CERRADO".equals(p.getEstado()))
                    .filter(p -> p.getCostoMillones() != null && p.getCostoMillones() > 0)
                    .max(Comparator.comparing(PeriodoNomina::getFechaInicio));

            if (ultimoPeriodo.isPresent()) {
                return ultimoPeriodo.get().getCostoMillones();
            }
        } catch (Exception e) {
            System.err.println("Error obteniendo última quincena: " + e.getMessage());
        }
        return COSTO_BASE_QUINCENA;
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

        int ultimaQuincena = periodos.size();
        double ultimoCosto = periodos.get(periodos.size() - 1).getCostoMillones();

        String[] meses = { "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre" };
        String[] quincenas = { "1ra", "2da" };

        for (int i = 0; i < meses.length; i++) {
            for (int j = 0; j < quincenas.length; j++) {
                ultimaQuincena++;

                double prediccionWeka = predecirConWeka(modelo, ultimaQuincena);
                if (prediccionWeka <= 0) {
                    prediccionWeka = ultimoCosto * 1.02;
                }

                double crecimiento = 0.02;
                double prediccionCrecimiento = ultimoCosto * (1 + crecimiento);

                Map<String, Object> quincena = new LinkedHashMap<>();
                quincena.put("quincena", quincenas[j]);
                quincena.put("mes", meses[i]);
                quincena.put("anio", 2026);
                quincena.put("costoMillonesWeka", Math.round(prediccionWeka * 100.0) / 100.0);
                quincena.put("costoCOPWeka", (long) (prediccionWeka * 1_000_000));
                quincena.put("costoMillonesCrecimiento", Math.round(prediccionCrecimiento * 100.0) / 100.0);
                quincena.put("costoCOPCrecimiento", (long) (prediccionCrecimiento * 1_000_000));

                predicciones.add(quincena);
                ultimoCosto = prediccionWeka;
            }
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

        double prediccion = model.classifyInstance(data.firstInstance());
        return Math.max(prediccion, 0);
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

    // Métodos legacy
    public PrediccionDTO predecir(int anioInicio, int anioFin) {
        PrediccionDTO response = new PrediccionDTO();
        response.setMensaje("Usa /api/prediccion/weka-prediccion para predicción con Weka");
        response.setAños(new ArrayList<>());
        response.setCostosAnualesMillones(new ArrayList<>());
        response.setCostosAnualesBillones(new ArrayList<>());
        return response;
    }

    /**
     * Calcula el costo real de una quincena sumando salarios de empleados activos
     * 
     * @param periodo El período de nómina
     * @return Costo en millones de COP
     */
    public double calcularCostoQuincenaPorPeriodo(PeriodoNomina periodo) {
        // Este método debe calcular el costo real basado en empleados
        // Por ahora retorna el valor base real
        return 12294.24; // 12,294.24 millones COP (valor real de PostgreSQL)
    }
}