import { inject, Injectable } from '@angular/core';
import { FiltroGral } from '../models/filtros/FiltroGral';
import { Usuario } from '../models/Usuario';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { Venta } from '../models/Factura';

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

}
