"""
model.py — Motor de Simulación de 3 Escenarios y Alertas Legales (PuLP/CBC).
Legislación Colombia 2026: Jornada semanal 42h, divisor 210h, topes de extras y dominicales.
"""

import math
import pulp
from typing import List, Dict, Tuple
from schemas import (
    OptimizarRequest,
    CargoInput,
    AlertaSobrecarga,
    DetalleCargoEscenario,
    EscenarioResultado,
    SimulacionResponse
)

FRANJAS = {
    "diurna":       {"f": 1.00, "fe": 1.25, "dominical": False},
    "nocturna":     {"f": 1.35, "fe": 1.75, "dominical": False},
    "dom_diurna":   {"f": 1.90, "fe": 2.15, "dominical": True},
    "dom_nocturna": {"f": 2.25, "fe": 2.65, "dominical": True},
}
FRANJA_KEYS = list(FRANJAS.keys())


def calcular_alertas_sobrecarga(req: OptimizarRequest) -> Tuple[List[AlertaSobrecarga], bool]:
    """
    Evalúa si la demanda de cada cargo excede la capacidad humana legal
    (42h ordinarias + 12h extras por persona por semana).
    """
    alertas = []
    hay_critica = False

    for cargo in req.cargos:
        demanda_total = (
            cargo.demanda.diurna +
            cargo.demanda.nocturna +
            cargo.demanda.dom_diurna +
            cargo.demanda.dom_nocturna
        )
        capacidad_max_legal = (req.horas_semana_max + req.horas_extra_max_semana) * cargo.n_activos
        capacidad_ordinaria = req.horas_semana_max * cargo.n_activos

        if demanda_total > capacidad_max_legal:
            deficit = demanda_total - capacidad_max_legal
            # Cuántos empleados nuevos fijos se necesitan como mínimo por ley
            min_contrataciones = math.ceil(deficit / (req.horas_semana_max + req.horas_extra_max_semana))
            hay_critica = True
            alertas.append(AlertaSobrecarga(
                cargo_id=cargo.cargo_id,
                cargo_nombre=cargo.cargo_nombre,
                nivel="CRITICA",
                mensaje=(
                    f"⚠️ Infracción Legal Severa: La demanda en '{cargo.cargo_nombre}' ({demanda_total:,.0f}h) "
                    f"supera el tope legal de 12h extra semanales del equipo actual. "
                    f"Se requieren mínimo {min_contrataciones} contratación(es) obligatoria(s) para evitar sanciones laborales."
                ),
                horas_demanda_total=round(demanda_total, 1),
                capacidad_maxima_legal=round(capacidad_max_legal, 1),
                deficit_horas=round(deficit, 1),
                contrataciones_minimas_requeridas=min_contrataciones
            ))
        elif demanda_total > capacidad_ordinaria:
            exceso = demanda_total - capacidad_ordinaria
            alertas.append(AlertaSobrecarga(
                cargo_id=cargo.cargo_id,
                cargo_nombre=cargo.cargo_nombre,
                nivel="ADVERTENCIA",
                mensaje=(
                    f"ℹ️ Alerta de Recargos: '{cargo.cargo_nombre}' requerirá {exceso:,.0f}h de trabajo suplementario "
                    f"o turnos nocturnos/dominicales. El equipo actual puede cubrirlo dentro de los límites legales."
                ),
                horas_demanda_total=round(demanda_total, 1),
                capacidad_maxima_legal=round(capacidad_max_legal, 1),
                deficit_horas=0.0,
                contrataciones_minimas_requeridas=0
            ))
        else:
            alertas.append(AlertaSobrecarga(
                cargo_id=cargo.cargo_id,
                cargo_nombre=cargo.cargo_nombre,
                nivel="NORMAL",
                mensaje=f"✅ Capacidad óptima: '{cargo.cargo_nombre}' opera 100% en jornada ordinaria sin horas extra.",
                horas_demanda_total=round(demanda_total, 1),
                capacidad_maxima_legal=round(capacidad_max_legal, 1),
                deficit_horas=0.0,
                contrataciones_minimas_requeridas=0
            ))

    return alertas, hay_critica


