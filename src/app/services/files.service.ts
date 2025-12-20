import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { FiltroProducto } from '../models/filtros/FiltroProducto';

@Injectable({
  providedIn: 'root'
})
export class FilesService {

  constructor(private apiService:ApiService) {}

  ImprimirPDF(file: File, printerName: string): Observable<any> {
    const formData = new FormData();
    formData.append('doc', file);
    formData.append('printerName', printerName); 
    
    return this.apiService.post('files/imprimir-pdf', formData)
  }
  
  DescargarResultadosExcel(filtros:FiltroProducto){
    return this.apiService.getFile('files/descargar-excel', filtros);
  }
}
