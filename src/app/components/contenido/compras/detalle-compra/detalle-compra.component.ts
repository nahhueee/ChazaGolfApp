import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { Dialog } from 'primeng/dialog';
import { TableModule } from 'primeng/table';

import { FORMS_IMPORTS } from '../../../../imports/forms.import';
import { Compra } from '../../../../models/Compra';
import { ComprasService } from '../../../../services/compras.service';

// Detalle de solo lectura de una compra (datos generales, cheques, conceptos, IIBB, IVA y totales).
// Reutilizable: lo usan el Listado de Compras y la Cuenta Proveedor. Carga la compra cada vez que se abre.
@Component({
  selector: 'app-detalle-compra',
  standalone: true,
  imports: [
    ...FORMS_IMPORTS,
    Dialog,
    TableModule,
  ],
  templateUrl: './detalle-compra.component.html',
  styleUrl: './detalle-compra.component.scss',
})
export class DetalleCompraComponent implements OnChanges {

  @Input() idCompra: number | null = null;
  @Input() visible: boolean = false;
  @Output() visibleChange = new EventEmitter<boolean>();

  compra: Compra | undefined;

  constructor(private comprasService: ComprasService) {}

  ngOnChanges(changes: SimpleChanges): void {
    if ((changes['visible'] || changes['idCompra']) && this.visible && this.idCompra) {
      this.Cargar(this.idCompra);
    }
  }

  private Cargar(idCompra: number) {
    this.compra = undefined;
    this.comprasService.ObtenerCompra(idCompra).subscribe(response => {
      this.compra = response;
    });
  }
}
