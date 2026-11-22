"""
main.py — FastAPI microservicio de simulación y optimización de turnos.
"""

import os
import json
import psycopg2
from datetime import datetime, timezone
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from schemas import OptimizarRequest, SimulacionResponse
from model import simular_todos_los_escenarios

app = FastAPI(
    title="NUMA Optimizer & Simulator",
    description="Microservicio de simulación de escenarios (Conservador, Óptimo, Expansión) y alertas de fatiga con PuLP/CBC",
    version="2.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

DB_CONFIG = {
    "host":     os.getenv("DB_HOST",     "postgres"),
    "port":     int(os.getenv("DB_PORT", "5432")),
    "dbname":   os.getenv("DB_NAME",     "numadb"),
    "user":     os.getenv("DB_USER",     "postgres"),
    "password": os.getenv("DB_PASSWORD", "numanomina2025"),
}

def get_conn():
    return psycopg2.connect(**DB_CONFIG)


@app.get("/health", tags=["Salud"])
def health():
    return {
        "status": "ok",
        "service": "numa-optimizer",
        "version": "2.0.0",
        "timestamp": datetime.now(timezone.utc).isoformat()
    }


@app.post("/simular", response_model=SimulacionResponse, tags=["Simulación"])
@app.post("/optimize", response_model=SimulacionResponse, tags=["Simulación"])
def simular(req: OptimizarRequest):
    """
    Ejecuta en paralelo:
    1. Alertas de sobrecarga y fatiga laboral (validación legal 2026).
    2. Escenario Conservador (0 contrataciones).
    3. Escenario Óptimo MILP (mínimo costo legal).
    4. Escenario de Expansión (0 horas extra).
    """
    if not req.cargos:
        raise HTTPException(status_code=400, detail="Debe enviar al menos un cargo con su demanda.")

    simulacion = simular_todos_los_escenarios(req)

    # Guardar el escenario óptimo en optimizacion_resultado
    try:
        optimo = simulacion.escenario_optimo
        conn = get_conn()
        with conn:
            with conn.cursor() as cur:
                for c in optimo.cargos:
                    cur.execute("""
                        INSERT INTO optimizacion_resultado (
                            fecha_ejecucion, cargo_id, cargo_nombre, n_activos,
                            nuevos_a_contratar, horas_extra_diurna, horas_extra_nocturna,
                            horas_extra_dom_diurna, horas_extra_dom_nocturna,
                            costo_adicional_semanal, costo_base_semanal,
                            ahorro_vs_proporcional, estado_solver,
                            parametros_json, created_by
                        ) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
                    """, (
                        simulacion.fecha_ejecucion, c.cargo_id, c.cargo_nombre, c.n_activos,
                        c.nuevos_a_contratar, c.total_horas_extra, 0.0, 0.0, 0.0,
                        c.costo_adicional_semanal, c.costo_total_semanal - c.costo_adicional_semanal,
                        optimo.ahorro_vs_conservador, c.estado_solver,
                        json.dumps(simulacion.parametros), req.creado_por
                    ))
        conn.close()
    except Exception as ex:
        print(f"[WARN] Error al persistir en BD: {ex}")

    return simulacion
