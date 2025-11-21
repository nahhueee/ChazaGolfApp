import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { Producto } from '../models/Producto';
import { FiltroGral } from '../models/filtros/FiltroGral';
import { Servicio } from '../models/Servicio';

@Injectable({
  providedIn: 'root'
})
export class ServiciosService {
  constructor(private apiService:ApiService) {}

  //#region OBTENER
  Obtener(filtro:FiltroGral): Observable<any> {
    return this.apiService.post('servicios/obtener', filtro)
  }
  Selector(): Observable<any> {
    return this.apiService.get('servicios/selector')
  }
    //#endregion

  //#region ABM
  Agregar(serv:Servicio): Observable<any>{
    return this.apiService.post('servicios/agregar', serv)
  }
  
  Modificar(serv:Servicio): Observable<any>{
    return this.apiService.put('servicios/modificar', serv)
  }

  Eliminar(id:number): Observable<any>{
    return this.apiService.delete(`servicios/eliminar/${id}`)
  }
  //#endregion
}
