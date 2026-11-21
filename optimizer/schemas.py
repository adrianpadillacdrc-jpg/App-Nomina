from pydantic import BaseModel, Field
from typing import List, Optional, Dict
from datetime import datetime


# ── Request ────────────────────────────────────────────────────────────────────

class DemandaFranja(BaseModel):
    """Horas requeridas por franja para un cargo en la semana."""
    diurna: float = Field(..., ge=0, description="Horas diurnas requeridas")
    nocturna: float = Field(..., ge=0, description="Horas nocturnas requeridas")
    dom_diurna: float = Field(..., ge=0, description="Horas dominicales diurnas requeridas")
    dom_nocturna: float = Field(..., ge=0, description="Horas dominicales nocturnas requeridas")


class CargoInput(BaseModel):
    """Datos de un cargo para el modelo de optimización."""
    cargo_id: int = Field(..., description="ID del cargo en la tabla cargos")
    cargo_nombre: str = Field(..., description="Nombre del cargo")
    n_activos: int = Field(..., ge=1, description="Empleados activos en este cargo")
    salario_promedio: float = Field(..., gt=0, description="Salario base mensual promedio COP")
    demanda: DemandaFranja


class OptimizarRequest(BaseModel):
    """Cuerpo completo de la petición POST /optimize"""
    cargos: List[CargoInput]
    horas_semana_max: float = Field(42.0, description="Jornada máxima semanal legal 2026 (h)")
    horas_extra_max_semana: float = Field(12.0, description="Tope de horas extra semanales por persona")
    horas_dom_max_semana: float = Field(8.0, description="Tope de horas dominicales semanales por persona")
    divisor_hora_ordinaria: float = Field(210.0, description="Divisor de hora ordinaria")
    carga_prestacional: float = Field(1.5, description="Factor carga prestacional de nuevo contratado")
    creado_por: Optional[str] = Field(None, description="Usuario que ejecuta la simulación")


# ── Alertas de Sobrecarga y Fatiga ─────────────────────────────────────────────

class AlertaSobrecarga(BaseModel):
    cargo_id: int
    cargo_nombre: str
    nivel: str = Field(..., description="CRITICA, ADVERTENCIA, NORMAL")
    mensaje: str
    horas_demanda_total: float
    capacidad_maxima_legal: float
    deficit_horas: float
    contrataciones_minimas_requeridas: int


# ── Resultados por Escenario ───────────────────────────────────────────────────

class DetalleCargoEscenario(BaseModel):
    cargo_id: int
    cargo_nombre: str
    n_activos: int
    nuevos_a_contratar: int
    total_horas_extra: float
    costo_adicional_semanal: float
    costo_total_semanal: float
    estado_solver: str


class EscenarioResultado(BaseModel):
    nombre: str = Field(..., description="CONSERVADOR, OPTIMO, EXPANSION")
    descripcion: str
    factible: bool
    costo_total_adicional: float
    costo_total_semanal: float
    total_nuevos_a_contratar: int
    total_horas_extra: float
    ahorro_vs_conservador: float
    cargos: List[DetalleCargoEscenario]


# ── Respuesta Global con Simulación Completa ───────────────────────────────────

class SimulacionResponse(BaseModel):
    fecha_ejecucion: datetime
    alertas_sobrecarga: List[AlertaSobrecarga]
    hay_violacion_legal_severa: bool
    escenario_conservador: EscenarioResultado
    escenario_optimo: EscenarioResultado
    escenario_expansion: EscenarioResultado
    recomendacion_solver: str
    parametros: dict