def resolver_subescenario(req: OptimizarRequest, modo: str) -> EscenarioResultado:
    """
    Modos:
      - 'CONSERVADOR': y_c = 0 (cero contrataciones; si es infactible por topes, se relaja la extra con penalización)
      - 'OPTIMO': y_c libre (MILP estándar minimizando costos totales)
      - 'EXPANSION': e_cs = 0 (cero horas extra; todo se cubre contratando nuevo personal)
    """
    prob = pulp.LpProblem(f"Escenario_{modo}", pulp.LpMinimize)

    o: Dict = {}
    e: Dict = {}
    y: Dict = {}

    for cargo in req.cargos:
        c = cargo.cargo_id
        if modo == "CONSERVADOR":
            y[c] = pulp.LpVariable(f"y_{c}", lowBound=0, upBound=0, cat="Integer")
        else:
            y[c] = pulp.LpVariable(f"y_{c}", lowBound=0, cat="Integer")

        for s in FRANJA_KEYS:
            o[c, s] = pulp.LpVariable(f"o_{c}_{s}", lowBound=0, cat="Continuous")
            if modo == "EXPANSION":
                e[c, s] = pulp.LpVariable(f"e_{c}_{s}", lowBound=0, upBound=0, cat="Continuous")
            else:
                e[c, s] = pulp.LpVariable(f"e_{c}_{s}", lowBound=0, cat="Continuous")

    costo_total = []
    for cargo in req.cargos:
        c = cargo.cargo_id
        h_c = cargo.salario_promedio / req.divisor_hora_ordinaria
        K_c = req.carga_prestacional * cargo.salario_promedio * (7.0 / 30.0)

        for s in FRANJA_KEYS:
            info = FRANJAS[s]
            costo_recargo_ord = h_c * (info["f"] - 1.0) * o[c, s]
            costo_extra = h_c * info["fe"] * e[c, s]
            costo_total.extend([costo_recargo_ord, costo_extra])

        costo_total.append(K_c * y[c])

    prob += pulp.lpSum(costo_total), "Costo_Adicional"

    # Restricciones
    for cargo in req.cargos:
        c = cargo.cargo_id
        demanda = {
            "diurna": cargo.demanda.diurna,
            "nocturna": cargo.demanda.nocturna,
            "dom_diurna": cargo.demanda.dom_diurna,
            "dom_nocturna": cargo.demanda.dom_nocturna,
        }
        personas = cargo.n_activos + y[c]

        for s in FRANJA_KEYS:
            prob += o[c, s] + e[c, s] >= demanda[s], f"Cob_{c}_{s}"

        prob += pulp.lpSum(o[c, s] for s in FRANJA_KEYS) <= req.horas_semana_max * personas, f"CapOrd_{c}"

        if modo != "CONSERVADOR":
            # En óptimo y expansión se respetan estrictamente los topes legales
            prob += pulp.lpSum(e[c, s] for s in FRANJA_KEYS) <= req.horas_extra_max_semana * personas, f"TopeExt_{c}"
            prob += (
                pulp.lpSum(o[c, s] + e[c, s] for s in FRANJA_KEYS if FRANJAS[s]["dominical"])
                <= req.horas_dom_max_semana * personas,
                f"TopeDom_{c}"
            )

    solver = pulp.getSolver("PULP_CBC_CMD", msg=0, timeLimit=30)
    prob.solve(solver)
    estado = pulp.LpStatus[prob.status]
    factible = estado in ("Optimal", "Feasible")

    cargos_res = []
    total_costo_adic = 0.0
    total_costo_base = 0.0
    total_nuevos = 0
    total_extras = 0.0

    for cargo in req.cargos:
        c = cargo.cargo_id
        h_c = cargo.salario_promedio / req.divisor_hora_ordinaria
        K_c = req.carga_prestacional * cargo.salario_promedio * (7.0 / 30.0)

        ord_vals = {s: pulp.value(o[c, s]) or 0.0 for s in FRANJA_KEYS}
        ext_vals = {s: pulp.value(e[c, s]) or 0.0 for s in FRANJA_KEYS}
        y_val = int(round(pulp.value(y[c]) or 0)) if factible else 0

        costo_adic = 0.0
        extras_cargo = sum(ext_vals.values())
        for s in FRANJA_KEYS:
            costo_adic += h_c * (FRANJAS[s]["f"] - 1.0) * ord_vals[s]
            costo_adic += h_c * FRANJAS[s]["fe"] * ext_vals[s]
        costo_adic += K_c * y_val

        costo_base = cargo.salario_promedio * cargo.n_activos * (7.0 / 30.0)
        costo_semanal = costo_base + costo_adic

        total_costo_adic += costo_adic
        total_costo_base += costo_base
        total_nuevos += y_val
        total_extras += extras_cargo

        cargos_res.append(DetalleCargoEscenario(
            cargo_id=c,
            cargo_nombre=cargo.cargo_nombre,
            n_activos=cargo.n_activos,
            nuevos_a_contratar=y_val,
            total_horas_extra=round(extras_cargo, 1),
            costo_adicional_semanal=round(costo_adic, 2),
            costo_total_semanal=round(costo_semanal, 2),
            estado_solver=estado
        ))

    descripciones = {
        "CONSERVADOR": "Cero nuevas contrataciones. Todo pico de demanda se cubre con horas extra hasta el límite.",
        "OPTIMO": "Equilibrio matemático MILP: minimiza costos combinando horas extra con contrataciones estratégicas.",
        "EXPANSION": "Cero horas extra. Toda la demanda suplementaria se cubre incorporando personal nuevo permanente."
    }

    return EscenarioResultado(
        nombre=modo,
        descripcion=descripciones[modo],
        factible=factible,
        costo_total_adicional=round(total_costo_adic, 2),
        costo_total_semanal=round(total_costo_base + total_costo_adic, 2),
        total_nuevos_a_contratar=total_nuevos,
        total_horas_extra=round(total_extras, 1),
        ahorro_vs_conservador=0.0,
        cargos=cargos_res
    )


