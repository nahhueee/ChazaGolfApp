import { Component, EventEmitter, input, Input, Output, ViewChild } from '@angular/core';
import { FORMS_IMPORTS } from '../../../../imports/forms.import';
import { PagosFactura, Venta } from '../../../../models/Factura';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { MetodoPago } from '../../../../models/MetodoPago';
import { Empresa } from '../../../../models/Empresa';
import { TIPO_METODO_PAGO, TIPO_RETENCION_OPCIONES } from '../../ventas/models/venta.constants';
import { MiscService } from '../../../../services/misc.service';
import { TableModule } from 'primeng/table';
import { GlobalesService } from '../../../../services/globales.service';
import { NotificacionesService } from '../../../../services/notificaciones.service';
import { Dialog } from 'primeng/dialog';
import { CuentasCorrientesService } from '../../../../services/cuentas-corriente.service';
import { TextareaModule } from 'primeng/textarea';
import { ConfirmationService } from 'primeng/api';
import { ConfirmDialog, ConfirmDialogModule } from 'primeng/confirmdialog';
import { DialogChequeComponent, DatosCheque } from '../../ventas/dialog-cheque/dialog-cheque.component';

// Retención sufrida (Ganancias/IIBB/SUSS). Desacoplada de `cheque` a propósito -
// es un atributo del pago, no del instrumento (ver Factura.ts PagosFactura).
interface RetencionDTO {
  tipo: string;
  importe: number;
}

interface pagoDTO {
  idMetodo: number;
  monto: number;
  cheque?: any; // datos del cheque cuando el método es de tipo CHEQUE
  retencion?: RetencionDTO;
}

// Resumen genérico de un pago pendiente de confirmar, usado por el
// <p-confirmdialog> tanto en modo itemizado como en entrega general, para
// cualquier método (no solo cheque) - ver template del mensaje en el .html.
interface ResumenPagoConfirmacion {
  metodo: string;
  monto: number;
  cheque?: DatosCheque;
  retencion?: RetencionDTO;
}

@Component({
  selector: 'app-entrega-dinero',
  standalone: true,
  imports: [
    FORMS_IMPORTS,
    TableModule,
    Dialog,
    TextareaModule,
    ConfirmDialogModule,
    DialogChequeComponent
  ],
  templateUrl: './entrega-dinero.component.html',
  styleUrl: './entrega-dinero.component.scss',
  providers: [ConfirmationService],
})
export class EntregaDineroComponent {
  @Output() visibleChange = new EventEmitter<boolean>();
  @Output() recargar = new EventEmitter<boolean>();

  private _visible = false;
  @Input()
  set visible(value: boolean) {
    this._visible = value;
    if (value) this.CargarDatosEntrega();
  }
  get visible(): boolean {
    return this._visible;
  }

  @Input() venta: Venta = new Venta();
  @Input() deudaTotal: number = 0;
  @Input() desdeVenta: boolean = false;
  @Input() idCliente: number = 0;
  @Input() idCaja:number = 0;
  @Input() pagosRealizados: PagosFactura[] = [];

  decimal_mask:any;
  formPagos:FormGroup;
  metodosPago:MetodoPago[]=[];
  empresas:Empresa[]=[];
  saldoAFavor:number = 0;
  pagosNuevos: pagoDTO[]=[];

  //Para entrega general
  montoEntregar:number = 0;
  metodoSeleccionado:number = 0;
  alerta:string = "";

  // Dialog cheque
  dialogChequeVisible: boolean = false;
  dialogChequeImporte: number = 0;
  dialogChequeDatos: DatosCheque | null = null;

  // Cheque cargado para la ENTREGA GENERAL (!desdeVenta) - un solo pago.
  private _chequeEntregaGeneral: DatosCheque | null = null;
  // Cheque cargado para la línea que se está armando en modo ITEMIZADO
  // (desdeVenta) - antes de tocar "Confirmar". Si es una edición de una fila
  // ya agregada, ver _indiceEdicionFila.
  private _chequeItemizadoForm: DatosCheque | null = null;
  // Cuando no es null, "Confirmar" reemplaza la fila en ese índice en vez de
  // agregar una nueva (ver EditarPago/ConfirmarPagoItemizado). A diferencia del
  // diseño anterior, la fila NO se saca de la tabla mientras se edita - así no
  // hay nada que "restaurar" si se cancela el diálogo del cheque a mitad de camino.
  private _indiceEdicionFila: number | null = null;

