import { Component, ElementRef, EventEmitter, OnInit, Output, ViewChild } from '@angular/core';
import { AbstractControl, FormArray, FormControl, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { FORMS_IMPORTS } from '../../../../imports/forms.import';
import { TableModule } from 'primeng/table';
import { DatePickerModule } from 'primeng/datepicker';
import { TooltipModule } from 'primeng/tooltip';

import { Compra, CompraIva, CompraPercepcionIibb, DetalleCompra, PagoCompra } from '../../../../models/Compra';
import { Proveedor } from '../../../../models/Proveedor';
import { Empresa } from '../../../../models/Empresa';
import { MetodoPago } from '../../../../models/MetodoPago';
import { FiltroCuentasProveedores } from '../../../../models/filtros/FiltroCuentasProveedores';

import { ComprasService } from '../../../../services/compras.service';
import { ProveedoresService } from '../../../../services/proveedores.service';
import { MiscService } from '../../../../services/misc.service';
import { UsuariosService } from '../../../../services/usuarios.service';
import { NotificacionesService } from '../../../../services/notificaciones.service';
import { GlobalesService } from '../../../../services/globales.service';
import { CuentasProveedoresService } from '../../../../services/cuentas-proveedores.service';

import {
  ALICUOTA_IVA,
  ALICUOTAS_IVA_COMPRA,
  COMPROBANTES_COMPRA,
  COMPROBANTES_POR_CONDICION_EMPRESA,
  CondicionEmpresa,
  PROVINCIAS_IIBB,
  TIPO_COMPROBANTE_COMPRA,
  TIPO_METODO_PAGO_COMPRA,
  TipoComprobanteCompra,
} from '../models/compra.constants';

@Component({
  selector: 'app-addmod-compras',
  standalone: true,
  imports: [
    ...FORMS_IMPORTS,
    TableModule,
    DatePickerModule,
    TooltipModule,
  ],
  templateUrl: './addmod-compras.component.html',
  styleUrl: './addmod-compras.component.scss',
})
export class AddModComprasComponent implements OnInit {
  @Output() cerrar = new EventEmitter<boolean>(); //True: si hay que actualizar, False: si no hay que actualizar
  @ViewChild('inputConcepto') inputConcepto?: ElementRef<HTMLInputElement>;

  formulario: FormGroup;
  formLinea: FormGroup;
  formPercepcion: FormGroup;
  desdeRouting: boolean = false;
  sesion: any;

  compra: Compra = new Compra();
  lineas: DetalleCompra[] = [];
  percepcionesIibb: CompraPercepcionIibb[] = [];

  empresas: Empresa[] = [];
  proveedores: Proveedor[] = [];
  proveedoresFiltrados: Proveedor[] = [];
  proveedorSeleccionado: Proveedor | undefined;
  metodosPago: MetodoPago[] = [];
  comprobantesDisponibles: { id: TipoComprobanteCompra; descripcion: string }[] = [];

  //Forma de pago (multi-método, decisión 24-jun-2026)
  formPago: FormGroup;
  pagosNuevos: PagoCompra[] = [];
  saldoAFavor: number = 0;
  private idEmpresaAnterior: number | null = null;

  alicuotasIva = ALICUOTAS_IVA_COMPRA;
  provincias = PROVINCIAS_IIBB;
  TIPO_COMPROBANTE = TIPO_COMPROBANTE_COMPRA;

  decimal_mask: any;

  constructor(
    private comprasService: ComprasService,
    private proveedoresService: ProveedoresService,
    private miscService: MiscService,
    private usuariosService: UsuariosService,
    private globalesService: GlobalesService,
    private Notificaciones: NotificacionesService,
    private cuentasProveedoresService: CuentasProveedoresService,
    private rutaActiva: ActivatedRoute,
    private router: Router,
  ) {
    this.formulario = new FormGroup({
      empresa: new FormControl('', [Validators.required]),
      proveedor: new FormControl('', [Validators.required]),
      tComprobante: new FormControl('', [Validators.required]),
      nroComprobante: new FormControl(''),
      fecha: new FormControl(new Date(), [Validators.required]),

      iva21: new FormControl(''),
      iva105: new FormControl(''),
      iva27: new FormControl(''),

      tasaMunicipal: new FormControl(''),
      percepcionIva: new FormControl(''),
      retencionGanancia: new FormControl(''),
    });

    this.formLinea = new FormGroup({
      cantidad: new FormControl('1', [Validators.required]),
      concepto: new FormControl('', [Validators.required]),
      importe: new FormControl('', [Validators.required]),
    });

    this.formPercepcion = new FormGroup({
      provincia: new FormControl('', [Validators.required]),
      importe: new FormControl('', [Validators.required]),
    });

    this.formPago = new FormGroup({
      metodo: new FormControl('', [Validators.required]),
      monto: new FormControl('', [Validators.min(0)]),
    });
  }

  ngOnInit(): void {
    const path = this.rutaActiva.snapshot.routeConfig?.path;
    if (path === 'compras/add') this.desdeRouting = true;

    this.sesion = this.usuariosService.GetSesion().data;

    //Mascara decimal (igual a la usada en Ventas)
    this.decimal_mask = {
      mask: Number,
      scale: 2,
      thousandsSeparator: '.',
      radix: ',',
      normalizeZeros: true,
      padFractionalZeros: true,
      lazy: false,
      signed: false,
    };

    this.ObtenerEmpresas();
    this.ObtenerProveedores();

    //Nro de comprobante requerido salvo para Cotización (no es un comprobante fiscal real)
    this.formulario.get('tComprobante')?.valueChanges.subscribe(valor => {
      const nroCtrl = this.formulario.get('nroComprobante');
      nroCtrl?.clearValidators();
      if (valor !== TIPO_COMPROBANTE_COMPRA.COTIZACION) {
        nroCtrl?.setValidators([Validators.required]);
      }
      nroCtrl?.updateValueAndValidity();
    });
  }

  get nroComprobante() { return this.formulario.get('nroComprobante'); }

  //#region MASTER DATA
  ObtenerEmpresas() {
    this.miscService.ObtenerEmpresas().subscribe(response => {
      this.empresas = response;
      if (this.empresas.length > 0) {
        this.formulario.get('empresa')?.setValue(this.empresas[0].id);
        this.CambioEmpresa();
      }
    });
  }

  ObtenerProveedores() {
    this.proveedoresService.SelectorProveedores().subscribe(response => {
      this.proveedores = response;
    });
  }

  //Recalcula comprobantes habilitados (según abrevCondicion de la empresa) y métodos de pago propios.
  CambioEmpresa() {
    const idEmpresa = this.formulario.get('empresa')?.value;

    //Lock: no se puede cambiar de empresa con pagos ya cargados en la mini-tabla (decisión
    //24-jun-2026) - cada pago queda atado a un metodos_pago de la empresa con la que se cargó;
    //cambiar de empresa después dejaría esos idMetodo apuntando a la empresa equivocada.
    if (this.pagosNuevos.length > 0 && this.idEmpresaAnterior != null && idEmpresa !== this.idEmpresaAnterior) {
      this.formulario.get('empresa')?.setValue(this.idEmpresaAnterior, { emitEvent: false });
      this.Notificaciones.Warn("No podés cambiar de empresa con pagos ya cargados. Quitá los pagos primero.");
      return;
    }

    const empresa = this.empresas.find(e => e.id === idEmpresa);
    const condicion = (empresa?.abrevCondicion ?? '') as CondicionEmpresa;

    const idsHabilitados = COMPROBANTES_POR_CONDICION_EMPRESA[condicion] ?? [];
    this.comprobantesDisponibles = COMPROBANTES_COMPRA.filter(c => idsHabilitados.includes(c.id));

    const tComprobanteActual = this.formulario.get('tComprobante')?.value;
    const sigueDisponible = this.comprobantesDisponibles.some(c => c.id === tComprobanteActual);
    if (!sigueDisponible) {
      this.formulario.get('tComprobante')?.setValue(this.comprobantesDisponibles[0]?.id ?? '');
    }

    this.formPago.get('metodo')?.reset();
    if (idEmpresa) {
      this.ObtenerMetodosPago(idEmpresa);
    }

    this.idEmpresaAnterior = idEmpresa;
  }

  //Excluye SALDO_FAVOR_PROVEEDOR si el proveedor seleccionado no tiene saldo disponible.
  //A diferencia de pagar-proveedor, aquí CUENTA_CORRIENTE_PROVEEDOR sí es un método válido
  //(es la forma en que una compra puede generar deuda).
  ObtenerMetodosPago(idEmpresa: number) {
    this.comprasService.SelectorMetodosPago(idEmpresa).subscribe(response => {
      this.metodosPago = response.filter((m: MetodoPago) =>
        m.tipo != TIPO_METODO_PAGO_COMPRA.SALDO_FAVOR_PROVEEDOR || this.saldoAFavor > 0
      );
      this.formPago.get('metodo')?.setValue(this.metodosPago[0]);
    });
  }
  //#endregion

  //#region PROVEEDOR
  FiltrarProveedores(event: any) {
    const query = event.query.toLowerCase();
    this.proveedoresFiltrados = this.proveedores.filter(p => {
      const nombre = p.razonSocial!.toLowerCase();
      return nombre.includes(query);
    });
  }

  SeleccionarProveedor() {
    this.proveedorSeleccionado = this.formulario.get('proveedor')?.value;
    this.ObtenerSaldoAFavorProveedor();
  }

  //El saldo a favor es por proveedor: hay que refrescarlo al cambiar de proveedor y re-filtrar
  //los métodos de pago disponibles (puede habilitar/deshabilitar SALDO_FAVOR_PROVEEDOR).
  ObtenerSaldoAFavorProveedor() {
    if (!this.proveedorSeleccionado?.id) {
      this.saldoAFavor = 0;
      return;
    }

    const filtro = new FiltroCuentasProveedores({ idProveedor: this.proveedorSeleccionado.id, pagina: 1, tamanioPagina: 1 });
    this.cuentasProveedoresService.ObtenerCuentas(filtro).subscribe(response => {
      this.saldoAFavor = response.registros[0]?.saldoAFavor ?? 0;

      const idEmpresa = this.formulario.get('empresa')?.value;
      if (idEmpresa) this.ObtenerMetodosPago(idEmpresa);
    });
  }
  //#endregion

  //#region FORMA DE PAGO (multi-método, decisión 24-jun-2026)
  AgregarPago() {
    if (this.formPago.invalid) return;
    const montoIngresado = this.formPago.get('monto')?.value;
    const metodoSeleccionado = this.formPago.get('metodo')?.value;

    if (!montoIngresado) return;
    const montoFinal = this.globalesService.EstandarizarDecimal(montoIngresado);
    if (montoFinal <= 0) return;

    const pago = new PagoCompra();
    pago.idMetodo = metodoSeleccionado.id;
    pago.metodo = metodoSeleccionado.descripcion;
    pago.monto = montoFinal;
    this.pagosNuevos.push(pago);

    this.formPago.get('monto')?.reset();
    this.formPago.get('metodo')?.setValue(this.metodosPago[0]);
  }

  EliminarPago(indice: number) {
    if (indice == -1) return;
    this.pagosNuevos.splice(indice, 1);
  }

  get montoPagado(): number {
    return this.pagosNuevos.reduce((acc, p) => acc + (p.monto ?? 0), 0);
  }

  get remanente(): number {
    return this.totalPreview - this.montoPagado;
  }
  //#endregion

  //#region LINEAS (detalle libre: cantidad + concepto + importe)
  AgregarLinea() {
    this.markFormTouched(this.formLinea);
    if (!this.formLinea.valid) return;

    const nueva = new DetalleCompra();
    nueva.cantidad = Number(this.formLinea.get('cantidad')?.value) || 1;
    nueva.concepto = this.formLinea.get('concepto')?.value;
    nueva.importe = this.globalesService.EstandarizarDecimal(this.formLinea.get('importe')?.value);

    this.lineas.push(nueva);
    this.formLinea.reset({ cantidad: '1', concepto: '', importe: '' });
    this.inputConcepto?.nativeElement.focus();
  }

  QuitarLinea(index: number) {
    this.lineas.splice(index, 1);
  }
  //#endregion

  //#region PERCEPCIONES IIBB (una por provincia)
  AgregarPercepcion() {
    this.markFormTouched(this.formPercepcion);
    if (!this.formPercepcion.valid) return;

    const provincia = this.formPercepcion.get('provincia')?.value;
    if (this.percepcionesIibb.some(p => p.provincia === provincia)) {
      this.Notificaciones.Warn("Esa provincia ya tiene una percepción cargada.");
      return;
    }

    const nueva = new CompraPercepcionIibb();
    nueva.provincia = provincia;
    nueva.importe = this.globalesService.EstandarizarDecimal(this.formPercepcion.get('importe')?.value);

    this.percepcionesIibb.push(nueva);
    this.formPercepcion.reset({ provincia: '', importe: '' });
  }

  QuitarPercepcion(index: number) {
    this.percepcionesIibb.splice(index, 1);
  }
  //#endregion

  //#region TOTALES — preview en vivo. El backend siempre recalcula desde cero (ver comprasRepository.CalcularTotales);
  //esto es solo informativo para el usuario antes de guardar, no se envía al servidor.
  get totalNetoPreview(): number {
    return this.lineas.reduce((acc, l) => acc + (l.cantidad ?? 1) * (l.importe ?? 0), 0);
  }

  get totalIvaPreview(): number {
    return this.sumarDecimal('iva21') + this.sumarDecimal('iva105') + this.sumarDecimal('iva27');
  }

  get totalIibbPreview(): number {
    return this.percepcionesIibb.reduce((acc, p) => acc + (p.importe ?? 0), 0);
  }

  get tasaMunicipalPreview(): number {
    return this.sumarDecimal('tasaMunicipal');
  }

  get percepcionIvaPreview(): number {
    return this.sumarDecimal('percepcionIva');
  }

  get retencionGananciaPreview(): number {
    return this.sumarDecimal('retencionGanancia');
  }

  get totalPreview(): number {
    return this.totalNetoPreview
      + this.totalIvaPreview
      + this.totalIibbPreview
      + this.sumarDecimal('tasaMunicipal')
      + this.sumarDecimal('percepcionIva')
      + this.sumarDecimal('retencionGanancia');
  }

  private sumarDecimal(campo: string): number {
    return this.globalesService.EstandarizarDecimal(this.formulario.get(campo)?.value ?? '');
  }
  //#endregion

  Guardar() {
    this.markFormTouched(this.formulario);
    if (!this.formulario.valid) return;

    if (!this.proveedorSeleccionado) {
      this.Notificaciones.Warn("Seleccioná un proveedor de la lista antes de guardar.");
      return;
    }

    if (this.lineas.length === 0) {
      this.Notificaciones.Warn("Agregá al menos un concepto a la compra.");
      return;
    }

    if (this.pagosNuevos.length === 0) {
      this.Notificaciones.Warn("Agregá al menos un método de pago.");
      return;
    }

    //Bloqueo duro: a diferencia de Ventas, acá NO se completa el remanente con Cuenta Corriente
    //automáticamente (decisión 24-jun-2026) - la suma de la mini-tabla tiene que cerrar exacto.
    if (Math.abs(this.remanente) > 0.01) {
      this.Notificaciones.Warn(`La suma de los pagos ($${this.montoPagado.toLocaleString('es-AR')}) no coincide con el total de la compra ($${this.totalPreview.toLocaleString('es-AR')}).`);
      return;
    }

    this.compra.idEmpresa = this.formulario.get('empresa')?.value;
    this.compra.idProveedor = this.proveedorSeleccionado.id;
    this.compra.idCaja = this.sesion.idCaja;
    this.compra.idTipoComprobante = this.formulario.get('tComprobante')?.value;
    this.compra.nroComprobante = this.formulario.get('nroComprobante')?.value;
    this.compra.fecha = this.formulario.get('fecha')?.value;
    this.compra.pagos = this.pagosNuevos;

    this.compra.tasaMunicipal = this.sumarDecimal('tasaMunicipal');
    this.compra.percepcionIva = this.sumarDecimal('percepcionIva');
    this.compra.retencionGanancia = this.sumarDecimal('retencionGanancia');

    this.compra.detalle = this.lineas;
    this.compra.percepcionesIibb = this.percepcionesIibb;
    this.compra.iva = this.ArmarIva();

    this.comprasService.Agregar(this.compra).subscribe(response => {
      if (response == 'OK') {
        this.Notificaciones.Success("Compra registrada correctamente");
        if (this.desdeRouting) this.router.navigateByUrl('/compras');
        else this.CerrarModal(true);
      } else {
        this.Notificaciones.Warn(response);
      }
    });
  }

  //Solo se mandan al backend las alícuotas con importe cargado (>0).
  private ArmarIva(): CompraIva[] {
    const campos: { campo: string; idAlicuota: number }[] = [
      { campo: 'iva21', idAlicuota: ALICUOTA_IVA.VEINTIUNO },
      { campo: 'iva105', idAlicuota: ALICUOTA_IVA.DIEZ_CINCO },
      { campo: 'iva27', idAlicuota: ALICUOTA_IVA.VEINTISIETE },
    ];

    const iva: CompraIva[] = [];
    campos.forEach(c => {
      const importe = this.sumarDecimal(c.campo);
      if (importe > 0) {
        const item = new CompraIva();
        item.idAlicuota = c.idAlicuota;
        item.importe = importe;
        iva.push(item);
      }
    });

    return iva;
  }

  campoInvalido(campo: string): boolean {
    const control = this.formulario.get(campo);
    return !!(control && control.invalid && control.dirty);
  }

  SelectContent(event: FocusEvent) {
    const input = event.target as HTMLInputElement;
    input.select();
  }

  CerrarModal(actualizar: boolean) {
    this.cerrar.emit(actualizar);
  }

  //Volver: si se accedió por ruta, vuelve al listado; si es modal, lo cierra sin actualizar.
  Volver() {
    if (this.desdeRouting) this.router.navigateByUrl('/compras');
    else this.CerrarModal(false);
  }

  //Marca los campos del formulario como tocados para validar
  markFormTouched(control: AbstractControl) {
    if (control instanceof FormGroup || control instanceof FormArray) {
      Object.values(control.controls).forEach(c => this.markFormTouched(c));
    } else {
      control.markAsTouched();
      control.markAsDirty();
    }
  }
}
