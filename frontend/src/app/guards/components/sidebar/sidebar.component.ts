import { Component } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { SidebarNotificacionesComponent } from './sidebar-notificaciones';
import { ChatbotWidgetComponent } from '../../../components/chatbot-widget/chatbot-widget.component';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule, SidebarNotificacionesComponent, ChatbotWidgetComponent],
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.scss']
})
export class SidebarComponent {
  menuAbierto = false;

  constructor(private router: Router, private authService: AuthService) {}

  get esAdministrador(): boolean {
    const rol = this.authService.getUserRole();
    return rol === 'ROLE_ADMIN' || rol === 'ADMIN';
  }

  toggleMenu() {
    this.menuAbierto = !this.menuAbierto;
  }

  cerrarMenu() {
    this.menuAbierto = false;
  }

  cerrarSesion() {
    this.cerrarMenu();
    localStorage.removeItem('loggedIn');
    this.router.navigate(['/login']);
  }
}