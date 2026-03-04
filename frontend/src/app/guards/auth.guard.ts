// src/app/guards/auth.guard.ts
import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // Si hay token válido → permite el acceso
  if (authService.isLoggedIn()) {
    return true;
  }

  // No hay token → redirige a login y guarda la URL intentada (para volver después del login)
  router.navigate(['/login'], { queryParams: { returnUrl: state.url } });
  return false;
};