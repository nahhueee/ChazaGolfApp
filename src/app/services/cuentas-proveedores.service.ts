import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { FiltroCuentasProveedores } from '../models/filtros/FiltroCuentasProveedores';
import { FiltroComprasProveedor } from '../models/filtros/FiltroComprasProveedor';

@Injectable({
  providedIn: 'root'
})
export class CuentasProveedoresService {
  constructor(private apiService:ApiService) {}

  //#region OBTENER
  ObtenerCuentas(filtro:FiltroCuentasProveedores): Observable<any> {
    return this.apiService.post('compras-cuentas/obtener', filtro)
  }

  ObtenerMovimientosProveedor(filtro:FiltroComprasProveedor): Observable<any> {
    return this.apiService.post('compras-cuentas/movimientos-proveedor', filtro)
  }

  ObtenerPago(idPagoProveedor:number): Observable<any> {
    return this.apiService.get(`compras-cuentas/pago/${idPagoProveedor}`)
  }
  //#endregion

  Pagar(idEmpresa:number, idCaja:number, idProveedor:number, metodos:any[], observaciones?:string): Observable<any> {
    return this.apiService.put('compras-cuentas/pagar', {idEmpresa, idCaja, idProveedor, metodos, observaciones})
  }

  RevertirPago(idPagoProveedor:number): Observable<any> {
    return this.apiService.put('compras-cuentas/revertir-pago', {idPagoProveedor})
  }
}
