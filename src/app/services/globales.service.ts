import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';

@Injectable({
  providedIn: 'root'
})
export class GlobalesService {
  constructor(private apiService: ApiService) {}

  //Metodo para Estandarizar los nros decimales
  EstandarizarDecimal(numero:string):number{
    if(numero == "") return 0;
    const formatNro = numero.replace(/\./g, '').replace(',', '.');

    return parseFloat(formatNro);
  }

  //#region LOGS (F2 - HANDOFF blindaje facturacion y logs)

  // Reporta un error de JS/Angular no atrapado (GlobalErrorHandlerService).
  GuardarLogFrontend(mensaje: string, stack?: string, context?: Record<string, any>): Observable<any> {
    return this.apiService.post('logs/front', { message: mensaje, stack, context });
  }

  // Log centralizado de errores (backend), con filtros y paginación.
  ObtenerLogs(params: { limit?: number; offset?: number; severity?: string; code?: string; requestId?: string } = {}): Observable<any> {
    const queryParams = new URLSearchParams();
    if (params.limit     != null) queryParams.set('limit',     String(params.limit));
    if (params.offset    != null) queryParams.set('offset',    String(params.offset));
    if (params.severity)          queryParams.set('severity',  params.severity);
    if (params.code)              queryParams.set('code',      params.code);
    if (params.requestId)         queryParams.set('requestId', params.requestId);

    const query = queryParams.toString();
    return this.apiService.get(`logs${query ? '?' + query : ''}`);
  }

  // Limpia el log de errores centralizado. Solo ADMINISTRADOR (ver logsRoute.ts).
  LimpiarLogs(): Observable<any> {
    return this.apiService.delete<any>('logs/');
  }
  //#endregion
}
