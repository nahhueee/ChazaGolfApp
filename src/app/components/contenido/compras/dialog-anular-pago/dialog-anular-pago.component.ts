import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { Dialog } from 'primeng/dialog';
import { TextareaModule } from 'primeng/textarea';

import { FORMS_IMPORTS } from '../../../../imports/forms.import';
import { CuentasProveedoresService } from '../../../../services/cuentas-proveedores.service';
import { NotificacionesService } from '../../../../services/notificaciones.service';

export interface PagoAnular {
  id: number;
  comprobante: string;
  total: number;
}

// Anulación de un pago a proveedor con motivo obligatorio. Misma estructura que DialogBajaCompraComponent
// (no se generalizó a propósito: aquel está atado a Compras; si aparece una tercera baja con motivo, ahí sí
// conviene extraer un diálogo genérico). La lógica de negocio vive en el backend
// (ComprasCuentasRepo.RevertirPagoProveedor); este diálogo solo la dispara. Los errores de negocio los muestra
// el interceptor global, por eso acá no se repiten.
@Component({
  selector: 'app-dialog-anular-pago',
  standalone: true,
  imports: [
    ...FORMS_IMPORTS,
    Dialog,
    TextareaModule,
  ],
  templateUrl: './dialog-anular-pago.component.html',
  styleUrl: './dialog-anular-pago.component.css',
})
export class DialogAnularPagoComponent implements OnChanges {

  @Input() visible: boolean = false;
  @Input() pago: PagoAnular | null = null;
  @Output() visibleChange = new EventEmitter<boolean>();
  @Output() anulacionRealizada = new EventEmitter<void>();

  motivo: string = '';
  enviando: boolean = false;

  constructor(
    private cuentasService: CuentasProveedoresService,
    private notificaciones: NotificacionesService,
  ) {}

  // El reseteo se hace al abrir (no en (onHide): ver bug de PrimeNG documentado en dialog-cheque-emitido).
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['visible'] && this.visible) {
      this.motivo = '';
      this.enviando = false;
    }
  }

  get puedeConfirmar(): boolean {
    return !!this.pago && !!this.motivo.trim() && !this.enviando;
  }

  Cerrar() {
    this.visible = false;
    this.visibleChange.emit(false);
  }

  Confirmar() {
    if (!this.puedeConfirmar) return;

    this.enviando = true;
    this.cuentasService.RevertirPago(this.pago!.id, this.motivo.trim()).subscribe({
      next: response => {
        this.enviando = false;
        if (response == 'OK') {
          this.notificaciones.Success('Pago anulado correctamente.');
          this.Cerrar();
          this.anulacionRealizada.emit();
        } else {
          this.notificaciones.Warn(response);
        }
      },
      error: () => {
        this.enviando = false; // el interceptor global ya avisó el motivo; el diálogo queda abierto
      },
    });
  }
}
