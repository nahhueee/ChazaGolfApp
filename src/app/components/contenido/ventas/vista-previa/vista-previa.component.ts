import { Component, EventEmitter, Input, Output, SimpleChanges } from '@angular/core';
import { Venta } from '../../../../models/Factura';
import { Dialog } from 'primeng/dialog';
import { DividerModule } from 'primeng/divider';
import { DecimalFormatPipe } from '../../../../pipes/decimal-format.pipe';
import { DatePipe } from '@angular/common';
import { TableModule } from 'primeng/table';

@Component({
  selector: 'app-vista-previa',
  imports: [
    Dialog,
    DividerModule,
    DecimalFormatPipe,
    DatePipe,
    TableModule,
  ],
  standalone: true,
  templateUrl: './vista-previa.component.html',
  styleUrl: './vista-previa.component.scss',
})
export class VistaPreviaComponent {
  @Input() visible = false; 
  @Input() venta: Venta = new Venta();
  @Output() visibleChange = new EventEmitter<boolean>();

  cantItems:number = 0;
  totalItems:number = 0;
  totalDescuento:number = 0;
  totalGeneral:number = 0;
  totalAPagar:number = 0;

  ngOnChanges(changes: SimpleChanges) {
    if (changes['visible']?.currentValue === true) {
      this.CalcularTotalGeneral();
    }
  }

  CalcularTotalGeneral() {
    const descuentoUsuario = this.venta.descuento;

    let totalItems = 0;
    let totalDescuento = 0;

    const procesarItems = (items: any[]) => {
      return items?.reduce((acc, item) => {

        const totalItem = item.total || 0;

        // Si no tiene tope, se asume 100%
        const descuentoMax = item.topeDescuento ?? 100;

        // Se respeta el menor
        const descuentoAplicado = Math.min(descuentoUsuario, descuentoMax);
        item.descuentoAplicado = descuentoAplicado;

        const descuentoItem = (totalItem * descuentoAplicado) / 100;

        acc.total += totalItem;
        acc.descuento += descuentoItem;

        return acc;

      }, { total: 0, descuento: 0 }) || { total: 0, descuento: 0 };
    };

    const productos = procesarItems(this.venta.productos);
    const servicios = procesarItems(this.venta.servicios);

    totalItems = productos.total + servicios.total;
    totalDescuento = productos.descuento + servicios.descuento;

    this.totalItems = totalItems;
    this.totalDescuento = totalDescuento;

    this.totalGeneral = totalItems - totalDescuento;

    this.totalAPagar =
      this.totalGeneral +
      this.venta.redondeo;

    // cantidades
    const cantProductos =
      this.venta.productos?.reduce((acc, i) => acc + (i.cantidad || 0), 0) || 0;

    const cantServicios =
      this.venta.servicios?.reduce((acc, i) => acc + (i.cantidad || 0), 0) || 0;

    this.cantItems = cantProductos + cantServicios;
  }

  Cerrar() {
    this.visibleChange.emit(false);
  }

}
