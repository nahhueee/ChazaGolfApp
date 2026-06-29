import { Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { ApiService } from './api.service';
import { LineasTalle } from '../models/Producto';

@Injectable({
  providedIn: 'root'
})
export class MiscService {
  constructor(private apiService:ApiService) {}
 
  //#region OBTENER
  ObtenerLineasTalle(soloVisibles: boolean = false): Observable<LineasTalle[]> {
    return this.apiService
      .get<LineasTalle[] | null>('misc/lineas-talle')
      .pipe(
        map(lineas => {
          const data = lineas ?? [];
          if (!soloVisibles) return data;
          return data.filter(l => l.mostrar === 1);
        })
      );
  }
  ObtenerProcesos(): Observable<any> {
    return this.apiService.get('misc/procesos')
  }
  ObtenerTiposProducto(): Observable<any> {
    return this.apiService.get('misc/tipos-producto')
  }
  ObtenerSubtiposProducto(): Observable<any> {
    return this.apiService.get('misc/subtipos-producto')
  }
  ObtenerMateriales(): Observable<any> {
    return this.apiService.get('misc/materiales')
  }
  ObtenerGeneros(): Observable<any> {
    return this.apiService.get('misc/generos')
  }
  ObtenerColores(): Observable<any> {
    return this.apiService.get('misc/colores')
  }
  ObtenerTalles(): Observable<any> {
    return this.apiService.get('misc/talles')
  }
  ObtenerTemporadas(): Observable<any> {
    return this.apiService.get('misc/temporadas')
  }
  ObtenerCondicionesIva(): Observable<any> {
    return this.apiService.get('misc/condiciones-iva')
  }
  ObtenerCategoriasCliente(): Observable<any> {
    return this.apiService.get('misc/categorias-cliente')
  }
  ObtenerComprobantes(empresa:string, condicionIva:number): Observable<any> {
    return this.apiService.get('misc/comprobantes/'+ empresa + '/' + condicionIva)
  }
  ObtenerServicios(): Observable<any> {
    return this.apiService.get('misc/servicios')
  }
  ObtenerMetodosPago(idEmpresa:number): Observable<any> {
    return this.apiService.get('misc/metodos-pago/'+ idEmpresa)
  }
  ObtenerProcesosVenta(tipo:string): Observable<any> {
    return this.apiService.get('misc/procesos-venta/'+ tipo)
  }
  ObtenerEmpresas(): Observable<any> {
    return this.apiService.get('misc/empresas')
  }
  ObtenerEmpresa(idEmpresa): Observable<any> {
    return this.apiService.get('misc/obtener-empresa/'+ idEmpresa)
  }
  ObtenerPuntosVenta(): Observable<any> {
    return this.apiService.get('misc/puntos-venta')
  }
  ObtenerTiposDescuento(): Observable<any> {
    return this.apiService.get('misc/tipos-descuento')
  }
  //#endregion
}
