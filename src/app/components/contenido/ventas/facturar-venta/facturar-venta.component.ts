import { Component, EventEmitter, input, Input, Output, SimpleChanges } from '@angular/core';
import { ObjFacturar, TipoComprobante } from '../../../../models/ObjFacturar';
import { Venta } from '../../../../models/Factura';
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
  @Output() visibleChange = new EventEmitter<boolean>();
  @Input() set objFacturar(value: ObjFacturar) { 
    if (value){
      this.datosFacturar = value;
    } 
  }
  // F4.2 - HANDOFF blindaje facturacion y logs. La venta ya armada (ArmarObjetoVenta
  // corrido por el padre ANTES de abrir este modal) y el flag modificando, para poder
  // llamar a /ventas/emitir, que persiste la venta y pide el CAE en la misma transaccion.
  @Input() venta?: Venta;
  @Input() modificando = false;

  datosFacturar:ObjFacturar = new ObjFacturar();
  esNotaCreditoDebito:boolean;
  // Fix sep-2026 (HANDOFF blindaje facturacion y logs) - el <p-dialog> tiene
  // (onHide)="onHide()" ademas de los onHide(factura) que ya disparamos a mano desde
  // Facturar()/Volver(). Al poner visible=false nosotros, PrimeNG dispara SU PROPIO
  // onHide como parte del ciclo de cierre del dialog, que vuelve a llamar a onHide()
  // pero sin argumento -> pisaba el `factura` (y el bloqueaReintento) que ya habiamos
  // emitido, revirtiendo el bloqueo de Guardar/Facturar en addmod-ventas incluso para
  // COMPROBANTE_SIN_REGISTRAR. Esta bandera hace que solo la PRIMERA llamada de cada
  // apertura del modal emita `cerrar`; se resetea en ngOnChanges cuando vuelve a abrirse.
  private cierreEmitido = false;

  constructor(
    private ventasService: VentasService,
    private Notificaciones: NotificacionesService,
  ){}

  ngOnChanges(changes: SimpleChanges) {
    if (changes['visible']?.currentValue === true) {
      this.cierreEmitido = false;
      this.esNotaCreditoDebito = [
          TipoComprobante.NC_A,
          TipoComprobante.ND_A,
          TipoComprobante.NC_B,
          TipoComprobante.ND_B,
          TipoComprobante.NC_C,
          TipoComprobante.ND_C,
          TipoComprobante.NC_X
      ].includes(this.datosFacturar.tipoComprobante!);
    }
  }

  Facturar(){
    let esCotizacion = this.datosFacturar.tipoComprobante === TipoComprobante.COTIZACION || this.datosFacturar.tipoComprobante === TipoComprobante.NC_X;
    if(!esCotizacion){
      // F4.2 - HANDOFF blindaje facturacion y logs. /ventas/emitir ya persiste la
      // venta (alta o modificacion) DENTRO de la misma transaccion que pide el CAE:
      // el padre (addmod-ventas/notas-venta) ya NO debe llamar a Agregar()/Modificar()
      // para este camino, es responsabilidad de este mismo llamado. Si `venta` no
      // vino seteado es un error de armado del padre (siempre debe venir para
      // Factura/NC/ND A/B/C) - se corta acá antes de mandar un body incompleto.
      if (!this.venta) {
        this.Notificaciones.Error('Error interno: falta la venta a facturar.');
        const factura:FacturaVenta = new FacturaVenta();
        factura.estado = "Error";
        this.onHide(factura);
        return;
      }

      this.ventasService.Emitir(this.venta, this.datosFacturar, this.modificando)
        .subscribe({
          next: response => {
            const factura:FacturaVenta = new FacturaVenta({
              estado: response.estado,
              // F3/F4.2 - HANDOFF blindaje facturacion y logs. idVenta ya viene
              // persistido por /emitir; idEmision para que el padre pueda vincularlo
              // si lo necesita. neto/iva vienen de la respuesta del backend (valor
              // real usado para pedir el CAE), no del calculo del front.
              idVenta: response.idVenta,
              idEmision: response.idEmision,
              cae: response.cae,
              caeVto: response.caeVto,
              ticket: response.ticket,
              tipoComprobante: this.datosFacturar.tipoComprobante,
              neto: response.neto,
              iva: response.iva,
              dni: this.datosFacturar.docNro,
              tipoDni: this.datosFacturar.docTipo,
              ptoVenta: response.ptoVenta,
              condReceptor: this.datosFacturar.condReceptor,
              comprobanteAsociado: this.datosFacturar.comprobanteAsociado
            });

            this.onHide(factura);
          },
          error: err => {
            this.manejarErrorFacturacion(err);
            const factura:FacturaVenta = new FacturaVenta();
            factura.estado = "Error";
            // F4.2 fix - HANDOFF blindaje facturacion y logs (sep-2026). Solo estos dos
            // códigos implican que ARCA puede haber emitido un CAE real aunque la venta
            // no haya quedado registrada: el padre (addmod-ventas) usa este flag para NO
            // revertir el bloqueo optimista de los botones Guardar/Facturar y forzar al
            // operador a ir a Pendientes fiscales en vez de reintentar.
            const codigo = err?.error?.code;
            factura.bloqueaReintento = codigo === 'COMPROBANTE_INCIERTO' || codigo === 'COMPROBANTE_SIN_REGISTRAR';
            this.onHide(factura);
          }
      });
      
    }else{
      const factura:FacturaVenta = new FacturaVenta();
      factura.estado = "Cotizacion";
      this.onHide(factura);
    }
  }

  onHide(factura?:FacturaVenta) {
    // Ver comentario de cierreEmitido: evita el doble emit (el nuestro + el que dispara
    // el propio <p-dialog> al ver visible=false) que pisaba el resultado real con un
    // segundo llamado sin argumento.
    if (this.cierreEmitido) return;
    this.cierreEmitido = true;

    this.visible = false;
    this.visibleChange.emit(false);
    this.cerrar.emit(factura);
  }

  manejarErrorFacturacion(err: any) {
    const apiError = err?.error;
    const code = apiError?.code ?? 'UNKNOWN';

    if (!apiError) {
      this.Notificaciones.Error('Error inesperado al facturar');
      return;
    }

    // F1.6/F1.7 (HANDOFF blindaje facturacion) - todos los errores 5xx llevan el Ref
    // del requestId para poder cruzarlos con error.log del lado del administrador.
    const ref = (err?.status >= 500 && apiError.ref) ? ` (Ref: ${apiError.ref})` : '';

    switch (code) {

      case 'AFIP_RECHAZO':
        this.Notificaciones.Error('La factura fue rechazada por ARCA. Revise los detalles');
        break;

      case 'AFIP_TIMEOUT':
        // Ya no dice "intente nuevamente": un timeout no significa que ARCA no haya
        // emitido el comprobante (ver Incidente A del handoff).
        this.Notificaciones.Error('ARCA no respondió. Verifique el estado del comprobante antes de reintentar.' + ref);
        break;

      case 'COMPROBANTE_INCIERTO':
        // Persistente a propósito: no se puede reintentar sin verificar en ARCA primero.
        this.Notificaciones.Persistente(
          'No se pudo confirmar si ARCA emitió el comprobante. NO vuelva a facturar esta venta. Avise al administrador' + ref + '.'
        );
        break;

      case 'CORRELATIVIDAD_ARCA':
      case 'FACTURACION_EN_CURSO':
      case 'ENTORNO_INVALIDO':
        this.Notificaciones.Error(apiError.message + ref);
        break;

      case 'AFIP_NO_DISPONIBLE':
        this.Notificaciones.Warn('El servicio de ARCA no está disponible en este momento' + ref);
        break;

      case 'AFIP_ERROR':
        this.Notificaciones.Error(apiError.message + ref);
        break;

      case 'CERTIFICADOS':
        this.Notificaciones.Warn("No se encontraron certificados para facturar");
        break;

      // F4.2 - HANDOFF blindaje facturacion y logs. Puede saltar en /ventas/emitir si
      // el stock cambió entre el chequeo preventivo (ValidarStockVenta, antes de abrir
      // este modal) y el guardado real dentro de la transacción (condición de carrera).
      case 'STOCK_INSUFICIENTE':
        this.Notificaciones.Error(apiError.message || 'No hay stock suficiente para completar la venta. Revise las cantidades cargadas.');
        break;

      // Persistente a propósito, igual que COMPROBANTE_INCIERTO: el comprobante SÍ se
      // emitió en ARCA (hay CAE real) pero el guardado de la venta falló después. NO
      // hay que reintentar facturar - hay que ir a Pendientes fiscales a Regularizar.
      case 'COMPROBANTE_SIN_REGISTRAR':
        this.Notificaciones.Persistente(apiError.message + ref);
        break;

     default:
        this.Notificaciones.Error(
          (apiError.message ?? 'Ocurrió un error inesperado al comunicarse con ARCA') + ref
        );
        break;
    }
  }
}
