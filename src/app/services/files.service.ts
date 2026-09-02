import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { FiltroProducto } from '../models/filtros/FiltroProducto';
import { FiltroVenta } from '../models/filtros/FiltroVenta';
import { FiltroClientes } from '../models/filtros/FiltroClientes';
import { FiltroProveedores } from '../models/filtros/FiltroProveedores';
import { FiltrosFondos } from '../models/Fondos';

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

  DescargarVentasExcel(filtros:FiltroVenta){
    return this.apiService.getFile('files/ventas-excel', filtros);
  }

  DescargarLibroIvaVentasExcel(filtros: { idEmpresa: number, fechas: [Date, Date] }){
    return this.apiService.getFile('files/libro-iva-ventas-excel', filtros);
  }

  DescargarClientesExcel(filtros:FiltroClientes){
    return this.apiService.getFile('files/clientes-excel', filtros);
  }

  DescargarCuentasExcel(filtros:FiltroClientes){
    return this.apiService.getFile('files/cuentas-excel', filtros);
  }

  DescargarProveedoresExcel(filtros:FiltroProveedores){
    return this.apiService.getFile('files/proveedores-excel', filtros);
  }

  DescargarFondosExcel(filtros: FiltrosFondos, cajaNombre?: string | null, fondoNombre?: string | null){
    return this.apiService.getFile('files/fondos-excel', { filtros, cajaNombre, fondoNombre });
  }
}