  // true cuando el diálogo de cheque se abrió desde "Editar" en el resumen de
  // confirmación (ver EditarDesdeResumen): al confirmar, hay que retomar
  // Guardar() para volver directo al resumen actualizado. Si se abrió desde los
  // botones de "Detalle adicional" del form principal, el usuario decide cuándo
  // avanzar - no se auto-navega a ningún lado.
  private _editandoDesdeResumen = false;
  // Guarda contra el reject() del confirmDialog cuando el cierre lo dispara
  // nuestro propio botón "Editar" (ver EditarDesdeResumen) y no un cancelar real -
  // mismo patrón que `cierreManejado` en dialog-cheque.component.ts.
  private _cerrandoParaEditar = false;

  // Resumen genérico mostrado en el <p-confirmdialog> antes de confirmar
  // (ver template #message en el .html). Sirve para cualquier método, no solo cheque.
  resumenPagos: ResumenPagoConfirmacion[] = [];
  resumenAlerta: string = '';

  readonly tipoRetencionOpciones = TIPO_RETENCION_OPCIONES;

  @ViewChild(ConfirmDialog) confirmDialogRef!: ConfirmDialog;

  constructor(
    private miscService:MiscService,
    private globalesService:GlobalesService,
    private Notificaciones:NotificacionesService,
    private cuentasService:CuentasCorrientesService,
    private confirmationService: ConfirmationService,
  ){
    this.formPagos = new FormGroup({
      empresa: new FormControl('', []),
      metodo: new FormControl('', [Validators.required]),
      monto: new FormControl('', [Validators.min(0)]),
      observaciones: new FormControl('', [Validators.maxLength(250)]),
      tipoRetencion: new FormControl<string | null>(null),
      importeRetencion: new FormControl<number | null>(null, [Validators.min(0)]),
    });

    // Si el usuario cambia de método (manualmente, o porque el propio código
    // resetea el form tras agregar/editar un pago), cualquier cheque cargado
    // para la línea en construcción deja de aplicar - evita que quede un
    // cheque "fantasma" de una selección anterior si vuelve a elegir CHEQUE.
    this.formPagos.get('metodo')?.valueChanges.subscribe(() => {
      this._chequeItemizadoForm = null;
      this._indiceEdicionFila = null;
      this._chequeEntregaGeneral = null;
    });
  }

  // true cuando el método elegido es CHEQUE - condiciona la sección "Detalle
  // adicional" (cargar/editar datos del cheque) y la validación de envío.
  get metodoEsCheque(): boolean {
    return this.formPagos.get('metodo')?.value?.tipo === TIPO_METODO_PAGO.CHEQUE;
  }

  // Métodos que hoy pueden traer una retención sufrida (Ganancias/IIBB/SUSS).
  // Independiente de "Detalle adicional": la retención es un atributo del pago,
  // no del instrumento, así que se habilita para cheque, transferencia y
  // efectivo por igual - el día que se sume otro método con datos propios
  // (ej. una tarjeta con cupón), entra a "Detalle adicional" sin tocar esto.
  get metodoPermiteRetencion(): boolean {
    const tipo = this.formPagos.get('metodo')?.value?.tipo;
    return tipo === TIPO_METODO_PAGO.CHEQUE
        || tipo === TIPO_METODO_PAGO.TRANSFERENCIA
        || tipo === TIPO_METODO_PAGO.EFECTIVO;
  }

  // Modo entrega general: si el método es cheque, hace falta haber cargado sus
  // datos antes de poder registrar la entrega (ver validación en Guardar()).
  get chequeGeneralCargado(): boolean {
    return !!this._chequeEntregaGeneral;
  }

  // Modo itemizado: mismo criterio que arriba, pero para la línea que se está
  // armando antes de tocar "Confirmar" (ver validación en AgregarPago()).
  get chequeItemizadoCargado(): boolean {
    return !!this._chequeItemizadoForm;
  }

