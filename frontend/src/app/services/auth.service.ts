// src/app/services/auth.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { Router } from '@angular/router';
import { environment } from '../../environments/environment'; // 1. IMPORTAMOS EL ENVIRONMENT

@Injectable({
    providedIn: 'root'
})
export class AuthService {

    private apiUrl = environment.apiUrl;

    constructor(private http: HttpClient, private router: Router) { }

    login(username: string, password: string): Observable<any> {
        return this.http.post<any>(`${this.apiUrl}/api/auth/login`, { username, password }).pipe(
            tap(response => {
                if (response.token) {
                    localStorage.setItem('token', response.token);
                }
            })
        );
    }

    getToken(): string | null {
        return localStorage.getItem('token');
    }

    isLoggedIn(): boolean {
        const token = this.getToken();
        if (!token) return false;

        try {
            const payload = this.decodeTokenPayload(token);
            const exp = payload.exp * 1000;
            const now = Date.now();

            if (!Number.isFinite(exp) || now >= exp) {
                this.logout();
                return false;
            }
            return true;
        } catch (e) {
            console.error('Token inválido o corrupto:', e);
            this.logout();
            return false;
        }
    }

    logout(): void {
        localStorage.removeItem('token');
        this.router.navigate(['/login']);
    }

    getUserRole(): string | null {
        const token = this.getToken();
        if (!token) return null;

        try {
            return this.decodeTokenPayload(token).role ?? null;
        } catch {
            console.warn('No se pudo validar el rol de la sesión.');
            return null;
        }
    }

    private decodeTokenPayload(token: string): { exp: number; role?: string } {
        const segment = token.split('.')[1];
        if (!segment) throw new Error('El token no contiene un payload.');

        const base64 = segment.replace(/-/g, '+').replace(/_/g, '/');
        const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=');
        const payload: unknown = JSON.parse(atob(padded));
        if (typeof payload !== 'object' || payload === null) {
            throw new Error('El payload del token no es válido.');
        }

        const claims = payload as Record<string, unknown>;
        const exp = claims['exp'];
        const role = claims['role'];
        if (typeof exp !== 'number') throw new Error('El token no contiene expiración.');
        return {
            exp,
            role: typeof role === 'string' ? role : undefined
        };
    }
}