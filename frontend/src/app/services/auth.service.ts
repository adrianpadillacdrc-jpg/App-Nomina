// src/app/services/auth.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { Router } from '@angular/router';

@Injectable({
    providedIn: 'root'
})
export class AuthService {

    private apiUrl = 'http://localhost:8080/api/auth';

    constructor(private http: HttpClient, private router: Router) { }

    login(username: string, password: string): Observable<any> {
        return this.http.post<any>(`${this.apiUrl}/login`, { username, password }).pipe(
            tap(response => {
                if (response.token) {
                    localStorage.setItem('token', response.token);
                    console.log('Token guardado:', response.token);
                }
            })
        );
    }

    getToken(): string | null {
        return localStorage.getItem('token');
    }

    isLoggedIn(): boolean {
        return !!this.getToken();
    }

    logout(): void {
        localStorage.removeItem('token');
        this.router.navigate(['/login']);
    }

    getUserRole(): string | null {
        const token = this.getToken();
        if (!token) return null;

        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            console.log('Payload del token:', payload);
            return payload.role || null;
        } catch (e) {
            console.error('Error decodificando token:', e);
            return null;
        }
    }
}