import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { FiltroProducto } from '../models/filtros/FiltroProducto';

@Injectable({
  providedIn: 'root'
})
export class FilesService {

  constructor(private apiService:ApiService) {}

  DescargarResultadosExcel(filtros:FiltroProducto){
    return this.apiService.getFile('files/descargar-excel', filtros);
  }
}
