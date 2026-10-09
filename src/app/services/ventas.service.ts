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
  // Resumen de Notas de Empaque pendientes de control: { total, atrasadas }. Consulta de
  // fondo (la usa el contador del menú): sin spinner ni toasts de error.
  ObtenerNotasEmpaquePendientes(): Observable<any> {
    return this.apiService.getSilencioso('ventas/notas-empaque-pendientes');
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
  Agregar(venta:Venta): Observable<any>{
    return this.apiService.post('ventas/agregar', {venta})
  }

  Modificar(venta:Venta): Observable<any>{
    return this.apiService.put('ventas/modificar', venta)
  }
  //#endregion

  Facturar(objFacturar:ObjFacturar): Observable<any>{
    return this.apiService.post('ventas/facturar', objFacturar)
  }

  // F4.2 - HANDOFF blindaje facturacion y logs. Endpoint unificado: pide el CAE a
  // ARCA y persiste la venta (alta o modificacion, segun `modificando`) en una sola
  // transaccion del lado del backend. Reemplaza a Facturar()+Agregar()|Modificar()
  // para Factura A/B/C y NC/ND A/B/C - Cotizacion y NC X siguen sin pedir CAE, asi
  // que nunca llaman a este metodo (ver facturar-venta.component.ts).
  Emitir(venta:Venta, objFacturar:ObjFacturar, modificando:boolean): Observable<any>{
    return this.apiService.post('ventas/emitir', {venta, objFacturar, modificando})
  }
  // Chequeo preventivo de stock contra la base (ver ValidarStockVenta en el backend) -
  // se llama desde ConfirmarFacturacion() ANTES de abrir el modal de Facturar, para
  // cortar el flujo antes de pedir el CAE a AFIP (accion irreversible).
  ValidarStockVenta(productos:any[]): Observable<any>{
    return this.apiService.post('ventas/validar-stock', {productos})
  }
  ObtenerQR(idventa:number): Observable<any>{
    return this.apiService.get(`ventas/obtenerQR/${idventa}`)
  }
  AprobarVenta(idVenta:number): Observable<any>{
    return this.apiService.put(`ventas/aprobar`, {idVenta})
  }
  DarBajaVenta(idVenta:number, motivo:string): Observable<any>{
    return this.apiService.put(`ventas/dar-baja`, {idVenta, motivo})
  }
}
