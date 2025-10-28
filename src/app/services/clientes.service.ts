import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { FiltroGral } from '../models/filtros/FiltroGral';
import { Cliente } from '../models/Cliente';
import { Observable } from 'rxjs';
import { ParametrosService } from './parametros.service';
import { ApiService } from './api.service';

@Injectable({
  providedIn: 'root'
})
export class ClientesService {
  constructor(private apiService:ApiService) {}
  
  //#region OBTENER
  ObtenerClientes(filtro:FiltroGral): Observable<any> {
    return this.apiService.post('clientes/obtener', filtro)
  }
  ObtenerCliente(id:number): Observable<any> {
    return this.apiService.get(`clientes/obtener-cliente/${id}`)
  }
  SelectorClientes(): Observable<any> {
    return this.apiService.get('clientes/selector')
  }
  //#endregion

  //#region ABM
  Agregar(cli:Cliente): Observable<any>{
    return this.apiService.post('clientes/agregar', cli)
  }

  Modificar(cli:Cliente): Observable<any>{
    return this.apiService.put('clientes/modificar', cli)
  }

  Eliminar(id:number): Observable<any>{
    return this.apiService.delete(`clientes/eliminar/${id}`)
  }
  //#endregion
}
