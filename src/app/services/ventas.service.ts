import { inject, Injectable } from '@angular/core';
import { FiltroGral } from '../models/filtros/FiltroGral';
import { Usuario } from '../models/Usuario';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { Venta } from '../models/Factura';
import { ObjFacturar } from '../models/ObjFacturar';

@Injectable({
  providedIn: 'root'
})
export class VentasService {
  private apiService = inject(ApiService);

  //#region OBTENER
  ObtenerVentas(filtro:FiltroGral): Observable<any> {
    return this.apiService.post('ventas/obtener', filtro)
  }
  ObtenerVenta(idVenta:number): Observable<any> {
    return this.apiService.get(`ventas/obtener-una/${idVenta}`);
  }
  ObtenerProximoNroProceso(idProceso:number): Observable<any> {
    return this.apiService.get(`ventas/obtener-proximo/` + idProceso);
  }
  ObtenerVentasCliente(idCliente:number, nroEditando:number): Observable<any> {
    const body = {idCliente, nroEditando}
    return this.apiService.post(`ventas/obtener-cliente`, body);
  }
  //#endregion

  //#region ABM
  Agregar(venta:Venta): Observable<any>{
    return this.apiService.post('ventas/agregar', venta)
  }

  Modificar(venta:Venta): Observable<any>{
    return this.apiService.put('ventas/modificar', venta)
  }

  Eliminar(id:number): Observable<any>{
    return this.apiService.delete(`ventas/eliminar/${id}`)
  }
  //#endregion

  Facturar(objFacturar:ObjFacturar): Observable<any>{
    return this.apiService.post('ventas/facturar', objFacturar)
  }
  ObtenerQR(idventa:number): Observable<any>{
    return this.apiService.get(`ventas/obtenerQR/${idventa}`)
  }

}
