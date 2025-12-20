import { inject, Injectable } from '@angular/core';
import { environment } from '../environments/environment';
import { Observable } from 'rxjs/internal/Observable';
import { DatosServidor } from '../models/DatosServidor';
import { ApiService } from './api.service';

@Injectable({
  providedIn: 'root'
})
export class ParametrosService {
private apiService = inject(ApiService);

  //#region LOCAL STORAGE
  GetDatosServidor():DatosServidor{
    const datosAlmacenados = localStorage.getItem('serverEasyStore');
    let datosServidor:DatosServidor;

    if(datosAlmacenados==null){
      datosServidor = new DatosServidor({
        apiUrl:environment.apiUrl,
        modo:"local",
        esServer:false
      })
    }else{
      datosServidor = new DatosServidor(JSON.parse(datosAlmacenados));
    }
    return datosServidor;
  }

  GetDatosComputadorHabilitado(){
    const datosAlmacenados = localStorage.getItem('datosComputador');
    const datosComputador = datosAlmacenados ? JSON.parse(datosAlmacenados) : null;
    return datosComputador;
  }

  EsDark():boolean{
    return String(localStorage.getItem('dark')) == 'true' ? true : false;
  }
  SetDark(value:string){
    localStorage.setItem('dark', value)
  }

  GetTema():string{
    return String(localStorage.getItem('tema'));
  }
  SetTema(value:string){
    localStorage.setItem('tema', value)
  }
  
  GetNombreLocal():string{
    let local = localStorage.getItem('local');
    if(local == null)
      local = "CHAZA GOLF";  

    return local;
  }
  SetNombreLocal(local:string){
    localStorage.setItem('local',local);
  }

  GetVistaProductos():string{
    let vistaProd = localStorage.getItem('vistaProd');
    if(vistaProd == null)
      vistaProd = "lista";  

    return vistaProd;
  }
  SetVistaProductos(vistaProd:string){
    localStorage.setItem('vistaProd', vistaProd);
  }

  GetImpresora():string{
    let imp = localStorage.getItem('impresora');
    if(imp == null)
      imp = "";

    return imp;
  }
  SetImpresora(impresora:string){
    localStorage.setItem('impresora',impresora);
  }

  GetPapel():string{
    let pap = localStorage.getItem('papel');
    if(pap == null)
      pap = "58mm";

    return pap;
  }
  SetPapel(papel:string){
    localStorage.setItem('papel',papel);
  }

  //otros
  GetEdicionResultadoUnico():boolean{
    const edicion = localStorage.getItem('edicionResultadoUnico');
    if(edicion === 'true')
       return true;

    return false;
  }
  SetEdicionResultadoUnico(valor:string){
    localStorage.setItem('edicionResultadoUnico',valor);
  }

  //Permisos
  PermitirVentasyTotales():boolean{
    const vyt = localStorage.getItem('ventasYtotales');

    if(vyt === 'true')
       return true;

    return false;
  }

  PermitirResumenCaja():boolean{
    const vrc = localStorage.getItem('resumenCaja');
    if(vrc === 'true')
       return true;

    return false;
  }
  
  VerVentasCliente():boolean{
    const ventasCli = localStorage.getItem('ventasCliente');

    if(ventasCli === 'true')
       return true;

    return false;
  }

  PermitirCambioPrecio():boolean{
    const cambioPre = localStorage.getItem('cambioPrecio');

    if(cambioPre === 'true')
       return true;

    return false;
  }
  //#endregion


//#region PARAMETROS BASE DE DATOS
  ObtenerParametro(clave:string): Observable<any> {
    return this.apiService.get(`parametros/obtener/${clave}`)
  }
  ObtenerParametrosFacturacion(): Observable<any> {
    return this.apiService.get(`parametros/obtener-facturacion/`)
  }
  ObtenerEstadoServidor(): Observable<any> {
    return this.apiService.get(`server/estado`)
  }
  ActualizarParametro(clave:string, valor:string): Observable<any> {
    return this.apiService.put(`parametros/actualizar/`, {clave, valor})
  }
  GuardarParametrosBackup(data:any): Observable<any> {
    return this.apiService.post(`parametros/actualizar-backups/`, data)
  }
  GuardarParametrosFacturacion(data:any): Observable<any> {
    return this.apiService.post(`parametros/actualizar-facturacion/`, data)
  }
//#endregion
}
