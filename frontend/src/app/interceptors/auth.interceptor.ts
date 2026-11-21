import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { Router } from '@angular/router';
import { catchError } from 'rxjs/operators';
import { throwError } from 'rxjs';
import { environment } from '../../environments/environment'; 

export const authInterceptor: HttpInterceptorFn = (req, next) => {
    const authService = inject(AuthService);
    const router = inject(Router);
    const token = authService.getToken();
    const baseUrl = environment.apiUrl.replace(/\/$/, '');

   
    const publicUrls = [
        '/login',
        '/register',
        '/api/auth/login',
        '/api/auth/register',
        '/api/portal/login',
        '/api/portal/chat'
    ];

    const isPublicUrl = publicUrls.some(url => req.url.includes(url));
    const isPortalUrl = req.url.includes('/api/portal/');
    
    const apiPrefix = baseUrl ? `${baseUrl}/api/` : '/api/';
    const isApiUrl = req.url.startsWith(apiPrefix);

    let authReq = req;
    
    if (token && !isPublicUrl && isApiUrl && !req.headers.has('Authorization')) {
        authReq = req.clone({
            setHeaders: {
                Authorization: `Bearer ${token}`
            }
        });
    } else if (isPublicUrl) {
        console.log(' Endpoint público, sin token:', req.url);
    }

    return next(authReq).pipe(
        catchError(err => {
            console.log(' Error en petición:', err.status, req.url);

            if (err.status === 401 && !isPortalUrl) {
                console.warn('401 → Token inválido/expirado → logout');
                authService.logout();
                router.navigate(['/login']);
            } else if (err.status === 403) {
                console.warn('403 → Acceso denegado a:', req.url);
            }
            return throwError(() => err);
        })
    );
};