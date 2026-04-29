import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, isSupported, onMessage, type MessagePayload, type Messaging } from 'firebase/messaging';

import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class PushWebService {
  private initialized = false;
  private messaging: Messaging | null = null;

  constructor(private readonly http: HttpClient) {}

  async initializeForAuthenticatedUser(forceSync = false): Promise<void> {
    if (this.initialized && !forceSync) {
      return;
    }

    const accessToken = localStorage.getItem('accessToken');
    if (!accessToken) {
      return;
    }

    const supported = await isSupported().catch(() => false);
    if (!supported || !('serviceWorker' in navigator) || !('Notification' in window)) {
      return;
    }

    if (!this.messaging) {
      const app = initializeApp(environment.firebase);
      this.messaging = getMessaging(app);
    }

    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      return;
    }

    const swRegistration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
    const token = await getToken(this.messaging, {
      vapidKey: environment.firebaseVapidKey,
      serviceWorkerRegistration: swRegistration,
    });

    if (!token) {
      return;
    }

    localStorage.setItem('fcmWebToken', token);
    await this.registerTokenInBackend(token);

    if (!this.initialized) {
      onMessage(this.messaging, (payload: MessagePayload) => {
        const title = payload.notification?.title || payload.data?.['title'] || 'Nueva notificacion';
        const body = payload.notification?.body || payload.data?.['body'] || 'Tienes una actualizacion';
        if (Notification.permission === 'granted') {
          new Notification(title, { body });
        }
      });
    }

    this.initialized = true;
  }

  private async registerTokenInBackend(token: string): Promise<void> {
    const accessToken = localStorage.getItem('accessToken');
    if (!accessToken || !environment.pushTokenRegisterPath) {
      return;
    }

    const payload = {
      token,
      plataforma: 'WEB',
      userAgent: navigator.userAgent,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      idioma: navigator.language,
    };

    const tokenType = localStorage.getItem('tokenType') ?? 'Bearer';
    const headers = new HttpHeaders({ Authorization: `${tokenType} ${accessToken}` });

    await firstValueFrom(this.http.post(`${environment.apiUrl}${environment.pushTokenRegisterPath}`, payload, { headers })).catch(
      (error: unknown) => {
        console.warn('[PUSH_WEB] No se pudo registrar token en backend.', error);
        return undefined;
      },
    );
  }
}
