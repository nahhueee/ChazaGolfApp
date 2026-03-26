import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { Producto } from '../models/Producto';
import { FiltroGral } from '../models/filtros/FiltroGral';
import { Servicio } from '../models/Servicio';
import { OrdenIngreso } from '../models/OrdenIngreso';
import { FiltroOrdenes } from '../models/filtros/FIltroOrdenes';

@Injectable({
  providedIn: 'root'
})
export class OrdenIngresoService {
  constructor(private apiService:ApiService) {}

  //#region OBTENER
  Obtener(filtro:FiltroOrdenes): Observable<any> {
    return this.apiService.post('orden-ingreso/obtener', filtro)
  }
  
  ObtenerOrdenIngreso(id:number): Observable<any>{
    return this.apiService.get(`orden-ingreso/obtener/${id}`)
  }
  //#endregion

  //#region ABM
  Agregar(orden:OrdenIngreso): Observable<any>{
    return this.apiService.post('orden-ingreso/agregar', orden)
  }
  
  Modificar(orden:OrdenIngreso): Observable<any>{
    return this.apiService.put('orden-ingreso/modificar', orden)
  }

  Eliminar(id:number): Observable<any>{
    return this.apiService.delete(`orden-ingreso/eliminar/${id}`)
  }
  //#endregion
}
