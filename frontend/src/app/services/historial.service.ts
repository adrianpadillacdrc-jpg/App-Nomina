// src/app/services/historial.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface ResumenHistorial {
  totalEmpleados: number;
  enEmpresa: number;
  inactivos: number;
  liquidados: number;
  pendientes: number;
  salieron: number;
  nominaActiva: number;
  contratosPorVencer: number;
  contratosVencidos: number;
  totalContrataciones: number;
}

export interface EmpleadoHistorial {
  id: number;
  nombreCompleto: string;
  numeroDocumento: string;
  cargo: string;
  salarioBase: number;
  estado: string;
  categoria: 'EN_EMPRESA' | 'LIQUIDADO' | 'INACTIVO' | 'PENDIENTE' | 'SALIDO';
  fechaCreacion?: string;
  fechaInicioContrato?: string;
  fechaFinContrato?: string;
  contratosVigentes: number;
  totalContratos: number;
}

export interface EventoHistorial {
  tipo: string;
  empleadoId?: number;
  titulo: string;
  fecha: string | null;
  empleado: string;
  documento: string;
  cargo: string;
  detalle: string;
  nivel: string;
  frecuencia?: string;
  estadoPago?: string;
}

export interface HistorialGeneral {
  resumen: ResumenHistorial;
  empleados: EmpleadoHistorial[];
  eventos: EventoHistorial[];
  eventosTotal: number;
  paginaEventos: number;
  paginasEventos: number;
  empleadosConEventos: number[];
  generadoEn: string;
}

export interface FiltrosHistorial {
  tipo?: string;
  frecuencia?: string;
  estadoPago?: string;
  desde?: string;
  hasta?: string;
  empleadoId?: number;
  pagina?: number;
  tamano?: number;
}

@Injectable({ providedIn: 'root' })
export class HistorialService {
  private apiUrl = `${environment.apiUrl}/api/historial`;
  constructor(private http: HttpClient) { }

  getHistorial(busqueda = '', estado = '', filtros: FiltrosHistorial = {}): Observable<HistorialGeneral> {
    let params = new HttpParams().set('busqueda', busqueda).set('estado', estado);
    if (filtros.tipo) params = params.set('tipo', filtros.tipo);
    if (filtros.frecuencia) params = params.set('frecuencia', filtros.frecuencia);
    if (filtros.estadoPago) params = params.set('estadoPago', filtros.estadoPago);
    if (filtros.desde) params = params.set('desde', filtros.desde);
    if (filtros.hasta) params = params.set('hasta', filtros.hasta);
    if (filtros.empleadoId != null) params = params.set('empleadoId', filtros.empleadoId);
    params = params.set('pagina', filtros.pagina ?? 0).set('tamano', filtros.tamano ?? 100);
    return this.http.get<HistorialGeneral>(`${this.apiUrl}/general`, { params });
  }
}