  // Arma el DTO de retención a partir de los campos del form, o undefined si no
  // se cargó nada. Se llama en el momento de confirmar el pago (no antes), para
  // que siempre refleje el valor vigente del form.
  private ArmarRetencion(): RetencionDTO | undefined {
    const tipo = this.formPagos.get('tipoRetencion')?.value;
    const importeRaw = this.formPagos.get('importeRetencion')?.value;
    const importe = importeRaw ? this.globalesService.EstandarizarDecimal(importeRaw) : 0;
    if (!tipo || importe <= 0) return undefined;
    return { tipo, importe };
  }

  // Abre el diálogo de cheque desde el form de ENTREGA GENERAL - sirve tanto
  // para cargarlo por primera vez como para editarlo.
  AbrirDialogChequeGeneral() {
    const montoIngresado = this.formPagos.get('monto')?.value;
    const montoFinal = montoIngresado
      ? this.globalesService.EstandarizarDecimal(montoIngresado)
      : this.deudaTotal;

    if (montoFinal <= 0) {
      this.Notificaciones.Warn("Ingresá un monto antes de cargar los datos del cheque.");
      return;
    }

    // Si ya había uno cargado, reabre en modo edición con esos datos.
    this.dialogChequeDatos   = this._chequeEntregaGeneral;
    this.dialogChequeImporte = this._chequeEntregaGeneral?.importe ?? montoFinal;
    this.dialogChequeVisible = true;
  }

  // Abre el diálogo de cheque desde el form ITEMIZADO (pago de una venta
  // puntual) - sirve tanto para cargarlo por primera vez como para editarlo
  // (incluida la edición de una fila ya agregada, ver EditarPago).
  AbrirDialogChequeItemizado() {
    const montoIngresado = this.formPagos.get('monto')?.value;
    const montoFinal = montoIngresado
      ? this.globalesService.EstandarizarDecimal(montoIngresado)
      : this.montoRestante;

    if (montoFinal <= 0) {
      this.Notificaciones.Warn("Ingresá un monto antes de cargar los datos del cheque.");
      return;
    }

    this.dialogChequeDatos   = this._chequeItemizadoForm;
    this.dialogChequeImporte = this._chequeItemizadoForm?.importe ?? montoFinal;
    this.dialogChequeVisible = true;
  }

