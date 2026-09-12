import { Injectable } from '@angular/core';
import { map, Observable, of } from 'rxjs';
import { ApiService } from './api.service';
import { LineasTalle } from '../models/Producto';
import { NotificacionesService } from './notificaciones.service';

@Injectable({
  providedIn: 'root'
})
export class MiscService {
  // Cache de la empresa Responsable Inscripto (ver ResolverEmpresaResponsableInscripto)
  // - se resuelve una sola vez para toda la app, no por componente.
  private empresaRI: any = null;

  constructor(
    private apiService:ApiService,
    private notificaciones: NotificacionesService,
  ) {}

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

  // Resuelve (y cachea) la única empresa Responsable Inscripto. Si el día de mañana
  // hay más de una, no elige "la primera" en silencio: avisa, porque emitir un
  // documento fiscal (Libro IVA, etc.) contra la empresa equivocada es peor que
  // frenar acá. Movido desde listado-ventas.component.ts (sep-2026) para que
  // Administración > Libro IVA lo reuse sin duplicar la resolución.
  ResolverEmpresaResponsableInscripto(): Observable<any> {
    if (this.empresaRI) return of(this.empresaRI);

    return this.ObtenerEmpresas().pipe(
      map(empresas => {
        const empresasRI = empresas.filter((e:any) => e.abrevCondicion === 'RI');

        if (empresasRI.length === 0) {
          this.notificaciones.Warn("No se encontró ninguna empresa Responsable Inscripto.");
          return null;
        }
        if (empresasRI.length > 1) {
          this.notificaciones.Warn("Hay más de una empresa Responsable Inscripto: falta agregar el selector para elegir cuál. Avisale a soporte.");
          return null;
        }

        this.empresaRI = empresasRI[0];
        return this.empresaRI;
      })
    );
  }
}
