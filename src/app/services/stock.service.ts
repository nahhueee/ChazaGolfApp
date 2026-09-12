import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { FiltroStock } from '../models/filtros/FiltroStock';

@Injectable({
  providedIn: 'root'
})
export class StockService {
  constructor(private apiService: ApiService) {}

  //#region OBTENER
  Obtener(filtro: FiltroStock): Observable<any> {
    return this.apiService.post('stock/obtener', filtro)
  }
  //#endregion

  //#region ABM
  // Protegido en el backend con requiereRol('ADMINISTRADOR','ENCARGADO') - authMiddleware
  // agrega el header vía ApiService, no hace falta mandar nada más acá.
  Ajustar(data: { idProducto: number; talle: string; cantidadNueva: number; motivo: string }): Observable<any> {
    return this.apiService.post('stock/ajustar', data)
  }

  Revertir(idMovimiento: number, motivoBaja: string): Observable<any> {
    return this.apiService.put('stock/revertir', { idMovimiento, motivoBaja })
  }
  //#endregion
}
