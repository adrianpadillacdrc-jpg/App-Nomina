// src/app/services/alertas.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Alerta {
  tipo: 'CONTRATO' | 'CONTRATACION' | 'PERIODO';
  titulo: string;
  mensaje: string;
  fecha: string;
  diasRestantes: number;
  nivel: 'VENCIDO' | 'URGENTE' | 'ADVERTENCIA';
  idReferencia: string | number;
  nombreEmpleado?: string;
  documento?: string;
}

export interface AlertasResponse {
  alertas: Alerta[];
  total: number;
  generadoEn: string;
}

@Injectable({ providedIn: 'root' })
export class AlertasService {
  private baseUrl = environment.apiUrl;

  constructor(private http: HttpClient) { }

  getAlertas(): Observable<AlertasResponse> {
    return this.http.get<AlertasResponse>(`${this.baseUrl}/api/alertas`);
  }
}
