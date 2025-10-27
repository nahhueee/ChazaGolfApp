import { HttpErrorResponse, HttpEvent, HttpHandler, HttpInterceptor, HttpRequest } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { NotificacionesService } from './notificaciones.service';

@Injectable({
  providedIn: 'root'
})
export class HttpErrorHandlerService  implements HttpInterceptor {

  constructor(
    private Notificaciones:NotificacionesService,     
  ) { }

  //Intercepta todos los errores http en la app
  intercept(
    request: HttpRequest<any>,
    next: HttpHandler
  ): Observable<HttpEvent<any>> {
    return next.handle(request).pipe(
      catchError((err)=>{
        if(err instanceof HttpErrorResponse){

          //Dependiendo el código de error mostramos un mensaje
          switch (err.status) {
            case 0:{
              this.Notificaciones.Error("No se logró la conexion con el servidor");
              break;
            }
            case 500: {
              this.Notificaciones.Error("Ocurrió un error interno en el servidor (500)");
              break;
            }
            case 404: {
              this.Notificaciones.Error("No se encontró el recurso solicitado (404)");
              break;
            }
            case 400: {
              this.Notificaciones.Error('Solicitud incorrecta (400)');
              break;
            }
            default: {
              this.Notificaciones.Error(`Error desconocido (${err.status})`);
              break;
            }
          }
        }
        return throwError(err);
      })
    ) as Observable<HttpEvent<any>>;
  }
}


