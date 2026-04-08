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

  GetSesion() {
    const raw = localStorage.getItem("sesion");
    return raw ? JSON.parse(raw) : null;
  }
  GetUsuarioSesion(): string | null {
    const sesion = this.GetSesion();
    return sesion?.data?.usuario?.toString() || '';
  }

  IsSesionValida(minutos = 30): boolean {
    const sesion = this.GetSesion();
    if (!sesion || !sesion.timestamp) return false;

    const ahora = Date.now();
    return (ahora - sesion.timestamp) < minutos * 60 * 1000;
  }

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
