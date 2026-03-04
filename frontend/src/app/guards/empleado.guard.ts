// src/app/guards/empleado.guard.ts
import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const empleadoGuard: CanActivateFn = () => {
    const authService = inject(AuthService);
    const router = inject(Router);

    const role = authService.getUserRole();

    if (role?.toUpperCase() === 'EMPLEADO') {
        return true;
    }

    console.warn('Acceso denegado: solo para EMPLEADO');
    router.navigate(['/dashboard']);  // o a '/login'
    return false;
};