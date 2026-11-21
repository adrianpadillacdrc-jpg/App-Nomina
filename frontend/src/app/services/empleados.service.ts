// src/app/services/empleados.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Empleado } from '../models/empleado.model';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class EmpleadosService {

  private baseUrl = environment.apiUrl;

  constructor(private http: HttpClient) { }

  getPeriodoActual(): Observable<any> {
    return this.http.get(`${this.baseUrl}/api/periodo-nomina/actual`);
  }

  getNovedades(idEmpleado: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/api/novedades/empleado/${idEmpleado}`);
  }

  pagarNomina(payload: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/api/pagos-nomina`, payload);
  }

  getLiquidacionNomina(periodoId: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/api/pagos-nomina/liquidacion/${periodoId}`);
  }

  getPagosPorPeriodo(periodoId: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/api/pagos-nomina/periodo/${periodoId}`);
  }

  // ✅ Paginación Activa con soporte opcional de filtro por sucursal
  getEmpleados(page: number = 0, size: number = 10, idSucursal?: number | ''): Observable<any> {
    let url = `${this.baseUrl}/api/empleados?page=${page}&size=${size}`;
    if (idSucursal !== undefined && idSucursal !== null && idSucursal !== '') {
      url += `&idSucursal=${idSucursal}`;
    }
    return this.http.get<any>(url);
  }

  // ✅ Buscar un empleado por su ID directo
  getEmpleadoPorId(id: string): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/api/empleados/${id}`);
  }

  // ✅ NUEVO MÉTODO: Trae el total exacto de empleados activos e inactivos de BD
  getEstadisticasEmpleados(): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/api/empleados/estadisticas`);
  }

  guardarNovedad(novedad: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/api/novedades`, novedad);
  }

  getNovedadesPorPeriodo(periodoId: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/api/novedades/periodo/${periodoId}`);
  }

  getNovedadesPorPeriodoYEmpleado(periodoId: string, empleadoId: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/api/novedades/periodo/${periodoId}/empleado/${empleadoId}`);
  }

  getNovedadesPeriodoActual(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/api/novedades/periodo-actual`);
  }

  getPeriodos(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/api/periodo-nomina/todos`);
  }

  cerrarPeriodoActual(): Observable<any> {
    return this.http.patch(`${this.baseUrl}/api/periodo-nomina/cerrar-actual`, {});
  }

  crearPeriodo(periodo: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/api/periodo-nomina`, periodo);
  }

  getNovedadesPorEmpleado(empleadoId: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/api/novedades/empleado/${empleadoId}`);
  }

  actualizarEmpleado(empleado: any): Observable<any> {
    return this.http.put(`${this.baseUrl}/api/empleados/${empleado.id}`, empleado);
  }

  getConcepto(tipo: string): string {
    const mapa: any = {
      HORAS_EXTRAS: 'HORAS EXTRAS',
      BONIFICACION: 'BONIFICACIÓN',
      COMISION: 'COMISIÓN',
      AUXILIO_TRANSPORTE: 'AUXILIO DE TRANSPORTE',
      PRESTAMO: 'DESCUENTO PRÉSTAMO',
      DEDUCCION: 'DEDUCCIÓN',
      EMBARGO: 'EMBARGO JUDICIAL'
    };
    return mapa[tipo] || tipo;
  }

  // ✅ Agregado: Requerido por dashboard.component.ts
  getPeriodoActualConCosto(): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/api/periodo-nomina/actual-con-costo`);
  }

  // ✅ Agregado: Requerido por predicciones.component.ts
  getCargos(): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/api/empleados/cargos`);
  }

  getEmpresas(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/api/empresas`);
  }

  getSucursales(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/api/sucursales`);
  }
}

export type { Empleado };