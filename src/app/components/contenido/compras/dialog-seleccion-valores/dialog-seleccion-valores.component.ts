import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DialogModule } from 'primeng/dialog';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ButtonModule } from 'primeng/button';

import { FondosService } from '../../../../services/fondos.service';
import { NotificacionesService } from '../../../../services/notificaciones.service';
import { DecimalFormatPipe } from '../../../../pipes/decimal-format.pipe';

// Cheque de terceros PENDIENTE (Valores a Acreditar) que se puede endosar como pago a un proveedor.
export interface ValorEndosable {
  id: number;
  monto: number;
  cliente: string | null;
  chequeNumero: string | null;
  chequeBanco: string | null;
  chequeFechaCobro: string | null;
  chequeLibradorNombre: string | null;
}

@Component({
  selector: 'app-dialog-seleccion-valores',
  standalone: true,
  imports: [CommonModule, DialogModule, TableModule, TagModule, ButtonModule, DecimalFormatPipe],
  templateUrl: './dialog-seleccion-valores.component.html',
  styleUrl: './dialog-seleccion-valores.component.css',
})
export class DialogSeleccionValoresComponent implements OnChanges {

  @Input() visible: boolean = false;
  @Input() idEmpresa: number | null = null;
  // Cheques ya elegidos en esta misma pantalla (todavía no guardados): no se pueden elegir dos veces.
  @Input() excluidos: number[] = [];
  // Lo que falta cubrir (null si todavía no se sabe, ej. compra sin conceptos cargados). Nunca oculta cheques:
  // un cheque mayor se lista igual con un aviso, y la validación real corre al guardar (el endoso no se parte).
  @Input() faltante: number | null = null;
  // Texto del aviso para un cheque mayor que lo que falta: en Pagar a Proveedor el excedente queda a favor;
  // en Compras al contado no tiene dónde ir y el guardado lo va a rechazar.
  @Input() avisoExcedente: string = 'Deja saldo a favor';
  @Output() visibleChange = new EventEmitter<boolean>();
  @Output() seleccionar = new EventEmitter<ValorEndosable>();

  valores: ValorEndosable[] = [];
  cargando = false;

  constructor(
    private fondosService: FondosService,
    private notificaciones: NotificacionesService,
  ) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['visible']?.currentValue === true) this.cargar();
  }

  private cargar(): void {
    if (!this.idEmpresa) {
      this.valores = [];
      return;
    }
    this.cargando = true;
    this.fondosService.ObtenerValoresPendientes({ tipo: 'CHEQUE', idEmpresa: this.idEmpresa }).subscribe({
      next: (r: any) => {
        const todos: ValorEndosable[] = (r?.pendientes ?? []).map((v: any) => ({ ...v, monto: Number(v.monto) }));
        this.valores = todos.filter(v => !this.excluidos.includes(v.id));
        this.cargando = false;
      },
      error: () => {
        this.valores = [];
        this.cargando = false;
        this.notificaciones.Error('No se pudieron cargar los cheques disponibles.');
      },
    });
  }

  excede(v: ValorEndosable): boolean {
    return this.faltante !== null && v.monto > this.faltante + 0.005;
  }

  elegir(v: ValorEndosable): void {
    this.seleccionar.emit(v);
    this.cerrar();
  }

  cerrar(): void {
    this.visible = false;
    this.visibleChange.emit(false);
  }
}
