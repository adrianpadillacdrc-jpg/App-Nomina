import { CommonModule } from '@angular/common';
import { Component, ElementRef, Input, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ChatMessage, ChatbotService } from '../../services/chatbot.service';

type ChatRole = 'admin' | 'employee';

interface ChatLine {
  role: ChatMessage['role'];
  content: string;
}

@Component({
  selector: 'app-chatbot-widget',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './chatbot-widget.component.html',
  styleUrl: './chatbot-widget.component.scss'
})
export class ChatbotWidgetComponent {
  @Input() mode: ChatRole = 'admin';
  @Input() portalToken: string | null = null;
  @ViewChild('messageList') private messageList?: ElementRef<HTMLElement>;

  abierto = false;
  enviando = false;
  texto = '';
  error = '';
  mensajes: ChatLine[] = [];
  private readonly conversationId = crypto.randomUUID();

  constructor(private readonly chatbotService: ChatbotService) {}

  get titulo(): string {
    return 'NUMA CHAT';
  }

  get avisoPrivacidad(): string {
    return this.mode === 'employee'
      ? 'Tus consultas personales usan solo tus datos de nómina y se procesan con Gemini.'
      : 'Consulta información operativa. El asistente no ejecuta cambios ni aprobaciones.';
  }

  toggle(): void {
    this.abierto = !this.abierto;
    if (this.abierto && this.mensajes.length === 0) {
      this.mensajes.push({
        role: 'model',
        content: this.mode === 'admin'
          ? '¡Hola! Soy NUMA BOT. ¿Qué necesitas saber de personal o nómina?'
          : '¡Hola! Soy NUMA BOT. ¿Qué necesitas saber de tu nómina o pagos?'
      });
      this.scrollAlFinal();
    }
  }

  enviar(): void {
    const pregunta = this.texto.trim();
    if (!pregunta || this.enviando) return;
    if (this.mode === 'employee' && !this.portalToken) {
      this.error = 'Inicia sesión de nuevo en el portal para usar el asistente.';
      return;
    }

    const history = this.mensajes.slice(-10).map(({ role, content }) => ({ role, content }));
    this.mensajes.push({ role: 'user', content: pregunta });
    this.texto = '';
    this.error = '';
    this.enviando = true;
    this.scrollAlFinal();

    const response = this.mode === 'admin'
      ? this.chatbotService.sendAdminMessage(pregunta, history, this.conversationId)
      : this.chatbotService.sendEmployeeMessage(
        pregunta,
        history,
        this.portalToken!,
        this.conversationId
      );

    response.subscribe({
      next: ({ answer }) => {
        this.mensajes.push({ role: 'model', content: answer });
        this.enviando = false;
        this.scrollAlFinal();
      },
      error: (err) => {
        this.error = err.status === 503
          ? 'Falta configurar GEMINI_API_KEY en el servidor.'
          : err.status === 401
            ? 'La sesión venció. Inicia sesión de nuevo para continuar.'
            : 'No se pudo obtener una respuesta. Intenta de nuevo.';
        this.enviando = false;
        this.scrollAlFinal();
      }
    });
  }

  onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.enviar();
    }
  }

  private scrollAlFinal(): void {
    setTimeout(() => {
      const element = this.messageList?.nativeElement;
      if (element) element.scrollTop = element.scrollHeight;
    });
  }
}
