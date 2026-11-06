import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { Dialog } from 'primeng/dialog';
import { TableModule } from 'primeng/table';
import { TextareaModule } from 'primeng/textarea';
import { ConfirmationService } from 'primeng/api';
import { ConfirmDialogModule } from 'primeng/confirmdialog';

import { FORMS_IMPORTS } from '../../../../imports/forms.import';
import { MetodoPago } from '../../../../models/MetodoPago';
import { Empresa } from '../../../../models/Empresa';
import { TIPO_METODO_PAGO_COMPRA } from '../models/compra.constants';
import { ChequePropioDTO } from '../../../../models/ChequeEmitido';
import { ArmarCuentasCheque, CuentaCheque, DatosChequeEmitido, DialogChequeEmitidoComponent } from '../dialog-cheque-emitido/dialog-cheque-emitido.component';
import { DialogSeleccionValoresComponent, ValorEndosable } from '../dialog-seleccion-valores/dialog-seleccion-valores.component';
import { MiscService } from '../../../../services/misc.service';
import { ComprasService } from '../../../../services/compras.service';
import { CuentasProveedoresService } from '../../../../services/cuentas-proveedores.service';
import { GlobalesService } from '../../../../services/globales.service';
import { NotificacionesService } from '../../../../services/notificaciones.service';

interface pagoDTO {
  idMetodo: number;
  monto: number;
  cheque?: ChequePropioDTO; // solo con método CHEQUE_PROPIO (el importe es el monto)
  idValorAcreditar?: number; // solo con método CHEQUE (endoso de un cheque de terceros; el importe es el del cheque)
}
interface PagoFila extends pagoDTO {
  metodo: string;
}

@Component({
  selector: 'app-pagar-proveedor',
  standalone: true,
  imports: [
    ...FORMS_IMPORTS,
    TableModule,
    Dialog,
    TextareaModule,
    ConfirmDialogModule,
    DialogChequeEmitidoComponent,
    DialogSeleccionValoresComponent,
  ],
  templateUrl: './pagar-proveedor.component.html',
  styleUrl: './pagar-proveedor.component.scss',
  providers: [ConfirmationService],
})
export class PagarProveedorComponent {
  @Output() visibleChange = new EventEmitter<boolean>();
  @Output() recargar = new EventEmitter<boolean>();

  private _visible = false;
  @Input()
  set visible(value: boolean) {
    this._visible = value;
    if (value) this.CargarDatosPago();
  }
  get visible(): boolean {
    return this._visible;
  }

  @Input() idProveedor: number = 0;
  @Input() proveedor: string = '';
  @Input() idCaja: number = 0;
  @Input() deuda: number = 0;
  @Input() saldoAFavor: number = 0;

  decimal_mask: any;
  formPago: FormGroup;
  empresas: Empresa[] = [];
  metodosPago: MetodoPago[] = [];
  pagosRealizados: PagoFila[] = [];
  pagosNuevos: pagoDTO[] = [];
  private idEmpresaAnterior: number | null = null;

  //Cheque propio: cuentas (bancos) de la empresa y estado del diálogo
  cuentasCheque: CuentaCheque[] = [];
  dialogChequeVisible: boolean = false;

  //Cheque de terceros (endoso): selector de valores PENDIENTES de Valores a Acreditar
  dialogValoresVisible: boolean = false;
  importeChequeDefault: number = 0;

  constructor(
    private miscService: MiscService,
    private comprasService: ComprasService,
    private cuentasService: CuentasProveedoresService,
    private globalesService: GlobalesService,
    private Notificaciones: NotificacionesService,
    private confirmationService: ConfirmationService,
  ) {
    this.formPago = new FormGroup({
      empresa: new FormControl('', []),
      metodo: new FormControl('', [Validators.required]),
      monto: new FormControl('', [Validators.min(0)]),
      observaciones: new FormControl('', [Validators.maxLength(250)]),
    });
  }

  ngAfterViewInit() {
    this.decimal_mask = {
      mask: Number,
      scale: 2,
      thousandsSeparator: '.',
      radix: ',',
      normalizeZeros: true,
      padFractionalZeros: true,
      lazy: false,
      signed: true,
    };
  }

