import { Injectable } from '@angular/core';
import { HttpEvent, HttpInterceptor, HttpHandler, HttpRequest, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, finalize } from 'rxjs/operators';
import { NgxSpinnerService } from 'ngx-spinner';
import { SOLICITUD_SILENCIOSA } from './http-contexts';

@Injectable()
export class InterceptorService implements HttpInterceptor {

  constructor(private spinner: NgxSpinnerService) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // Consultas de fondo (ver SOLICITUD_SILENCIOSA): sin spinner de pantalla completa.
    if (req.context.get(SOLICITUD_SILENCIOSA)) {
      return next.handle(req);
    }

    this.spinner.show();

    return next.handle(req).pipe(
      catchError((error: HttpErrorResponse) => {
        return throwError(() => error);
      }),
      finalize(() => {
        this.spinner.hide();
      })
    );
  }
}
