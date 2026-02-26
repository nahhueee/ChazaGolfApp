import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';

@Injectable({
  providedIn: 'root'
})
export class MiscService {
  constructor(private apiService:ApiService) {}
 
  //#region OBTENER
  ObtenerLineasTalle(): Observable<any> {
    return this.apiService.get('misc/lineas-talle')
  }
  ObtenerProcesos(): Observable<any> {
    return this.apiService.get('misc/procesos')
  }
  ObtenerTiposProducto(): Observable<any> {
    return this.apiService.get('misc/tipos-producto')
  }
  ObtenerSubtiposProducto(): Observable<any> {
    return this.apiService.get('misc/subtipos-producto')
  }
  ObtenerMateriales(): Observable<any> {
    return this.apiService.get('misc/materiales')
  }
  ObtenerGeneros(): Observable<any> {
    return this.apiService.get('misc/generos')
  }
  ObtenerColores(): Observable<any> {
    return this.apiService.get('misc/colores')
  }
  ObtenerTalles(): Observable<any> {
    return this.apiService.get('misc/talles')
  }
  ObtenerTemporadas(): Observable<any> {
    return this.apiService.get('misc/temporadas')
  }
  ObtenerCondicionesIva(): Observable<any> {
    return this.apiService.get('misc/condiciones-iva')
  }
  ObtenerComprobantes(empresa:string, condicionIva:number): Observable<any> {
    return this.apiService.get('misc/comprobantes/'+ empresa + '/' + condicionIva)
  }
  ObtenerServicios(): Observable<any> {
    return this.apiService.get('misc/servicios')
  }
  ObtenerMetodosPago(): Observable<any> {
    return this.apiService.get('misc/metodos-pago')
  }
  ObtenerProcesosVenta(tipo:string): Observable<any> {
    return this.apiService.get('misc/procesos-venta/'+ tipo)
  }
  ObtenerEmpresas(): Observable<any> {
    return this.apiService.get('misc/empresas')
  }
  ObtenerPuntosVenta(): Observable<any> {
    return this.apiService.get('misc/puntos-venta')
  }
  ObtenerTiposDescuento(): Observable<any> {
    return this.apiService.get('misc/tipos-descuento')
  }
  //#endregion
}
