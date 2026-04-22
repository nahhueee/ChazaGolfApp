import { inject, Injectable } from '@angular/core';
import { FiltroGral } from '../models/filtros/FiltroGral';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { FiltroClientes, FiltroVentasCliente } from '../models/filtros/FiltroClientes';

@Injectable({
  providedIn: 'root'
})
export class CuentasCorrientesService {
  private apiService = inject(ApiService);

  //#region OBTENER
  ObtenerCuentas(filtro:FiltroClientes): Observable<any> {
    return this.apiService.post('cuentas/obtener', filtro)
  }

  ObtenerVentasCliente(filtro:FiltroVentasCliente): Observable<any> {
    return this.apiService.post('cuentas/ventas-cliente', filtro)
  }

  ObtenerVentasClienteReporte(filtro:FiltroVentasCliente): Observable<any> {
    return this.apiService.post('cuentas/ventas-cliente-reporte', filtro)
  }
  
  ObtenerSaldoTotalCliente(idCliente:number): Observable<any> {
    return this.apiService.get('cuentas/saldo-cliente/' + idCliente)
  }
  
  ObtenerRecibo(idRecibo:number): Observable<any> {
    return this.apiService.get('cuentas/recibo/' + idRecibo)
  }
  //#endregion

  EntregaDineroVenta(idVenta:number, idCliente:number, totalDeuda:number, pagos:any): Observable<any> {
    return this.apiService.put('cuentas/actualizar-pago', {idVenta, idCliente, totalDeuda, pagos})
  }

  EntregaDinero(idCliente:number, idMetodo:number, monto:number, observaciones:string): Observable<any> {
    return this.apiService.put('cuentas/entrega', {idCliente, idMetodo, monto, observaciones})
  }

}
