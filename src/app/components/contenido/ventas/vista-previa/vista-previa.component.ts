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

  QuitarIva = (precio: number, tasa: number = 21) => {
    const factor = 1 + (tasa / 100);
    return precio / factor;
  };

  CalcularTotalGeneral() {
    const procesarItems = (items: any[]) => {
      const esFacturaA = this.venta.idTipoComprobante === 1;
      const descuentoGeneral = Number(this.venta.descuento) || 0;

      return items?.reduce((acc, item) => {
        const unitario = Number(item.unitario) || 0;
        const cantidad = Number(item.cantidad) || 0;

        // Total bruto
        let totalBruto = unitario * cantidad;

        // Quitar IVA si corresponde
        if (esFacturaA) {
          totalBruto = this.QuitarIva(totalBruto, 21);
        }

        // Calcular descuento respetando tope
        const descuentoMax = item.topeDescuento ?? 100;
        const descuentoAplicado = Math.min(descuentoGeneral, descuentoMax);
        item.descuentoAplicado = descuentoAplicado;

        const importeDescuento = totalBruto * (descuentoAplicado / 100);

        // Total final del item
        const totalFinalItem = totalBruto - importeDescuento;

        // Acumuladores
        acc.subtotal += totalBruto;
        acc.descuento += importeDescuento;
        acc.total += totalFinalItem;

        return acc;

      }, {
        subtotal: 0,
        descuento: 0,
        total: 0
      }) || {
        subtotal: 0,
        descuento: 0,
        total: 0
      };
    };

    const productos = procesarItems(this.venta.productos);
    const servicios = procesarItems(this.venta.servicios);

    this.totalProductos = productos.total;
    this.totalServicios = servicios.total;
    
    //Importes base
    const subtotalBruto = productos.subtotal + servicios.subtotal;
    const totalDescuento = productos.descuento + servicios.descuento;

    //Neto sin IVA
    const subtotalNeto = subtotalBruto - totalDescuento;

    let totalIva = 0;
    let totalGeneral = 0;
    this.mostrarIva = false;

    const forzarLogicaB =
      this.venta.cliente?.idCategoria === 1 &&
      this.venta.cliente?.idCondicionIva === 1;

    const esFacturaB = this.venta.idTipoComprobante === 6 || forzarLogicaB;

    if (!esFacturaB) {
      // FACTURA A → precios sin IVA
      totalIva = subtotalNeto * 0.21;
      totalGeneral = subtotalNeto + totalIva;
      this.mostrarIva = true;

    } else {
      // FACTURA B → precios con IVA incluido
      totalIva = subtotalNeto * 21 / 121;
      totalGeneral = subtotalNeto; // ya incluye IVA
      this.mostrarIva = true;
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
