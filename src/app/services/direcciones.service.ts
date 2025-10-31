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
export class DireccionesService {
  constructor(private apiService:ApiService) {}
  
  ObtenerProvincias(): Observable<any> {
    return this.apiService.get('direcciones/provincias')
  }
  ObtenerLocalidades(provincia:string, filtro:string): Observable<any> {
    return this.apiService.post(`direcciones/localidades`, {provincia, filtro})
  }
  ObtenerCalles(localidad:number, filtro:string): Observable<any> {
    return this.apiService.post(`direcciones/calles`, {localidad, filtro})
  }
}