  CargarDatosEntrega(){
    // Necesitamos saber si el cliente tiene saldo a favor antes de armar el listado de métodos
    this.cuentasService.ObtenerSaldoTotalCliente(this.idCliente).subscribe(response => {
      this.saldoAFavor = response * -1;

      if (this.desdeVenta) {
        // Pago de venta: empresa fija desde la venta, sin selector
        this.ObtenerMetodosPago(this.venta.idEmpresa!);
      } else {
        // Entrega general: cargar empresas y métodos de la empresa por defecto
        this.miscService.ObtenerEmpresas().subscribe(empresas => {
          this.empresas = empresas;
          const idEmpresaDefault = this.empresas[0]?.id;
          this.formPagos.get('empresa')?.setValue(idEmpresaDefault);
          if (idEmpresaDefault) this.ObtenerMetodosPago(idEmpresaDefault);
        });
      }
    });
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

  get montoControl() {return this.formPagos.get('monto')?.value;}

  // Método de pago "Efectivo" del listado ya cargado, usado como default de
  // "pago al contado"/reset de form. Se busca por `tipo` (string, estable
  // entre empresas) y NO por `id` ni por índice [0]: como `metodos_pago` es
  // una tabla por empresa con auto-increment propio, ni el id ni el orden en
  // que el backend devuelve las filas es el mismo para todas las empresas
  // (ver METODO_PAGO.CUENTA_CORRIENTE/SALDO_A_FAVOR más abajo, que sí son ids
  // fijos - y por eso solo funcionan para la empresa 1).
  private get metodoEfectivo(): MetodoPago | undefined {
    return this.metodosPago.find(m => m.tipo === TIPO_METODO_PAGO.EFECTIVO);
  }

  ObtenerMetodosPago(idEmpresa: number){
    this.miscService.ObtenerMetodosPago(idEmpresa)
      .subscribe(response => {
        this.metodosPago = response.filter((m: MetodoPago) =>
          m.tipo !== TIPO_METODO_PAGO.CUENTA_CORRIENTE &&
          (m.tipo !== TIPO_METODO_PAGO.SALDO_FAVOR || this.saldoAFavor > 0)
        );
        this.formPagos.get('metodo')?.setValue(this.metodoEfectivo ?? this.metodosPago[0]);
      });
  }

  CambioEmpresa(){
    const idEmpresa = this.formPagos.get('empresa')?.value;
    if (!idEmpresa) return;
    this.formPagos.get('metodo')?.reset();
    this.ObtenerMetodosPago(idEmpresa);
  }

  AgregarPagoContado(){
    if(this.venta.deuda == 0) return;

    const seleccionado = this.metodoEfectivo ?? this.metodosPago[0];

    // CHEQUE: los datos tienen que estar cargados de antemano (ver "Detalle
    // adicional" en el form) - ya no se abre el diálogo automáticamente acá.
    if (seleccionado.tipo === TIPO_METODO_PAGO.CHEQUE && !this._chequeItemizadoForm) {
      this.Notificaciones.Warn("Cargá los datos del cheque antes de confirmar el pago.");
      return;
    }

    const nuevoPago = new PagosFactura();
    nuevoPago.idMetodo = seleccionado.id;
    nuevoPago.metodo = seleccionado.descripcion;
    nuevoPago.tipo = seleccionado.tipo;
    nuevoPago.monto = this.venta.deuda;
    nuevoPago.retencion = this.ArmarRetencion();
    if (seleccionado.tipo === TIPO_METODO_PAGO.CHEQUE) {
      nuevoPago.cheque = this._chequeItemizadoForm!;
    }

    this.ConfirmarPagoItemizado(nuevoPago);
  }

  get montoRestante(): number {
    // Cuenta Corriente no es plata real (queda pendiente de cobro justamente
    // hasta este pago) - si se cuenta acá, una venta financiada 100% a CC
    // calculaba entregado=total y bloqueaba el registro del pago real. Por
    // tipo, no por id fijo (idMetodo es específico de cada empresa).
    const entregado = this.pagosRealizados?.reduce(
      (acc, item, idx) => acc + (
        idx === this._indiceEdicionFila || item.tipo === TIPO_METODO_PAGO.CUENTA_CORRIENTE
          ? 0
          : (item.monto || 0)
      ),
      0
    ) || 0;

    return Math.max(this.venta.total! - entregado, 0);
  }

  AgregarPago() {
    if (this.formPagos.invalid) return;
    const montoIngresado = this.formPagos.get('monto')?.value;
    const metodoSeleccionado = this.formPagos.get('metodo')?.value;

    const montoFinal = montoIngresado
      ? this.globalesService.EstandarizarDecimal(montoIngresado)
      : this.montoRestante;

    if (montoFinal <= 0) return;

    if (montoFinal > this.montoRestante) {
      this.Notificaciones.Warn("La entrega por pago no puede superar el total a pagar.");
      return;
    }

    // CHEQUE: los datos tienen que estar cargados de antemano (ver "Detalle
    // adicional" en el form) - ya no se abre el diálogo automáticamente acá.
    if (metodoSeleccionado.tipo === TIPO_METODO_PAGO.CHEQUE && !this._chequeItemizadoForm) {
      this.Notificaciones.Warn("Cargá los datos del cheque antes de confirmar el pago.");
      return;
    }

    const nuevoPago = new PagosFactura();
    nuevoPago.idMetodo = metodoSeleccionado.id;
    nuevoPago.metodo = metodoSeleccionado.descripcion;
    nuevoPago.tipo = metodoSeleccionado.tipo;
    nuevoPago.monto = montoFinal;
    nuevoPago.retencion = this.ArmarRetencion();
    if (metodoSeleccionado.tipo === TIPO_METODO_PAGO.CHEQUE) {
      nuevoPago.cheque = this._chequeItemizadoForm!;
    }

    this.ConfirmarPagoItemizado(nuevoPago);
  }

  // Trae de vuelta al form una fila de cheque ya agregada para poder
  // corregirla. A diferencia del diseño anterior, la fila NO se saca de la
  // tabla acá - se reemplaza recién cuando se confirma la edición (ver
  // ConfirmarPagoItemizado), así que cancelar a mitad de camino no requiere
  // restaurar nada. Solo aplica a pagos todavía no persistidos (mismo criterio
  // que el botón Quitar, deshabilitado si pago.id != 0).
  EditarPago(rowIndex: number) {
    const pago = this.pagosRealizados[rowIndex];
    if (!pago || pago.id != 0 || pago.tipo !== TIPO_METODO_PAGO.CHEQUE || !pago.cheque) return;

    const metodo = this.metodosPago.find(m => m.id === pago.idMetodo) ?? this.metodosPago[0];
    this.formPagos.patchValue({
      metodo,
      monto: pago.monto,
      tipoRetencion: pago.retencion?.tipo ?? null,
      importeRetencion: pago.retencion?.importe ?? null,
    });

    // Seteados DESPUÉS del patchValue: el listener de metodo.valueChanges (ver
    // constructor) los resetea a null ante cualquier cambio de método,
    // incluido este mismo patch.
    this._indiceEdicionFila = rowIndex;
    this._chequeItemizadoForm = pago.cheque;
  }

  private ConfirmarPagoItemizado(pago: PagosFactura) {
    const pagoDto: pagoDTO = {
      idMetodo: pago.idMetodo!,
      monto: pago.monto!,
      cheque: pago.cheque,
      retencion: pago.retencion,
    };

    if (this._indiceEdicionFila !== null) {
      this.pagosRealizados[this._indiceEdicionFila] = pago;
      this.pagosNuevos[this._indiceEdicionFila] = pagoDto;
    } else {
      this.pagosRealizados.push(pago);
      this.pagosNuevos.push(pagoDto);
    }

    this._indiceEdicionFila = null;
    this._chequeItemizadoForm = null;
    this.formPagos.reset();
    this.formPagos.get('metodo')?.setValue(this.metodoEfectivo ?? this.metodosPago[0]);
  }

  onChequeConfirmado(datos: DatosCheque): void {
    this.dialogChequeDatos = null;

    if (this.desdeVenta) {
      this._chequeItemizadoForm = datos;
    } else {
      this._chequeEntregaGeneral = datos;
    }

    if (this._editandoDesdeResumen) {
      this._editandoDesdeResumen = false;
      // Modo itemizado: re-confirma el pago (reemplaza la fila en
      // _indiceEdicionFila) antes de volver a mostrar el resumen actualizado.
      if (this.desdeVenta) this.AgregarPago();
      this.Guardar();
    }
  }

  onChequeCancelado(): void {
    // No hay nada que restaurar: en modo itemizado la fila nunca se saca de la
    // tabla mientras se edita (ver EditarPago), y en modo general el cheque
    // previamente cargado no se toca hasta que se confirma uno nuevo.
    this._editandoDesdeResumen = false;
    this.dialogChequeDatos     = null;
  }

  EliminarPago(indice:number){
    if(indice == -1) return;
    this.pagosRealizados.splice(indice, 1);
    this.pagosNuevos.splice(indice, 1);

    // Si había una edición en curso, hay que corregir el índice (o cancelarla
    // directamente si la fila borrada era justo la que se estaba editando).
    if (this._indiceEdicionFila !== null) {
      if (indice === this._indiceEdicionFila) {
        this._indiceEdicionFila = null;
        this._chequeItemizadoForm = null;
        this.formPagos.reset();
        this.formPagos.get('metodo')?.setValue(this.metodoEfectivo ?? this.metodosPago[0]);
      } else if (indice < this._indiceEdicionFila) {
        this._indiceEdicionFila--;
      }
    }
  }

  // Reabre el diálogo del cheque desde el resumen del <p-confirmdialog> - ver
  // ResumenPagoConfirmacion en el .html. El botón "Editar" ahí solo se muestra
  // cuando el pago tiene cheque, así que no hace falta re-validarlo acá.
  EditarDesdeResumen(index: number) {
    this._cerrandoParaEditar = true;
    this.confirmDialogRef?.close();
    this._editandoDesdeResumen = true;

    if (this.desdeVenta) {
      this.EditarPago(index);
      this.AbrirDialogChequeItemizado();
      return;
    }

    this.AbrirDialogChequeGeneral();
  }

  Cerrar(recargar:boolean = false) {
    this.pagosNuevos = [];
    this.montoEntregar = 0;
    this.metodoSeleccionado = 0;
    this._chequeEntregaGeneral = null;
    this._chequeItemizadoForm = null;
    this._indiceEdicionFila = null;
    this._editandoDesdeResumen = false;
    this.resumenPagos = [];
    this.resumenAlerta = '';

    this.visibleChange.emit(false);

    if (recargar) {
      this.recargar.emit(true);
    }
  }

  Guardar(){
    if (this.formPagos.invalid) return;
    const montoIngresado = this.formPagos.get('monto')?.value;
    const metodoSeleccionado = this.formPagos.get('metodo')?.value;

    if(this.desdeVenta){
      // Resumen genérico para el confirmdialog: lista tal cual los pagos ya
      // cargados en la tabla (cada uno con su cheque/retención si corresponde).
      this.resumenPagos = this.pagosRealizados.map(p => ({
        metodo: p.metodo!,
        monto: p.monto!,
        cheque: p.cheque,
        retencion: p.retencion,
      }));
      this.resumenAlerta = '¿Estas seguro de registrar los pagos a la venta?';

      this.confirmationService.confirm({
        key: 'confirmarDialog',
        message: this.resumenAlerta,
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
          this.cuentasService.EntregaDineroVenta(this.venta.id!, this.idCaja, this.venta.cliente?.id!, this.venta.deuda, this.pagosNuevos)
          .subscribe(response => {
            if(response == "OK"){
              this.Notificaciones.Success("Pagos registrados correctamente");
              this.Cerrar(true);
            }
          });
        },
        reject: () => {
          if (this._cerrandoParaEditar) {
            this._cerrandoParaEditar = false;
          }
        },
      });

    }else{
      const montoFinal = montoIngresado
      ? this.globalesService.EstandarizarDecimal(montoIngresado)
      : this.deudaTotal;

      if (montoFinal <= 0) return;

      // Validación: si el método es cheque, hace falta haber cargado sus datos
      // ANTES de poder registrar la entrega (ahora es un paso explícito del
      // usuario en "Detalle adicional", ya no se dispara solo al tocar este botón).
      if (metodoSeleccionado.tipo === TIPO_METODO_PAGO.CHEQUE && !this._chequeEntregaGeneral) {
        this.Notificaciones.Warn("Cargá los datos del cheque antes de registrar la entrega.");
        return;
      }

      const retencion = this.ArmarRetencion();

      this.montoEntregar = montoFinal;
      this.metodoSeleccionado = metodoSeleccionado.id;

      if (montoFinal > this.deudaTotal) {
          const excedente = montoFinal - this.deudaTotal;

        this.alerta = `Estas a punto de registrar una entrega por $${montoFinal.toLocaleString('es-AR')}.
                       Se cancelará la deuda de $${this.deudaTotal.toLocaleString('es-AR')} y el excedente de $${excedente.toLocaleString('es-AR')} quedará como saldo a favor del cliente.`;

      } else if (montoFinal === this.deudaTotal) {
        this.alerta = `Estas a punto de cancelar completamente la deuda por $${montoFinal.toLocaleString('es-AR')}.`;
      } else {
        this.alerta = `Estas a punto de registrar una entrega parcial por $${montoFinal.toLocaleString('es-AR')} a la deuda del cliente.`;
      }

      // Resumen genérico para el confirmdialog (un solo pago, cualquier método).
      this.resumenPagos = [{
        metodo: metodoSeleccionado.descripcion,
        monto: this.montoEntregar,
        cheque: this._chequeEntregaGeneral ?? undefined,
        retencion,
      }];
      this.resumenAlerta = this.alerta;

      this.confirmationService.confirm({
        key: 'confirmarDialog',
        message: this.resumenAlerta,
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
          const idEmpresa = this.formPagos.get('empresa')?.value;
          this.cuentasService.EntregaDinero(this.idCaja, this.idCliente, idEmpresa, this.metodoSeleccionado, this.montoEntregar, this.formPagos.get('observaciones')?.value, this._chequeEntregaGeneral ?? undefined, retencion)
          .subscribe(response => {
            if(response == "OK"){
              this.alerta = "";
              this.metodoSeleccionado = 0;
              this.montoEntregar = 0;
              this._chequeEntregaGeneral = null;
              this.formPagos.reset();

              this.Notificaciones.Success("Entrega registrada correctamente");
              this.Cerrar(true);
            }
          });
        },
        reject: () => {
          // Si el cierre lo disparó nuestro propio botón "Editar" (ver
          // EditarDesdeResumen), no hay que limpiar nada - se está por reabrir
          // el diálogo del cheque con estos mismos datos precargados.
          if (this._cerrandoParaEditar) {
            this._cerrandoParaEditar = false;
            return;
          }
          this._chequeEntregaGeneral = null;
        },
      });
    }
  }
}
