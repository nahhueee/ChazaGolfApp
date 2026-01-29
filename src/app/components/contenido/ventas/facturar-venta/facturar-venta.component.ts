import { Component, EventEmitter, Input, Output } from '@angular/core';
import { ObjFacturar } from '../../../../models/ObjFacturar';
import { DecimalFormatPipe } from '../../../../pipes/decimal-format.pipe';
import { MessageModule } from 'primeng/message';
import { DividerModule } from 'primeng/divider';
import { Button } from 'primeng/button';
import { VentasService } from '../../../../services/ventas.service';
import { FacturaVenta } from '../../../../models/FacturaVenta';

@Component({
  selector: 'app-facturar-venta',
  standalone: true,
  imports: [
    DecimalFormatPipe,
    MessageModule,
    DividerModule,
    Button
  ],
  templateUrl: './facturar-venta.component.html',
  styleUrl: './facturar-venta.component.scss',
})
export class FacturarVentaComponent {
  @Output() cerrar = new EventEmitter<FacturaVenta>(); //Pasa el objeto facturado
  @Input() set objFacturar(value: ObjFacturar) { 
    if (value){
      this.datosFacturar = value;
    } 
  }

  datosFacturar:ObjFacturar = new ObjFacturar();

  constructor(
    private ventasService:VentasService
  ){}

  Facturar(){
    this.ventasService.Facturar(this.datosFacturar)
      .subscribe(response => {

        const factura:FacturaVenta = new FacturaVenta({
          estado: response.estado,
          cae: response.cae,
          caeVto: response.caeVto,
          ticket: response.ticket,
          tipoFactura: this.datosFacturar.tipoFactura,
          neto: this.datosFacturar.neto,
          iva: this.datosFacturar.iva,
          dni: this.datosFacturar.docNro,
          tipoDni: this.datosFacturar.docTipo,
          ptoVenta: response.ptoVenta,
          condReceptor: this.datosFacturar.condReceptor
        });

        this.CerrarModal(factura);
      });
  }

  CerrarModal(factura?:FacturaVenta) {
    this.cerrar.emit(factura);
  }
}
