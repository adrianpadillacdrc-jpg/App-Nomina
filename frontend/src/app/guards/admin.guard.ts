// src/app/guards/admin.guard.ts
import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const adminGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  
  const role = authService.getUserRole();
  console.log('AdminGuard - Rol detectado:', role);

  if (role === 'ROLE_ADMIN' || role === 'ADMIN') {
    console.log('AdminGuard - Acceso permitido');
    return true;
  }

  console.log('AdminGuard - Acceso denegado, redirigiendo a empleado');
  router.navigate(['/consulta-empleado']);
  return false;
};
