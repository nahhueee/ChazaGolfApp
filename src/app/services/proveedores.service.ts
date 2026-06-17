import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Proveedor } from '../models/Proveedor';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { FiltroProveedores } from '../models/filtros/FiltroProveedores';

@Injectable({
  providedIn: 'root'
})
export class ProveedoresService {
  constructor(private apiService:ApiService) {}

  //#region OBTENER
  ObtenerProveedores(filtro:FiltroProveedores): Observable<any> {
    return this.apiService.post('proveedores/obtener', filtro)
  }
  ObtenerProveedor(id:number): Observable<any> {
    return this.apiService.get(`proveedores/obtener-proveedor/${id}`)
  }
  SelectorProveedores(): Observable<any> {
    return this.apiService.get('proveedores/selector')
  }
  //#endregion

  //#region ABM
  Agregar(proveedor:Proveedor): Observable<any>{
    return this.apiService.post('proveedores/agregar', proveedor)
  }

  Modificar(proveedor:Proveedor): Observable<any>{
    return this.apiService.put('proveedores/modificar', proveedor)
  }

  Eliminar(id:number): Observable<any>{
    return this.apiService.delete(`proveedores/eliminar/${id}`)
  }
  //#endregion
}
