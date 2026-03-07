import { Component, EventEmitter, Input, Output, SimpleChanges } from '@angular/core';
import { Venta } from '../../../../models/Factura';
import { Dialog } from 'primeng/dialog';
import { DividerModule } from 'primeng/divider';
import { DecimalFormatPipe } from '../../../../pipes/decimal-format.pipe';
import { DatePipe } from '@angular/common';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { ComprobanteService } from '../../../../services/comprobante.service';
import { TipoComprobante } from '../../../../models/ObjFacturar';

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
    const procesarItems = (items: any[]) => {
      return items?.reduce((acc, item) => {

        const totalItem = item.total || 0;
        const descuentoItem = item.importeDescuento || 0;

        acc.total += totalItem;
        acc.descuento += descuentoItem;

        return acc;

      }, { total: 0, descuento: 0 }) || { total: 0, descuento: 0 };
    };

    const productos = procesarItems(this.venta.productos);
    const servicios = procesarItems(this.venta.servicios);

    this.totalProductos = productos.total;
    this.totalServicios = servicios.total;
    
    //Importes base
    const subtotalBruto = productos.total + servicios.total;
    const totalDescuento = productos.descuento + servicios.descuento;

    //Neto sin IVA
    const subtotalNeto = subtotalBruto - totalDescuento;
    this.subTotal = subtotalNeto;

    let totalIva = 0;
    let totalGeneral = 0;
    this.mostrarIva = false;

    const forzarFacturaB =
      this.venta.cliente?.idCategoria === 1 &&
      this.venta.cliente?.idCondicionIva === 1;

    const esTipoA = [
         TipoComprobante.FACTURA_A,
         TipoComprobante.NC_A,
         TipoComprobante.ND_A
    ].includes(this.venta.idTipoComprobante!);
    
    const esTipoB = this.venta.idTipoComprobante === 6;

    // FACTURA B (tipo 6 o forzada)
    if (esTipoB || forzarFacturaB) {

      totalIva = subtotalNeto * 21 / 121;
      totalGeneral = subtotalNeto; // ya incluye IVA
      this.mostrarIva = true;

    // FACTURA A (tipo 1)
    } else if (esTipoA) {

      totalIva = subtotalNeto * 0.21;
      totalGeneral = subtotalNeto + totalIva;
      this.mostrarIva = true;

    // Otros comprobantes → sin IVA
    } else {

      totalIva = 0;
      totalGeneral = subtotalNeto;
      this.mostrarIva = false;
    }

    //Definimos totales
    this.subTotal = subtotalBruto;
    this.totalDescuento = totalDescuento;
    this.totalIva = totalIva;
    this.totalGeneral = totalGeneral;
    this.totalAPagar = totalGeneral + this.venta.redondeo;

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
