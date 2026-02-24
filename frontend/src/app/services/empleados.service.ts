// src/app/services/empleados.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Empleado } from '../models/empleado.model';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })

export class EmpleadosService {
  private api = 'http://localhost:8080';
  private apiUrl = 'http://localhost:8080/api';

  constructor(private http: HttpClient) { }

  getPeriodoActual(): Observable<any> {
    return this.http.get(`${this.api}/api/periodo-nomina/actual`);
  }

  getNovedades(idEmpleado: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.api}/api/novedades/empleado/${idEmpleado}`);
  }

  pagarNomina(payload: any): Observable<any> {
    return this.http.post('http://localhost:8080/api/pagos-nomina', payload, {
      responseType: 'text'
    });
  }
  getEmpleados(): Observable<Empleado[]> {
    return this.http.get<Empleado[]>(`${this.api}/api/empleados`);
  }

  guardarNovedad(novedad: any): Observable<any> {
    return this.http.post('http://localhost:8080/api/novedades', novedad);
  }

  getNovedadesPorPeriodo(periodoId: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.api}/api/novedades/periodo/${periodoId}`);
  }

  getNovedadesPorPeriodoYEmpleado(periodoId: string, empleadoId: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.api}/api/novedades/periodo/${periodoId}/empleado/${empleadoId}`);
  }

  getNovedadesPeriodoActual(): Observable<any[]> {
    return this.http.get<any[]>(`${this.api}/api/novedades/periodo-actual`);
  }

  getPeriodos(): Observable<any[]> {
    return this.http.get<any[]>('http://localhost:8080/api/periodo-nomina/todos');
  }
  cerrarPeriodoActual(): Observable<any> {
    return this.http.patch('http://localhost:8080/api/periodo-nomina/cerrar-actual', {});
  }

  crearPeriodo(periodo: any): Observable<any> {
    return this.http.post('http://localhost:8080/api/periodo-nomina', periodo);
  }
  getNovedadesPorEmpleado(empleadoId: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/novedades/empleado/${empleadoId}`);
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

  actualizarEmpleado(empleado: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/empleados/${empleado.id}`, empleado);
  }
}

export type { Empleado };