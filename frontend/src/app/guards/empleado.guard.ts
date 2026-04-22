// src/app/guards/empleado.guard.ts
import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const empleadoGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  
  const role = authService.getUserRole();
  console.log('EmpleadoGuard - Rol detectado:', role);

  if (role === 'ROLE_EMPLEADO' || role === 'EMPLEADO') {
    console.log('EmpleadoGuard - Acceso permitido');
    return true;
  }

  console.log('EmpleadoGuard - Acceso denegado, redirigiendo a dashboard');
  router.navigate(['/dashboard']);
  return false;
};
