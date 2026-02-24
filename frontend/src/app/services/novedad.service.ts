import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Novedad } from '../models/novedad.model';

@Injectable({ providedIn: 'root' })
export class NovedadService {
  private api = 'http://localhost:8080/api/novedad';

  constructor(private http: HttpClient) {}

  getByEmpleadoYPeriodo(empleadoId: number, periodo: string): Observable<Novedad[]> {
    return this.http.get<Novedad[]>(`${this.api}/empleado/${empleadoId}/${periodo}`);
  }

  crear(novedad: Novedad): Observable<Novedad> {
    return this.http.post<Novedad>(this.api, novedad);
  }

  eliminar(id: string): Observable<void> {
    return this.http.delete<void>(`${this.api}/${id}`);
  }
}