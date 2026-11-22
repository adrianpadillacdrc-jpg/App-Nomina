import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface ChatMessage {
  role: 'user' | 'model';
  content: string;
}

export interface ChatResponse {
  answer: string;
}

@Injectable({ providedIn: 'root' })
export class ChatbotService {
  private readonly apiUrl = environment.apiUrl;

  constructor(private readonly http: HttpClient) {}

  sendAdminMessage(
    message: string,
    history: ChatMessage[],
    conversationId: string
  ): Observable<ChatResponse> {
    return this.http.post<ChatResponse>(
      `${this.apiUrl}/api/chat/admin`,
      { message, history, conversationId }
    );
  }

  sendEmployeeMessage(
    message: string,
    history: ChatMessage[],
    portalToken: string,
    conversationId: string
  ): Observable<ChatResponse> {
    const headers = new HttpHeaders({ Authorization: `Bearer ${portalToken}` });
    return this.http.post<ChatResponse>(
      `${this.apiUrl}/api/portal/chat`,
      { message, history, conversationId },
      { headers }
    );
  }
}
