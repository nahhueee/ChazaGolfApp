import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { Compra } from '../models/Compra';
import { FiltroCompras } from '../models/filtros/FiltroCompras';

@Injectable({
  providedIn: 'root'
})
export class ComprasService {
  constructor(private apiService:ApiService) {}

  //#region OBTENER
  ObtenerCompras(filtro:FiltroCompras): Observable<any> {
    return this.apiService.post('compras/obtener', filtro)
  }
  ObtenerCompra(idCompra:number): Observable<any> {
    return this.apiService.get(`compras/obtener-una/${idCompra}`)
  }
  SelectorMetodosPago(idEmpresa:number): Observable<any> {
    return this.apiService.get(`compras/metodos-pago/${idEmpresa}`)
  }
  //#endregion

  //#region ABM
  // No existe Modificar: el flujo de negocio es dar de baja la compra y agregar una nueva.
  Agregar(compra:Compra): Observable<any>{
    return this.apiService.post('compras/agregar', compra)
  }

  Eliminar(id:number): Observable<any>{
    return this.apiService.put('compras/eliminar', {id})
  }
  //#endregion
}