  CargarDatosPago() {
    this.miscService.ObtenerEmpresas().subscribe(empresas => {
      this.empresas = empresas;
      const idEmpresaDefault = this.empresas[0]?.id;
      this.formPago.get('empresa')?.setValue(idEmpresaDefault);
      this.idEmpresaAnterior = idEmpresaDefault ?? null;
      if (idEmpresaDefault) this.ObtenerMetodosPago(idEmpresaDefault);
    });
  }

  CambioEmpresa() {
    const idEmpresa = this.formPago.get('empresa')?.value;
    if (!idEmpresa) return;

    //Lock: no se puede cambiar de empresa con pagos ya cargados en la mini-tabla (decisión
    //24-jun-2026) - cada pago queda atado a un metodos_pago de la empresa con la que se cargó.
    if (this.pagosNuevos.length > 0 && this.idEmpresaAnterior != null && idEmpresa !== this.idEmpresaAnterior) {
      this.formPago.get('empresa')?.setValue(this.idEmpresaAnterior, { emitEvent: false });
      this.Notificaciones.Warn("No podés cambiar de empresa con pagos ya cargados. Quitá los pagos primero.");
      return;
    }

    this.formPago.get('metodo')?.reset();
    this.ObtenerMetodosPago(idEmpresa);
    this.idEmpresaAnterior = idEmpresa;
  }

  ObtenerMetodosPago(idEmpresa: number) {
    this.comprasService.SelectorMetodosPago(idEmpresa).subscribe(response => {
      //Las cuentas del cheque propio salen de los métodos TRANSFERENCIA de la empresa (su idFondo es el banco).
      this.cuentasCheque = ArmarCuentasCheque(response);

      this.metodosPago = response.filter((m: MetodoPago) =>
        m.tipo != TIPO_METODO_PAGO_COMPRA.CUENTA_CORRIENTE_PROVEEDOR &&
        (m.tipo != TIPO_METODO_PAGO_COMPRA.SALDO_FAVOR_PROVEEDOR || this.saldoAFavor > 0)
      );
      this.formPago.get('metodo')?.setValue(this.metodosPago[0]);
    });
  }

  AgregarPago() {
    if (this.formPago.invalid) return;
    const montoIngresado = this.formPago.get('monto')?.value;
    const metodoSeleccionado = this.formPago.get('metodo')?.value;

    //Cheque propio: el importe y los datos se cargan en el diálogo; el monto del campo es solo el valor
    //inicial (si está vacío se propone lo que falta para cubrir la deuda).
    if (metodoSeleccionado?.tipo === TIPO_METODO_PAGO_COMPRA.CHEQUE_PROPIO) {
      const montoPrevio = montoIngresado ? this.globalesService.EstandarizarDecimal(montoIngresado) : 0;
      this.importeChequeDefault = montoPrevio > 0 ? montoPrevio : Math.max(this.deuda - this.montoTotal, 0);
      this.dialogChequeVisible = true;
      return;
    }

    //Cheque de terceros: se elige cuál endosar en el selector; el importe es el del cheque (no se parte).
    //Si supera la deuda, el excedente queda como saldo a favor del proveedor.
    if (metodoSeleccionado?.tipo === TIPO_METODO_PAGO_COMPRA.CHEQUE) {
      this.dialogValoresVisible = true;
      return;
    }

    if (!montoIngresado) return;
    const montoFinal = this.globalesService.EstandarizarDecimal(montoIngresado);
    if (montoFinal <= 0) return;

    this.pagosRealizados.push({
      idMetodo: metodoSeleccionado.id,
      metodo: metodoSeleccionado.descripcion,
      monto: montoFinal,
    });
    this.pagosNuevos.push({
      idMetodo: metodoSeleccionado.id,
      monto: montoFinal,
    });

    this.formPago.get('monto')?.reset();
    this.formPago.get('metodo')?.setValue(this.metodosPago[0]);
  }

  ConfirmarChequePropio(datos: DatosChequeEmitido) {
    const metodoSeleccionado = this.formPago.get('metodo')?.value;
    if (!metodoSeleccionado) return;

    this.pagosRealizados.push({
      idMetodo: metodoSeleccionado.id,
      metodo: `${metodoSeleccionado.descripcion} · ${datos.cuentaNombre} #${datos.cheque.numero} (cobro ${this.FormatearFechaIso(datos.cheque.fechaPago)})`,
      monto: datos.importe,
    });
    this.pagosNuevos.push({
      idMetodo: metodoSeleccionado.id,
      monto: datos.importe,
      cheque: datos.cheque,
    });

    this.formPago.get('monto')?.reset();
    this.formPago.get('metodo')?.setValue(this.metodosPago[0]);
  }

