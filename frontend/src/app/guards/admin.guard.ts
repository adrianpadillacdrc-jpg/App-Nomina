// src/app/guards/admin.guard.ts
import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const adminGuard: CanActivateFn = () => {
    const authService = inject(AuthService);
    const router = inject(Router);

    const role = authService.getUserRole();

    if (role?.toUpperCase() === 'ADMIN') {
        return true;
    }

    console.warn('Acceso denegado: solo para ADMIN');
    router.navigate(['/dashboard']);  // o a '/login' si prefieres más estricto
    return false;
};