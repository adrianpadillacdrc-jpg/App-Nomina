// src/app/app.routes.ts
import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';
import { adminGuard } from './guards/admin.guard';
import { empleadoGuard } from './guards/empleado.guard';

export const routes: Routes = [
  { path: '', redirectTo: '/login', pathMatch: 'full' },

  // Rutas públicas
  {
    path: 'login',
    loadComponent: () => import('./pages/login/login.component').then(m => m.LoginComponent)
  },

  {
    path: 'register',
    loadComponent: () => import('./pages/register/register.component').then(m => m.RegisterComponent)
  },

  // Portal de auto-servicio del EMPLEADO (acceso con nombre + cédula)
  {
    path: 'portal-empleado',
    loadComponent: () => import('./pages/portal-empleado/portal-empleado.component').then(m => m.PortalEmpleadoComponent)
  },

  // Panel ADMIN: aprobar novedades, renuncias, liquidar y pagar
  {
    path: 'admin-aprobaciones',
    loadComponent: () => import('./pages/admin-aprobaciones/admin-aprobaciones.component').then(m => m.AdminAprobacionesComponent),
    canActivate: [authGuard, adminGuard]
  },

  // Rutas solo ADMIN
  {
    path: 'dashboard',
    loadComponent: () => import('./pages/dashboard/dashboard.component').then(m => m.DashboardComponent),
    canActivate: [authGuard, adminGuard]
  },

  {
    path: 'registro',
    loadComponent: () => import('./pages/registro-empleado/registro-empleado.component').then(m => m.RegistroEmpleadoComponent),
    canActivate: [authGuard, adminGuard]
  },

  {
    path: 'liquidar',
    loadComponent: () => import('./pages/liquidar-empleado/liquidar-empleado.component').then(m => m.LiquidarEmpleadoComponent),
    canActivate: [authGuard, adminGuard]
  },

  {
    path: 'consultar',
    loadComponent: () => import('./pages/consultar-empleados/consultar-empleados.component').then(m => m.ConsultarEmpleadosComponent),
    canActivate: [authGuard, adminGuard]
  },

  // Mantener el enlace usado por el login, pero mostrar el portal de autoservicio actual.
  {
    path: 'consulta-empleado',
    redirectTo: 'portal-empleado',
    pathMatch: 'full'
  },

  // Rutas para ambos roles (solo autenticación)
  {
    path: 'contratos',
    loadComponent: () => import('./pages/contratos-empleados/contratos-empleados.component').then(m => m.ContratosEmpleadosComponent),
    canActivate: [authGuard]
  },

  // Alias histórico usado por el sidebar/notificaciones
  {
    path: 'contratos-empleados',
    loadComponent: () => import('./pages/contratos-empleados/contratos-empleados.component').then(m => m.ContratosEmpleadosComponent),
    canActivate: [authGuard]
  },

  {
    path: 'novedades',
    redirectTo: 'admin-aprobaciones',
    pathMatch: 'full'
  },

  {
    path: 'nueva-novedad',  // ← NUEVA RUTA AGREGADA
    loadComponent: () => import('./pages/nueva-novedad/nueva-novedad.component').then(m => m.NuevaNovedadComponent),
    canActivate: [authGuard, adminGuard]
  },

  {
    path: 'pago-nomina',
    loadComponent: () => import('./pages/pago-nomina/pago-nomina.component').then(m => m.PagoNominaComponent),
    canActivate: [authGuard]
  },

  {
    path: 'pago-individual',
    loadComponent: () => import('./pages/pago-individual/pago-individual.component').then(m => m.PagoIndividualComponent),
    canActivate: [authGuard]
  },

  {
    path: 'periodos-nomina',
    loadComponent: () => import('./pages/periodos-nomina/periodos-nomina.component').then(m => m.PeriodosNominaComponent),
    canActivate: [authGuard]
  },

  // NUEVA RUTA: HISTORIAL GENERAL
  {
    path: 'historial',
    loadComponent: () => import('./pages/historial/historial.component').then(m => m.HistorialComponent),
    canActivate: [authGuard, adminGuard]
  },

  // NUEVA RUTA: OPTIMIZACIÓN DE TURNOS
  {
    path: 'optimizacion',
    loadComponent: () => import('./pages/optimizacion/optimizacion.component').then(m => m.OptimizacionComponent),
    canActivate: [authGuard, adminGuard]
  },


  // Ruta comodín
  { path: '**', redirectTo: '/login' }
];