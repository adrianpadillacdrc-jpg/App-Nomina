// src/app/services/contratos.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Contrato {
    id?: string;
    idEmpleado: number;
    idTipoContrato: string;
    fechaInicio: string;
    fechaFin: string;
    estado: string;
    firmaEmpleado?: string;
    firmaEmpleador?: string;
    fechaFirmaEmpleado?: string;
    fechaFirmaEmpleador?: string;
}

@Injectable({
    providedIn: 'root'
})
export class ContratosService {
    //  CORREGIDO: usa environment y la ruta real del backend /api/contrataciones
    private apiUrl = `${environment.apiUrl}/api/contrataciones`;

    constructor(private http: HttpClient) { }

    // Crear nuevo contrato
    crearContrato(contrato: Contrato): Observable<Contrato> {
        return this.http.post<Contrato>(this.apiUrl, contrato);
    }

    // Todas las contrataciones (para el historial)
    getContrataciones(): Observable<Contrato[]> {
        return this.http.get<Contrato[]>(this.apiUrl);
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

    // ✅ Guardar firma permanente del empleado en el contrato (PostgreSQL)
    guardarFirmaEmpleadoContrato(idContrato: string | number, firmaBase64: string): Observable<Contrato> {
        return this.http.post<Contrato>(`${this.apiUrl}/${idContrato}/firma-empleado`, { firma: firmaBase64 });
    }

    // ✅ Guardar firma permanente del empleador en el contrato (PostgreSQL)
    guardarFirmaEmpleadorContrato(idContrato: string | number, firmaBase64: string): Observable<Contrato> {
        return this.http.post<Contrato>(`${this.apiUrl}/${idContrato}/firma-empleador`, { firma: firmaBase64 });
    }

    // ✅ Solicitar código OTP al correo para firma de contrato (tabla firma_contrato_codigo)
    solicitarCodigoFirma(idContrato: string | number): Observable<any> {
        return this.http.post<any>(`${this.apiUrl}/${idContrato}/solicitar-codigo-firma`, {});
    }

    // ✅ Verificar código OTP y firmar el contrato
    verificarCodigoFirma(idContrato: string | number, codigo: string, firmaBase64?: string): Observable<Contrato> {
        return this.http.post<Contrato>(`${this.apiUrl}/${idContrato}/verificar-codigo-firma`, {
            codigo,
            firma: firmaBase64 || ''
        });
    }
}