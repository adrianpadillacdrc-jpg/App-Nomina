// src/app/services/contratos.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Contrato {
    id?: string;
    idEmpleado: number;
    idTipoContrato: string;
    fechaInicio: string;
    fechaFin: string;
    estado: string;
}

@Injectable({
    providedIn: 'root'
})
export class ContratosService {
    // CORREGIDO: Cambiar de /api/contratos a /api/contrataciones
    private apiUrl = 'http://localhost:8080/api/contrataciones';

    constructor(private http: HttpClient) { }

    // Crear nuevo contrato
    crearContrato(contrato: Contrato): Observable<Contrato> {
        return this.http.post<Contrato>(this.apiUrl, contrato);
    }

    // Obtener contratos por empleado - CORREGIDO
    getContratosPorEmpleado(idEmpleado: number): Observable<Contrato[]> {
        return this.http.get<Contrato[]>(`${this.apiUrl}/empleado/${idEmpleado}`);
    }

    // Cambiar estado del contrato - CORREGIDO
    cambiarEstadoContrato(id: string, estado: string): Observable<Contrato> {
        return this.http.post<Contrato>(`${this.apiUrl}/${id}/estado`, estado, {
            headers: { 'Content-Type': 'application/json' }
        });
    }
}