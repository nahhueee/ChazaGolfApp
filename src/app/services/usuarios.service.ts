import { inject, Injectable } from '@angular/core';
import { FiltroGral } from '../models/filtros/FiltroGral';
import { Usuario } from '../models/Usuario';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';

@Injectable({
  providedIn: 'root'
})
export class UsuariosService {
  private apiService = inject(ApiService);

  //#region OBTENER
  ObtenerUsuarios(filtro:FiltroGral): Observable<any> {
    return this.apiService.post('usuarios/obtener', filtro)
  }

  ObtenerUsuarioxId(id:number): Observable<any> {
    return this.apiService.get(`usuarios/obtener-usuario/${id}`)
  }
  ObtenerUsuarioxUsername(usuario:string): Observable<any> {
    return this.apiService.get(`usuarios/obtener-usuario/${usuario}`)
  }

  SelectorUsuarios(): Observable<any> {
    return this.apiService.get('usuarios/selector')
  }

  SelectorCargos(): Observable<any> {
    return this.apiService.get('usuarios/selector-cargos')
  }

  ValidarUsuario(usuario: string): Observable<any> {
    return this.apiService.get<boolean>(`usuarios/validar/${usuario}`);
  }
  //#endregion

  //#region ABM
  Agregar(usr:Usuario): Observable<any>{
    return this.apiService.post('usuarios/agregar', usr)
  }

  Modificar(usr:Usuario): Observable<any>{
    return this.apiService.put('usuarios/modificar', usr)
  }

  Eliminar(id:number): Observable<any>{
    return this.apiService.delete(`usuarios/eliminar/${id}`)
  }
  //#endregion

}
