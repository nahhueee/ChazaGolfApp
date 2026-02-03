import { inject, Injectable } from '@angular/core';
import { FiltroGral } from '../models/filtros/FiltroGral';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';

@Injectable({
  providedIn: 'root'
})
export class CuentasCorrientesService {
  private apiService = inject(ApiService);

  //#region OBTENER
  ObtenerCuentas(filtro:FiltroGral): Observable<any> {
    return this.apiService.post('cuentas/obtener', filtro)
  }

  ObtenerDeudaTotalCliente(idCliente:number): Observable<any> {
    return this.apiService.get('cuentas/deuda-cliente/' + idCliente)
  }
  //#endregion

  EntregaDineroVenta(idVenta:number, idCliente:number, totalDeuda:number, pagos:any): Observable<any> {
    return this.apiService.put('cuentas/actualizar-pago', {idVenta, idCliente, totalDeuda, pagos})
  }

  EntregaDinero(idCliente:number, idMetodo:number, monto:number): Observable<any> {
    return this.apiService.put('cuentas/entrega', {idCliente, idMetodo, monto})
  }

}
