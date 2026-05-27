import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { MovimientoFondo } from '../models/Movimiento';
import { Caja } from '../models/Caja';
import { DetalleMetodoPago, FiltrosFondos, ResumenCaja, ResumenFondo } from '../models/Fondos';

@Injectable({
  providedIn: 'root'
})
export class FondosService {
  constructor(private apiService:ApiService) {}
  
  SelectorCajas(): Observable<Caja[] | any> {
    return this.apiService.get('fondos/cajas')
  }
  ObtenerCajasConFondos(): Observable<Caja[] | any> {
    return this.apiService.get('fondos/cajas-con-fondos');
  }
  ObtenerResumen(filtro:FiltrosFondos): Observable<ResumenCaja | any> {
    return this.apiService.post('fondos/resumen', filtro)
  }
  ObtenerResumenFondosPorCaja(filtro: FiltrosFondos): Observable<ResumenFondo[] | any> {
    return this.apiService.post('fondos/resumen-fondos', filtro);
  }
  ObtenerDetalleMetodosPago(filtro: FiltrosFondos): Observable<DetalleMetodoPago[] | any> {
    return this.apiService.post('fondos/detalle-metodos-pago', filtro);
  }
  ObtenerMovimientos(filtro:FiltrosFondos): Observable<any> {
    return this.apiService.post('fondos/movimientos', filtro)
  }
  RegistrarMovimiento(movimiento:MovimientoFondo): Observable<any> {
    return this.apiService.post('fondos/registrar-movimiento', movimiento)
  }
  RegistrarTransferencia(transferencia:any): Observable<any> {
    return this.apiService.post('fondos/registrar-transferencia', transferencia)
  }
}
