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
import { MiscService } from '../../../../services/misc.service';
import { ComprasService } from '../../../../services/compras.service';
import { CuentasProveedoresService } from '../../../../services/cuentas-proveedores.service';
import { GlobalesService } from '../../../../services/globales.service';
import { NotificacionesService } from '../../../../services/notificaciones.service';

interface pagoDTO {
  idMetodo: number;
  monto: number;
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
