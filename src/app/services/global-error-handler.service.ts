import { HttpErrorResponse } from '@angular/common/http';
import { ErrorHandler, Inject, Injectable, Injector } from '@angular/core';
import { ActivatedRouteSnapshot, Router } from '@angular/router';
import { NotificacionesService } from './notificaciones.service';
import { GlobalesService } from './globales.service';

// F2 - HANDOFF blindaje facturacion y logs.
// ErrorHandler global: captura excepciones de JS/Angular que no fueron atrapadas
// por ningún try/catch ni subscribe({error}) de la app, las reporta al backend
// (POST /logs/front, ver logsRoute.ts) para que queden en la pantalla de Errores,
// y avisa al usuario.
//
// Se registra en app.config.ts: { provide: ErrorHandler, useClass: GlobalErrorHandlerService }.
@Injectable({
  providedIn: 'root'
})
export class GlobalErrorHandlerService implements ErrorHandler {

  constructor(@Inject(Injector) private readonly injector: Injector) { }

  // Inyectados vía Injector (no por constructor) para evitar dependencia
  // circular: este handler puede dispararse mientras Angular todavía está
  // construyendo otros servicios.
  private get Notificaciones() {
    return this.injector.get(NotificacionesService);
  }
  private get GlobalesService() {
    return this.injector.get(GlobalesService);
  }
  private get Router() {
    return this.injector.get(Router);
  }

  /**
   * Pantalla donde ocurrió el error, como PATRÓN de ruta y no como URL concreta,
   * para poder agrupar ocurrencias del mismo bug en la pantalla de Errores.
   * Silencioso: el Router puede no estar inicializado todavía.
   */
  private ObtenerPantalla(): string | undefined {
    try {
      let nodo: ActivatedRouteSnapshot | null = this.Router.routerState.snapshot.root;
      const partes: string[] = [];

      while (nodo) {
        const path = nodo.routeConfig?.path;
        if (path) partes.push(path);
        nodo = nodo.firstChild;
      }

      return partes.length ? '/' + partes.join('/') : undefined;
    } catch {
      return undefined;
    }
  }

  private ultimoError: string = '';
  private tiempoUltimoError: number = 0;

  handleError(error: any) {
    console.error(error);

    // HttpErrorResponse: solo puede llegar acá por una request hecha con
    // HttpClient (rama web de ApiService) que quedó sin manejar. Angular
    // suele envolverla en un ErrorEvent/RuntimeError con la original en
    // '.rejection' o '.originalError' según la versión/zona; cubrimos las
    // formas más comunes en vez de asumir una sola.
    const httpError: HttpErrorResponse | undefined =
      error instanceof HttpErrorResponse ? error
      : error?.rejection instanceof HttpErrorResponse ? error.rejection
      : error?.originalError instanceof HttpErrorResponse ? error.originalError
      : undefined;

    if (httpError) {
      // NOTA (F2 - revisar antes de tocar): en web, HttpErrorHandlerService
      // (interceptor) ya mostró el toast correspondiente a este HttpErrorResponse
      // y ya se logueó server-side en errorMiddleware si el fallo fue del backend
      // (no aplica para status 0, sin conexión). No duplicamos ni el toast ni el
      // reporte a /logs/front acá.
      return;
    }

    let mensaje = 'Error desconocido';
    if (error?.message) {
      mensaje = error.message;
    } else if (typeof error === 'string') {
      mensaje = error;
    }

    const ahora = Date.now();
    // Si el mismo error se repite dentro de 2 segundos, lo ignoramos (evita
    // saturar el log y el usuario con el mismo bug disparándose en loop).
    if (mensaje === this.ultimoError && (ahora - this.tiempoUltimoError) < 2000) {
      return;
    }
    this.ultimoError = mensaje;
    this.tiempoUltimoError = ahora;

    // La pantalla viaja en context para poder reproducir el bug desde la
    // pantalla de Errores.
    const pantalla = this.ObtenerPantalla();
    const contexto = pantalla ? { ruta: pantalla } : undefined;

    this.GlobalesService.GuardarLogFrontend(mensaje, error?.stack, contexto).subscribe({
      error: (err) => console.error('No se pudo guardar el log de error en el backend', err)
    });

    // NOTA (F2 - revisar, no resuelto en esta fase): ApiService.requestTauri()
    // ya muestra su propio toast para errores de red (tcp connect error,
    // ECONNRESET, catch genérico) ANTES de relanzarlos - ver api.service.ts.
    // Esos errores llegan acá como Error genérico (no HttpErrorResponse) y
    // este handler les muestra un SEGUNDO toast. No lo resolví en F2 porque
    // implica decidir un cambio en api.service.ts (fuera del alcance original
    // de esta fase) y prefiero que lo valides antes de tocarlo. Alternativas:
    //  (a) que ApiService deje de notificar en esos catches y delegue el aviso
    //      acá (cambio más parecido a como quedó EasySales, pero más grande);
    //  (b) marcar esos errores (ej. una clase ErrorYaNotificado extends Error)
    //      para que este handler los reconozca y no vuelva a notificar - cambio
    //      chico, no toca la rama web;
    //  (c) dejarlo así: hoy son solo 2 casos puntuales (falla de conexión TCP,
    //      ECONNRESET) y el doble toast, aunque molesto, no oculta información.
    this.Notificaciones.Warn(
      'Ocurrió un error en la app, si el error persiste probá reiniciar la aplicación'
    );
  }

}
