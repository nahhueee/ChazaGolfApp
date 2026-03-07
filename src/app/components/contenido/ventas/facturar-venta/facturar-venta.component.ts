import { Component, EventEmitter, Input, Output, SimpleChanges } from '@angular/core';
import { ObjFacturar, TipoComprobante } from '../../../../models/ObjFacturar';
import { DecimalFormatPipe } from '../../../../pipes/decimal-format.pipe';
import { MessageModule } from 'primeng/message';
import { DividerModule } from 'primeng/divider';
import { Button } from 'primeng/button';
import { VentasService } from '../../../../services/ventas.service';
import { FacturaVenta } from '../../../../models/FacturaVenta';
import { TableModule } from 'primeng/table';
import { NotificacionesService } from '../../../../services/notificaciones.service';
import { Dialog } from 'primeng/dialog';

@Component({
  selector: 'app-facturar-venta',
  standalone: true,
  imports: [
    DecimalFormatPipe,
    MessageModule,
    DividerModule,
    Button,
    TableModule,
    Dialog
],
  templateUrl: './facturar-venta.component.html',
  styleUrl: './facturar-venta.component.scss',
})
export class FacturarVentaComponent {
  @Input() visible = false; 
  @Input() titulo = ""; 
  @Output() cerrar = new EventEmitter<FacturaVenta>(); //Pasa el objeto facturado
  @Input() set objFacturar(value: ObjFacturar) { 
    if (value){
      this.datosFacturar = value;
    } 
  }

  datosFacturar:ObjFacturar = new ObjFacturar();
  esNotaCreditoDebito:boolean;

  constructor(
    private ventasService: VentasService,
    private Notificaciones: NotificacionesService,
  ){}

  ngOnChanges(changes: SimpleChanges) {
    if (changes['visible']?.currentValue === true) {
      this.esNotaCreditoDebito = [
          TipoComprobante.NC_A,
          TipoComprobante.ND_A,
          TipoComprobante.NC_B,
          TipoComprobante.ND_B,
          TipoComprobante.NC_C,
          TipoComprobante.ND_C,
          TipoComprobante.NC_X
      ].includes(this.datosFacturar.tipoComprobante!);
      console.log(this.esNotaCreditoDebito)
    }
  }

  get pagoCompleto(): boolean {
    if(this.datosFacturar.pagos.length > 0){
      const totalPagos = this.datosFacturar.pagos.reduce(
        (acc, p) => acc + (p.monto || 0),
        0
      );
      return totalPagos >= this.datosFacturar.total!;
    }

    return false;
  }

  get saldoPendiente(): number {
    if(this.datosFacturar.pagos.length > 0){
      const totalPagos = this.datosFacturar.pagos.reduce(
        (acc, p) => acc + (p.monto || 0),
        0
      );
      return Math.max(this.datosFacturar.total! - totalPagos, 0);
    }
    
    return this.datosFacturar.total!;
  }

  Facturar(){
    let esCotizacion = this.datosFacturar.tipoComprobante === TipoComprobante.COTIZACION || this.datosFacturar.tipoComprobante === TipoComprobante.NC_X;
    if(!esCotizacion){
      this.ventasService.Facturar(this.datosFacturar)
        .subscribe({
          next: response => {
            const factura:FacturaVenta = new FacturaVenta({
              estado: response.estado,
              cae: response.cae,
              caeVto: response.caeVto,
              ticket: response.ticket,
              tipoComprobante: this.datosFacturar.tipoComprobante,
              neto: this.datosFacturar.neto,
              iva: this.datosFacturar.iva,
              dni: this.datosFacturar.docNro,
              tipoDni: this.datosFacturar.docTipo,
              ptoVenta: response.ptoVenta,
              condReceptor: this.datosFacturar.condReceptor,
              comprobanteAsociado: this.datosFacturar.comprobanteAsociado
            });

            this.CerrarModal(factura);
          },
          error: err => {
            this.manejarErrorFacturacion(err);
            const factura:FacturaVenta = new FacturaVenta();
            factura.estado = "Error";
            this.CerrarModal(factura);
          }
      });
      
    }else{
      const factura:FacturaVenta = new FacturaVenta();
      factura.estado = "Cotizacion";
      this.CerrarModal(factura);
    }
  }

  CerrarModal(factura?:FacturaVenta) {
    this.cerrar.emit(factura);
  }

  manejarErrorFacturacion(err: any) {
    const apiError = err?.error;
    const code = apiError?.code ?? 'UNKNOWN';

    if (!apiError) {
      this.Notificaciones.Error('Error inesperado al facturar');
      return;
    }

    switch (code) {

      case 'AFIP_RECHAZO':
        this.Notificaciones.Error('La factura fue rechazada por ARCA. Revise los detalles');
        break;

      case 'AFIP_TIMEOUT':
        this.Notificaciones.Error('ARCA no respondió. Intente nuevamente en unos minutos');
        break;

      case 'AFIP_NO_DISPONIBLE':
        this.Notificaciones.Warn('El servicio de ARCA no está disponible en este momento');
        break;

      case 'AFIP_ERROR':
        this.Notificaciones.Error(apiError.message);
        break;

      case 'CERTIFICADOS':
        this.Notificaciones.Warn("No se encontraron certificados para facturar");
        break;

     default:
        this.Notificaciones.Error(
          apiError.message ??
          'Ocurrió un error inesperado al comunicarse con ARCA'
        );
        break;
    }
  }
}
