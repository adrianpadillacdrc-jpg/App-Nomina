// src/app/interceptors/auth.interceptor.ts
import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { Router } from '@angular/router';
import { catchError } from 'rxjs/operators';
import { throwError } from 'rxjs';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
    const authService = inject(AuthService);
    const router = inject(Router);
    const token = authService.getToken();

    let authReq = req;
    if (token) {
        authReq = req.clone({
            setHeaders: {
                Authorization: `Bearer ${token}`
            }
        });
    }

    return next(authReq).pipe(
        catchError(err => {
            // Solo hacemos logout automático en 401 real (token inválido/expirado)
            // NO en 403 de rutas de consulta (como /api/empleados)
            if (err.status === 401) {
                console.warn('401 → Token inválido/expirado → logout automático');
                authService.logout();
            } else if (err.status === 403) {
                // Excepción para rutas de consulta
                if (req.url.includes('/api/empleados') || req.url.includes('/consulta-empleado')) {
                    console.log('403 en ruta de consulta → no hacemos logout automático');
                    // Dejamos que el componente maneje el error (p.ej. mostrar mensaje o datos de prueba)
                } else {
                    console.warn('403 en ruta protegida → logout automático');
                    authService.logout();
                }
            }

            // Propaga el error para que el componente lo maneje si quiere
            return throwError(() => err);
        })
    );
};