  ConfirmarEndoso(valor: ValorEndosable) {
    const metodoSeleccionado = this.formPago.get('metodo')?.value;
    if (!metodoSeleccionado) return;

    const cobro = valor.chequeFechaCobro ? ` (cobro ${this.FormatearFechaIso(String(valor.chequeFechaCobro).substring(0, 10))})` : '';
    this.pagosRealizados.push({
      idMetodo: metodoSeleccionado.id,
      metodo: `${metodoSeleccionado.descripcion} · ${valor.chequeBanco ?? ''} #${valor.chequeNumero}${cobro}`,
      monto: valor.monto,
      idValorAcreditar: valor.id,
    });
    this.pagosNuevos.push({
      idMetodo: metodoSeleccionado.id,
      monto: valor.monto,
      idValorAcreditar: valor.id,
    });

    this.formPago.get('monto')?.reset();
    this.formPago.get('metodo')?.setValue(this.metodosPago[0]);
  }

  //Valores ya elegidos en este pago: el selector no los vuelve a ofrecer
  get valoresElegidos(): number[] {
    return this.pagosNuevos.filter(p => p.idValorAcreditar).map(p => p.idValorAcreditar!);
  }

  //Lo que falta para cubrir la deuda (para avisar en el selector qué cheques dejarían saldo a favor)
  get faltanteDeuda(): number {
    return Math.max(this.deuda - this.montoTotal, 0);
  }

  //'2026-12-03' -> '03/12/2026' (sin pasar por Date: evita correr el día por zona horaria)
  private FormatearFechaIso(iso: string): string {
    const [anio, mes, dia] = iso.split('-');
    return `${dia}/${mes}/${anio}`;
  }

  EliminarPago(indice: number) {
    if (indice == -1) return;
    this.pagosRealizados.splice(indice, 1);
    this.pagosNuevos.splice(indice, 1);
  }

  get montoTotal(): number {
    return this.pagosNuevos.reduce((acc, p) => acc + p.monto, 0);
  }

  Cerrar(recargar: boolean = false) {
    this.pagosRealizados = [];
    this.pagosNuevos = [];
    this.idEmpresaAnterior = null;
    this.formPago.reset();

    this.visibleChange.emit(false);

    if (recargar) this.recargar.emit(true);
  }

  Pagar() {
    if (this.pagosNuevos.length == 0) return;

    const montoTotal = this.montoTotal;
    let mensaje: string;

    if (montoTotal > this.deuda) {
      const excedente = montoTotal - this.deuda;
      mensaje = `Estás a punto de registrar un pago por $${montoTotal.toLocaleString('es-AR')}. Se cancelará la deuda de $${this.deuda.toLocaleString('es-AR')} y el excedente de $${excedente.toLocaleString('es-AR')} quedará como saldo a favor del proveedor.`;
    } else if (montoTotal === this.deuda) {
      mensaje = `Estás a punto de cancelar completamente la deuda por $${montoTotal.toLocaleString('es-AR')}.`;
    } else {
      mensaje = `Estás a punto de registrar un pago parcial por $${montoTotal.toLocaleString('es-AR')} a la deuda del proveedor.`;
    }

    this.confirmationService.confirm({
      key: 'confirmarPagoProveedor',
      message: mensaje,
      header: 'Confirmación',
      closable: true,
      closeOnEscape: true,
      icon: 'pi pi-exclamation-triangle',
      rejectButtonProps: {
        label: 'Cancelar',
        severity: 'secondary',
        outlined: true,
      },
      acceptButtonProps: {
        label: 'Aceptar',
      },
      accept: () => {
        const idEmpresa = this.formPago.get('empresa')?.value;
        const observaciones = this.formPago.get('observaciones')?.value;

        this.cuentasService.Pagar(idEmpresa, this.idCaja, this.idProveedor, this.pagosNuevos, observaciones)
          .subscribe(response => {
            if (response == 'OK') {
              this.Notificaciones.Success('Pago registrado correctamente.');
              this.Cerrar(true);
            }
          });
      },
      reject: () => {},
    });
  }
}