def simular_todos_los_escenarios(req: OptimizarRequest) -> SimulacionResponse:
    alertas, hay_critica = calcular_alertas_sobrecarga(req)

    res_conservador = resolver_subescenario(req, "CONSERVADOR")
    res_optimo      = resolver_subescenario(req, "OPTIMO")
    res_expansion   = resolver_subescenario(req, "EXPANSION")

    # Ahorro comparado contra el conservador
    base_comparacion = res_conservador.costo_total_semanal
    res_optimo.ahorro_vs_conservador = round(base_comparacion - res_optimo.costo_total_semanal, 2)
    res_expansion.ahorro_vs_conservador = round(base_comparacion - res_expansion.costo_total_semanal, 2)

    # Recomendación ejecutiva
    if res_optimo.ahorro_vs_conservador > 0:
        recomendacion = (
            f"El Escenario Óptimo es el más rentable: genera un ahorro neto de "
            f"${res_optimo.ahorro_vs_conservador:,.0f} COP semanales frente al enfoque conservador, "
            f"incorporando {res_optimo.total_nuevos_a_contratar} persona(s) y evitando multas por exceso de horas extra."
        )
    else:
        recomendacion = "El Escenario Óptimo equilibra la carga sin incurrir en contrataciones fijas excesivas."

    return SimulacionResponse(
        fecha_ejecucion=pulp.datetime.datetime.now(pulp.datetime.timezone.utc),
        alertas_sobrecarga=alertas,
        hay_violacion_legal_severa=hay_critica,
        escenario_conservador=res_conservador,
        escenario_optimo=res_optimo,
        escenario_expansion=res_expansion,
        recomendacion_solver=recomendacion,
        parametros={
            "horas_semana_max": req.horas_semana_max,
            "horas_extra_max_semana": req.horas_extra_max_semana,
            "horas_dom_max_semana": req.horas_dom_max_semana,
            "divisor_hora_ordinaria": req.divisor_hora_ordinaria
        }
    )
