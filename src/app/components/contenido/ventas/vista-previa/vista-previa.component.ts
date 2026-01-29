import { Component, EventEmitter, Input, Output, SimpleChanges } from '@angular/core';
import { Venta } from '../../../../models/Factura';
import { Dialog } from 'primeng/dialog';
import { DividerModule } from 'primeng/divider';
import { DecimalFormatPipe } from '../../../../pipes/decimal-format.pipe';
import { DatePipe } from '@angular/common';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { ComprobanteService } from '../../../../services/comprobante.service';

@Component({
  selector: 'app-vista-previa',
  imports: [
    Dialog,
    DividerModule,
    DecimalFormatPipe,
    DatePipe,
    TableModule,
    ButtonModule
  ],
  standalone: true,
  templateUrl: './vista-previa.component.html',
  styleUrl: './vista-previa.component.scss',
})
export class VistaPreviaComponent {
  @Input() visible = false; 
  @Input() venta: Venta = new Venta();
  @Output() visibleChange = new EventEmitter<boolean>();

  cantProductos:number = 0;
  cantservicios:number = 0;
  totalProductos:number = 0;
  totalServicios:number = 0;

  cantItems:number = 0;
  subTotal:number = 0;
  totalItems:number = 0;
  totalDescuento:number = 0;
  totalGeneral:number = 0;
  totalAPagar:number = 0;
  totalIva:number = 0;

  mostrarIva:boolean = false;

  constructor(
    private comprobanteService:ComprobanteService
  ){}

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

    this.totalItems = productos.total + servicios.total;
    this.totalDescuento = productos.descuento + servicios.descuento;

    // Base inicial
    this.subTotal = this.totalItems - this.totalDescuento;
    this.totalIva = 0;
    this.totalGeneral = this.subTotal;
    this.mostrarIva = false;

    const esFactura =
      this.venta.proceso !== 'COTIZACION' &&
      this.venta.productos.length > 0;

    if (esFactura) {

      // FACTURA A
      if (this.venta.idTipoComprobante === 1) {
        this.totalIva = this.subTotal * 0.21;
        this.totalGeneral = this.subTotal + this.totalIva;
        this.mostrarIva = true;
      }

      // FACTURA B
      if (this.venta.idTipoComprobante === 6) {
        const totalConIva = this.subTotal;

        this.totalIva = totalConIva * 21 / 121;
        this.subTotal = totalConIva - this.totalIva;
        this.totalGeneral = totalConIva;

        this.mostrarIva = true;
      }

      // FACTURA C (11) → no IVA
    }

    this.totalAPagar =
      this.totalGeneral +
      this.venta.redondeo;

    // cantidades
    this.cantProductos = this.venta.productos?.reduce((acc, i) => acc + (i.cantidad || 0), 0) || 0;
    this.cantservicios = this.venta.servicios?.reduce((acc, i) => acc + (i.cantidad || 0), 0) || 0;

    this.cantItems = this.cantProductos + this.cantservicios;
  }

  Cerrar() {
    this.visibleChange.emit(false);
  }

  VerComprobante(){
    this.comprobanteService.VerComprobante(this.venta)
  }
}
