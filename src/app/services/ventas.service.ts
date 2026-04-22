import { inject, Injectable } from '@angular/core';
import { FiltroGral } from '../models/filtros/FiltroGral';
import { Usuario } from '../models/Usuario';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { Venta } from '../models/Factura';
import { ObjFacturar } from '../models/ObjFacturar';
import { FiltroVenta } from '../models/filtros/FiltroVenta';

@Injectable({
  providedIn: 'root'
})
export class VentasService {
  private apiService = inject(ApiService);

  //#region OBTENER
  ObtenerVentas(filtro:FiltroVenta): Observable<any> {
    return this.apiService.post('ventas/obtener', filtro)
  }
  ObtenerVenta(idVenta:number): Observable<any> {
    return this.apiService.get(`ventas/obtener-una/${idVenta}`);
  }
  ObtenerVentaCuenta(idVenta:number): Observable<any> {
    return this.apiService.get(`ventas/obtener-venta-cuenta/${idVenta}`);
  }
  ObtenerProximoNroProceso(idProceso:number): Observable<any> {
    return this.apiService.get(`ventas/obtener-proximo/` + idProceso);
  }
  ObtenerVentasCliente(idCliente:number, nroEditando:number): Observable<any> {
    const body = {idCliente, nroEditando}
    return this.apiService.post(`ventas/obtener-cliente`, body);
  }
  VerificarNroNota(nroNota:number): Observable<any> {
    return this.apiService.get(`ventas/verificar-nota/` + nroNota);
  }
  //#endregion

  //#region ABM
  Agregar(venta:Venta, desdeNotas:boolean = false): Observable<any>{
    return this.apiService.post('ventas/agregar', {venta, desdeNotas})
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
  AprobarVenta(idVenta:number): Observable<any>{
    return this.apiService.put(`ventas/aprobar`, {idVenta})
  }
}
