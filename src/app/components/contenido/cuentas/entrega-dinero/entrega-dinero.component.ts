import { Component, EventEmitter, input, Input, Output } from '@angular/core';
import { FORMS_IMPORTS } from '../../../../imports/forms.import';
import { PagosFactura, Venta } from '../../../../models/Factura';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { MetodoPago } from '../../../../models/MetodoPago';
import { MiscService } from '../../../../services/misc.service';
import { TableModule } from 'primeng/table';
import { GlobalesService } from '../../../../services/globales.service';
import { NotificacionesService } from '../../../../services/notificaciones.service';
import { Dialog } from 'primeng/dialog';
import { CuentasCorrientesService } from '../../../../services/cuentas-corriente.service';
interface pagoDTO {
  idMetodo: number;
  monto: number;
}

@Component({
  selector: 'app-entrega-dinero',
  standalone: true,
  imports: [
    FORMS_IMPORTS,
    TableModule,
    Dialog
  ],
  templateUrl: './entrega-dinero.component.html',
  styleUrl: './entrega-dinero.component.scss',
})
export class EntregaDineroComponent {
  @Output() visibleChange = new EventEmitter<boolean>();
  @Output() recargar = new EventEmitter<boolean>();
  @Input() visible = false; 
  @Input() venta: Venta = new Venta();
  @Input() deudaTotal: number = 0;
  @Input() desdeVenta: boolean = false;
  @Input() idCliente: number = 0;

  decimal_mask:any;
  formPagos:FormGroup;
  metodosPago:MetodoPago[]=[];
  pagosNuevos: pagoDTO[]=[];

  //Para entrega general
  montoEntregar:number = 0;
  metodoSeleccionado:number = 0;
  alerta:string = "";

  constructor(
    private miscService:MiscService,
    private globalesService:GlobalesService,
    private Notificaciones:NotificacionesService,
    private cuentasService:CuentasCorrientesService
  ){
    this.formPagos = new FormGroup({
      metodo: new FormControl('', [Validators.required]),
      monto: new FormControl('', [Validators.min(0)])
    });
  }

  ngOnInit(){
    this.ObtenerMetodosPago();
  }

  ngAfterViewInit(){
    this.decimal_mask = {
      mask: Number,
      scale: 2,
      thousandsSeparator: '.',
      radix: ',',
      normalizeZeros: true,
      padFractionalZeros: true,
      lazy: false,
      signed: true
    }
  }

  ObtenerMetodosPago(){
    this.miscService.ObtenerMetodosPago()
      .subscribe(response => {
        this.metodosPago = response;
        this.formPagos.get('metodo')?.setValue(this.metodosPago[0]);
      });
  }

  AgregarPagoContado(){
    if(this.venta.deuda == 0) return;

    const nuevoPago = new PagosFactura();
    const seleccionado = this.metodosPago[0];
    nuevoPago.idMetodo = seleccionado.id;
    nuevoPago.metodo = seleccionado.descripcion;
    nuevoPago.monto = this.venta.deuda;
    this.venta.pagos.push(nuevoPago);
  }

  get montoRestante(): number {
    const entregado = this.venta.pagos?.reduce(
      (acc, item) => acc + (item.monto || 0),
      0
    ) || 0;

    return Math.max(this.venta.total! - entregado, 0);
  }

  AgregarPago() {
    if (this.formPagos.invalid) return;
    const montoIngresado = this.formPagos.get('monto')?.value;
    const metodoSeleccionado = this.formPagos.get('metodo')?.value;


    if(this.desdeVenta){
      const montoFinal = montoIngresado
        ? this.globalesService.EstandarizarDecimal(montoIngresado)
        : this.montoRestante;

      if (montoFinal <= 0) return;

      if (montoFinal > this.montoRestante) {
        this.Notificaciones.Warn("La entrega por pago no puede superar el total a pagar.");
        return;
      }

      const nuevoPago = new PagosFactura();
      nuevoPago.idMetodo = metodoSeleccionado.id;
      nuevoPago.metodo = metodoSeleccionado.descripcion;
      nuevoPago.monto = montoFinal;

      this.venta.pagos.push(nuevoPago);

      const pago:pagoDTO = {
        idMetodo: metodoSeleccionado.id,
        monto: montoFinal
      };
      this.pagosNuevos.push(pago);
      this.formPagos.reset();
      this.formPagos.get('metodo')?.setValue(this.metodosPago[0])
    }else{
      const montoFinal = montoIngresado
        ? this.globalesService.EstandarizarDecimal(montoIngresado)
        : this.deudaTotal;

      if (montoFinal <= 0) return;

      if (montoFinal > this.deudaTotal) {
        this.Notificaciones.Warn("La entrega de dinero no puede superar el total de deuda.");
        return;
      }

      this.montoEntregar = montoFinal;
      this.metodoSeleccionado = metodoSeleccionado.id;

      this.alerta = "Estas a punto de registrar una entrega por un total de $" + montoFinal + " a la deuda del cliente. Para confirmar presiona el botón 'Guardar Cambios'."
    }
  }

  EliminarPago(indice:number){
    if(indice != -1) this.venta.pagos.splice(indice, 1);
  }

  Cerrar(recargar:boolean = false) {
    this.visibleChange.emit(false);

    if (recargar) {
      this.recargar.emit(true); 
    }
  }

  Guardar(){
    if(this.desdeVenta){
      this.cuentasService.EntregaDineroVenta(this.venta.id!, this.venta.cliente?.id!, this.venta.deuda, this.pagosNuevos)
        .subscribe(response => {
          if(response == "OK"){
            this.Notificaciones.Success("Pagos registrados correctamente");
            this.Cerrar(true);
          }
      });
    }else{
      this.cuentasService.EntregaDinero(this.idCliente, this.metodoSeleccionado, this.montoEntregar)
      .subscribe(response => {
          if(response == "OK"){
            this.alerta = "";
            this.metodoSeleccionado = 0;
            this.montoEntregar = 0;

            this.Notificaciones.Success("Entrega registrada correctamente");
            this.Cerrar(true);
          }
      });
    }
  }
}
