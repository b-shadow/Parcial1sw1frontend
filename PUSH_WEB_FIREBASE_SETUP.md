# Configuracion Push Web (Firebase Cloud Messaging)

Esta guia deja listo el frontend para notificaciones push en navegador, tanto en local como produccion.

## 1) Archivos ya preparados

- `src/app/nucleo/notificaciones/push-web.service.ts`
- `src/firebase-messaging-sw.js`
- `src/environments/environment.ts`
- `src/environments/environment.prod.ts`
- `angular.json` (assets para publicar el service worker)

## 2) Datos que debes sacar de Firebase

En Firebase Console -> Project settings -> General -> Your apps (Web app):

- `apiKey`
- `authDomain`
- `projectId`
- `storageBucket`
- `messagingSenderId`
- `appId`

En Firebase Console -> Cloud Messaging -> Web configuration:

- `VAPID key` (clave publica)

## 3) Donde pegar tus datos (LOCAL)

### 3.1 `src/environments/environment.ts`

Reemplaza:

- `REEMPLAZAR_API_KEY_DEV`
- `REEMPLAZAR_AUTH_DOMAIN_DEV`
- `REEMPLAZAR_PROJECT_ID_DEV`
- `REEMPLAZAR_STORAGE_BUCKET_DEV`
- `REEMPLAZAR_MESSAGING_SENDER_ID_DEV`
- `REEMPLAZAR_APP_ID_DEV`
- `REEMPLAZAR_VAPID_KEY_DEV`

### 3.2 `src/firebase-messaging-sw.js`

En bloque `isLocalhost ? { ... }` reemplaza los mismos valores `*_DEV`.

## 4) Donde pegar tus datos (PRODUCCION)

### 4.1 `src/environments/environment.prod.ts`

Reemplaza:

- `REEMPLAZAR_API_KEY_PROD`
- `REEMPLAZAR_AUTH_DOMAIN_PROD`
- `REEMPLAZAR_PROJECT_ID_PROD`
- `REEMPLAZAR_STORAGE_BUCKET_PROD`
- `REEMPLAZAR_MESSAGING_SENDER_ID_PROD`
- `REEMPLAZAR_APP_ID_PROD`
- `REEMPLAZAR_VAPID_KEY_PROD`

### 4.2 `src/firebase-messaging-sw.js`

En bloque `: { ... }` (produccion) reemplaza los valores `*_PROD`.

## 5) Endpoint de registro de token en backend

El frontend ya intenta registrar token en:

- `POST {apiUrl}/api/v1/notificaciones/device-token`

Payload enviado:

```json
{
  "token": "<fcm_web_token>",
  "plataforma": "WEB",
  "userAgent": "<navigator.userAgent>",
  "timezone": "<IANA timezone>",
  "idioma": "<navigator.language>"
}
```

Si ese endpoint aun no existe, no rompe la app (falla silenciosa), pero para push real servidor->cliente debes implementarlo.

## 6) Flujo actual de inicializacion

1. Usuario inicia sesion.
2. `AppShellComponent` llama `PushWebService.initializeForAuthenticatedUser()`.
3. Solicita permiso de notificaciones al navegador.
4. Registra `firebase-messaging-sw.js`.
5. Obtiene token FCM web.
6. Guarda token en `localStorage` (`fcmWebToken`).
7. Intenta registrar token en backend.
8. Escucha mensajes en foreground (`onMessage`) y muestra `Notification`.
9. En background, `firebase-messaging-sw.js` muestra notificacion.

## 7) Como probar en local

1. Levanta backend en `http://localhost:8080`.
2. Levanta frontend con `npm run start` en `http://localhost:4200`.
3. Inicia sesion en frontend.
4. Acepta permiso de notificaciones del navegador.
5. Verifica en DevTools -> Application -> Local Storage que exista `fcmWebToken`.
6. Desde Firebase Console (Cloud Messaging) envia un mensaje de prueba al token.

## 8) Como probar en produccion

1. Despliega frontend en dominio HTTPS (requerido para push web, excepto localhost).
2. Inicia sesion y concede permiso.
3. Verifica token guardado y registro en backend.
4. Envia push y valida foreground/background.

## 9) Notas importantes

- Para navegadores, push en produccion requiere HTTPS.
- `apiKey` de Firebase web no es secreta, pero debes proteger reglas y backend.
- Mantener sincronizados los valores entre `environment*.ts` y `firebase-messaging-sw.js`.
- Si cambias de proyecto Firebase, regenera VAPID key.
