import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { VentasService } from './ventas.service';

export interface ResumenNotasEmpaque {
  total: number;      // Notas de Empaque en Pendiente (sin controlar), sin dar de baja
  atrasadas: number;  // de esas, las de días anteriores a hoy
}

/**
 * Estado compartido del contador de Notas de Empaque pendientes de control (oct-2026): el
 * cliente carga todo como Nota de Empaque, la controla y recién después factura, y tiene que
 * revisar todas las pendientes antes de terminar el día. Lo consumen el menú (badge + acceso
 * rápido) y el listado de Pre-Facturación (cartel). Quien cambie el estado de una NE
 * (aprobar, dar de baja) llama a Actualizar() para no esperar al próximo refresco.
 * El refresco periódico lo dispara NavegacionComponent.
 */
@Injectable({
  providedIn: 'root'
})
export class NotasEmpaquePendientesService {
  private resumenSubject = new BehaviorSubject<ResumenNotasEmpaque>({ total: 0, atrasadas: 0 });
  readonly resumen$: Observable<ResumenNotasEmpaque> = this.resumenSubject.asObservable();

  constructor(private ventasService: VentasService) {}

  Actualizar(): void {
    this.ventasService.ObtenerNotasEmpaquePendientes().subscribe({
      next: r => this.resumenSubject.next({ total: r?.total ?? 0, atrasadas: r?.atrasadas ?? 0 }),
      // Consulta de fondo: si falla se deja el último valor conocido, sin avisar.
      error: () => {}
    });
  }
}
