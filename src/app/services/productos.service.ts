import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { FiltroProducto } from '../models/filtros/FiltroProducto';
import { Producto } from '../models/Producto';

@Injectable({
  providedIn: 'root'
})
export class ProductosService {
  constructor(private apiService:ApiService) {}

  //#region OBTENER
  ObtenerProductos(filtro:FiltroProducto): Observable<any> {
    return this.apiService.post('productos/obtener', filtro)
  }

  ObtenerProducto(id:number): Observable<any> {
    return this.apiService.get(`productos/obtener-uno/${id}`);
  }

  BuscarProductos(filtro:string): Observable<any>{
    return this.apiService.get(`productos/buscar-productos/${filtro}`)
  }
  //#endregion


  //#region ABM
  Agregar(prod:Producto): Observable<any>{
    return this.apiService.post('productos/agregar', prod)
  }
  
  Modificar(prod:Producto): Observable<any>{
    return this.apiService.put('productos/modificar', prod)
  }

  Eliminar(id:number): Observable<any>{
    return this.apiService.delete(`productos/eliminar/${id}`)
  }

  ActualizarPrecios(prod:Producto): Observable<any>{
    return this.apiService.put('productos/actualizar-precio', prod)
  }

  ActualizarImagen(imagen:string, idProducto:number){
    return this.apiService.put('productos/actualizar-imagen', {imagen, idProducto})
  }
  //#endregion
}
