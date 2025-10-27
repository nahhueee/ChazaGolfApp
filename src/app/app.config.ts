import { ApplicationConfig, importProvidersFrom, provideBrowserGlobalErrorListeners, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { providePrimeNG } from 'primeng/config';
import { routes } from './app.routes';
import { IndigoPreset } from './themes/indigo';
import { HTTP_INTERCEPTORS, provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { MessageService } from 'primeng/api';
import { HttpErrorHandlerService } from './services/http-error-handler.service';
import { InterceptorService } from './services/interceptor.service';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),

    // HttpClient con soporte para interceptores
    provideHttpClient(withInterceptorsFromDi()), 

    // Servicios
    MessageService,

    // Interceptor de errores
    { provide: HTTP_INTERCEPTORS, useClass: HttpErrorHandlerService, multi: true },
    //Inicia el spinner en cada petición http
    { provide: HTTP_INTERCEPTORS, useClass: InterceptorService, multi: true },

    // Animaciones y PrimeNG
    provideAnimationsAsync(),
    providePrimeNG({
      theme: {
        preset: IndigoPreset,
        options: {
          darkModeSelector: '.dark-mode'
        }
      }
    })
  ]
};
