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
import { HashLocationStrategy, LocationStrategy } from '@angular/common';

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
    //Aplica la estrategia # para las recargas, error 404
    { provide: LocationStrategy, useClass: HashLocationStrategy },

    // Animaciones y PrimeNG
    provideAnimationsAsync(),
    providePrimeNG({
      theme: {
        preset: IndigoPreset,
        options: {
          darkModeSelector: '.dark-mode'
        }
      },
      translation: {
        firstDayOfWeek: 1,
        dayNames: [
            'domingo',
            'lunes',
            'martes',
            'miércoles',
            'jueves',
            'viernes',
            'sábado'
        ],

        dayNamesShort: [
            'dom',
            'lun',
            'mar',
            'mié',
            'jue',
            'vie',
            'sáb'
        ],

        dayNamesMin: [
            'D',
            'L',
            'M',
            'X',
            'J',
            'V',
            'S'
        ],

        monthNames: [
            'enero',
            'febrero',
            'marzo',
            'abril',
            'mayo',
            'junio',
            'julio',
            'agosto',
            'septiembre',
            'octubre',
            'noviembre',
            'diciembre'
        ],

        monthNamesShort: [
            'ene',
            'feb',
            'mar',
            'abr',
            'may',
            'jun',
            'jul',
            'ago',
            'sep',
            'oct',
            'nov',
            'dic'
        ],

        today: 'Hoy',
        clear: 'Limpiar'
      }
    })
  ]
};
