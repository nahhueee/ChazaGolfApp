import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { CatalogoItem } from '../models/Catalogo';

// Catálogos administrables (ver CatalogosRepo en el backend). El GET es abierto; las escrituras
// requieren rol ADMINISTRADOR.
@Injectable({
  providedIn: 'root'
})
export class CatalogosService {
  private apiService = inject(ApiService);

  // soloActivos=true => lo que van a ver los selectores (sin dados de baja). El backend ya devuelve
  // ordenado por `orden`.
  Listar(catalogo: string, soloActivos: boolean): Observable<CatalogoItem[] | null> {
    return this.apiService.get<CatalogoItem[]>(`catalogos/${catalogo}${soloActivos ? '?activos=1' : ''}`);
  }

  Agregar(catalogo: string, datos: Record<string, any>): Observable<{ id: number } | null> {
    return this.apiService.post<{ id: number }>(`catalogos/${catalogo}`, datos);
  }

  Modificar(catalogo: string, id: number, datos: Record<string, any>): Observable<{ id: number } | null> {
    return this.apiService.put<{ id: number }>(`catalogos/${catalogo}/${id}`, datos);
  }

  DarBaja(catalogo: string, id: number): Observable<any> {
    return this.apiService.put(`catalogos/${catalogo}/${id}/baja`, {});
  }

  Reactivar(catalogo: string, id: number): Observable<any> {
    return this.apiService.put(`catalogos/${catalogo}/${id}/reactivar`, {});
  }
}
