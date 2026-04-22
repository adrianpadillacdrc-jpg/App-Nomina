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

    // Rutas que NO necesitan token (públicas)
    const publicUrls = [
        '/api/periodo-nomina/todos',
        '/api/periodo-nomina/test',
        '/api/periodo-nomina/actual',
        '/api/periodo-nomina/actual-con-costo',
        '/api/prediccion/'
    ];

    // Verificar si la URL actual es pública
    const isPublicUrl = publicUrls.some(url => req.url.includes(url));

    let authReq = req;
    if (token && !isPublicUrl) {
        authReq = req.clone({
            setHeaders: {
                Authorization: `Bearer ${token}`
            }
        });
        console.log('🔐 Token agregado a:', req.url);
    } else if (isPublicUrl) {
        console.log('🔓 Endpoint público, sin token:', req.url);
    }

    return next(authReq).pipe(
        catchError(err => {
            console.log('⚠️ Error en petición:', err.status, req.url);

            // Solo hacer logout en 401 (no autenticado)
            if (err.status === 401) {
                console.warn('401 → Token inválido/expirado → logout');
                authService.logout();
                router.navigate(['/login']);
            } else if (err.status === 403) {
                console.warn('403 → Acceso denegado a:', req.url);
                // No hacer logout para 403, solo mostrar el error
            }
            return throwError(() => err);
        })
    );
};