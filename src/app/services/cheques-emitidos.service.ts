import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { ApiService } from './api.service';
import { ChequeEmitido, FiltroChequesEmitidos } from '../models/ChequeEmitido';

@Injectable({
  providedIn: 'root'
})
export class ChequesEmitidosService {
  constructor(private apiService:ApiService) {}

  Obtener(filtro:FiltroChequesEmitidos): Observable<ChequeEmitido[]> {
    return this.apiService.post<ChequeEmitido[]>('cheques-emitidos/obtener', filtro).pipe(map(r => r ?? []))
  }

  // El banco recién se mueve acá: emitir el cheque solo compromete plata en el fondo puente.
  Debitar(idCheque:number, idCaja:number): Observable<any> {
    return this.apiService.put('cheques-emitidos/debitar', {idCheque, idCaja})
  }
}
