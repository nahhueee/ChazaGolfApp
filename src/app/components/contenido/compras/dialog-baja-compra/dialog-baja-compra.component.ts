import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { Dialog } from 'primeng/dialog';
import { TextareaModule } from 'primeng/textarea';

import { FORMS_IMPORTS } from '../../../../imports/forms.import';
import { ComprasService } from '../../../../services/compras.service';
import { NotificacionesService } from '../../../../services/notificaciones.service';

export interface CompraBaja {
  id: number;
  comprobante: string;
  total: number;
  metodoPago?: string; // opcional: el Listado lo conoce, el ledger no
}

// Baja de compra con motivo obligatorio. La lógica de negocio vive en el backend (ComprasRepo.Eliminar);
// este diálogo solo la dispara. Compartido por el Listado de Compras y la Cuenta Proveedor.
// Los errores de negocio del backend (pagos aplicados, cheque debitado, etc.) ya los muestra el
// interceptor global (HttpErrorHandlerService), por eso acá no se repiten.
@Component({
  selector: 'app-dialog-baja-compra',
  standalone: true,
  imports: [
    ...FORMS_IMPORTS,
    Dialog,
    TextareaModule,
  ],
  templateUrl: './dialog-baja-compra.component.html',
  styleUrl: './dialog-baja-compra.component.css',
})
export class DialogBajaCompraComponent implements OnChanges {

  @Input() visible: boolean = false;
  @Input() compra: CompraBaja | null = null;
  @Output() visibleChange = new EventEmitter<boolean>();
  @Output() bajaRealizada = new EventEmitter<void>();

  motivo: string = '';
  enviando: boolean = false;

  constructor(
    private comprasService: ComprasService,
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
    return !!this.compra && !!this.motivo.trim() && !this.enviando;
  }

  Cerrar() {
    this.visible = false;
    this.visibleChange.emit(false);
  }

  Confirmar() {
    if (!this.puedeConfirmar) return;

    this.enviando = true;
    this.comprasService.Eliminar(this.compra!.id, this.motivo.trim()).subscribe({
      next: response => {
        this.enviando = false;
        if (response == 'OK') {
          this.notificaciones.Success('Compra dada de baja correctamente.');
          this.Cerrar();
          this.bajaRealizada.emit();
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
