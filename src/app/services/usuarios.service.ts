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

  // Nombre real del usuario logueado (sesion.data.nombre - ver login.component.ts), a
  // diferencia de GetUsuarioSesion() que devuelve el nombre de usuario/login.
  GetNombreSesion(): string {
    const sesion = this.GetSesion();
    return sesion?.data?.nombre?.toString() || '';
  }

  // Token JWT devuelto por el login (usuariosRoute.ts), usado por ApiService para
  // el header Authorization. Reemplaza al viejo archivo de sesión del backend.
  GetToken(): string | null {
    const sesion = this.GetSesion();
    return sesion?.data?.token || null;
  }


  CerrarSesion(): void {
    localStorage.removeItem('sesion');
  }

  // Gate de UI (mostrar/ocultar acciones) espejando requiereRol('ADMINISTRADOR','ENCARGADO')
  // del backend. NO reemplaza esa validación - el backend es la fuente de verdad, esto solo
  // evita mostrar botones que van a fallar con 403.
  //
  // sesion.data.cargo es el string plano que devuelve usuariosRepository.Login (columna
  // "cargo" del JOIN a la tabla cargos, ver login.component.ts: se guarda tal cual llega de
  // la API, sin pasar por el constructor de Usuario). NO es un objeto {nombre}, a pesar de
  // que el modelo Usuario.cargo sí lo tipa como tal - por eso se soportan ambas formas acá.
  GetCargoSesion(): string {
    const sesion = this.GetSesion();
    const cargo = sesion?.data?.cargo;
    const nombreCargo = typeof cargo === 'string' ? cargo : cargo?.nombre;
    return nombreCargo?.toString().toUpperCase() || '';
  }

  PuedeAjustarStock(): boolean {
    const cargo = this.GetCargoSesion();
    return cargo === 'ADMINISTRADOR' || cargo === 'ENCARGADO';
  }

  //#region OBTENER
  Login(usuario:string, pass:string): Observable<any> {
    return this.apiService.post('usuarios/login', { usuario, pass })
  }

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
