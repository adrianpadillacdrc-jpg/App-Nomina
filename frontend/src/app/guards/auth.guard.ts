// auth.guard.ts
import { inject } from '@angular/core';
import { Router } from '@angular/router';

export const authGuard = () => {
  const router = inject(Router);
  if (localStorage.getItem('loggedIn')) return true;
  router.navigate(['/login']);
  return false;
};