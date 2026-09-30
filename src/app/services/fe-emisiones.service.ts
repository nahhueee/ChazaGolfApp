import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';

// F4.3 - HANDOFF blindaje facturacion y logs. Pantalla "Pendientes fiscales".
@Injectable({
  providedIn: 'root'
})
export class FeEmisionesService {
  private apiService = inject(ApiService);

  ObtenerPendientes(): Observable<any> {
    return this.apiService.get('fe-emisiones');
  }

  ObtenerHistorial(): Observable<any> {
    return this.apiService.get('fe-emisiones/historial');
  }

  VerificarEnArca(id: number): Observable<any> {
    return this.apiService.post(`fe-emisiones/${id}/verificar`, {});
  }

  Regularizar(id: number, motivo: string): Observable<any> {
    return this.apiService.post(`fe-emisiones/${id}/regularizar`, { motivo });
  }
}
