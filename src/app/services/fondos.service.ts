import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { FiltrosFondos } from '../models/filtros/FiltroFondos';
import { MovimientoFondo } from '../models/Movimiento';

@Injectable({
  providedIn: 'root'
})
export class FondosService {
  constructor(private apiService:ApiService) {}
  
  ObtenerCajas(): Observable<any> {
    return this.apiService.get('fondos/cajas')
  }
  ObtenerResumen(filtro:FiltrosFondos): Observable<any> {
    return this.apiService.post('fondos/resumen', filtro)
  }
  ObtenerResumenFondos(filtro:FiltrosFondos): Observable<any> {
    return this.apiService.post('fondos/resumen-fondos', filtro)
  }
  ObtenerMovimientos(filtro:FiltrosFondos): Observable<any> {
    return this.apiService.post('fondos/movimientos', filtro)
  }
  RegistrarMovimiento(movimiento:MovimientoFondo): Observable<any> {
    return this.apiService.post('fondos/registrar-movimiento', movimiento)
  }
}
