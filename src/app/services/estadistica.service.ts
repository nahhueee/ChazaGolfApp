import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';

@Injectable({
  providedIn: 'root'
})
export class EstadisticasService {
  constructor(private apiService:ApiService) {}
  
  ObtenerTotalesVenta(filtro:any): Observable<any> {
    return this.apiService.post('estadisticas/totales-venta', filtro)
  }
  ObtenerTotalesPorMetodoPago(filtro:any): Observable<any> {
    return this.apiService.post('estadisticas/totales-metodo-pago', filtro)
  }
  ObtenerTotalesPorComprobante(filtro:any): Observable<any> {
    return this.apiService.post('estadisticas/totales-comprobante', filtro)
  }
  ObtenerTotalesPorProceso(filtro:any): Observable<any> {
    return this.apiService.post('estadisticas/totales-proceso', filtro)
  }
}
