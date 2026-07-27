import { Component, EventEmitter, Input, Output, SimpleChanges } from '@angular/core';
import { FormGroup, FormControl, Validators } from '@angular/forms';
import { FORMS_IMPORTS } from '../../../../imports/forms.import';
import { Dialog } from 'primeng/dialog';
import { TooltipModule } from 'primeng/tooltip';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService } from 'primeng/api';
import { Subject, takeUntil } from 'rxjs';

import { Cliente } from '../../../../models/Cliente';
import { ClientesService } from '../../../../services/clientes.service';
import { MiscService } from '../../../../services/misc.service';
import { UsuariosService } from '../../../../services/usuarios.service';
import { GlobalesService } from '../../../../services/globales.service';
import { Venta } from '../../../../models/Factura';
import { VentasService } from '../../../../services/ventas.service';
import { NotificacionesService } from '../../../../services/notificaciones.service';
import { Empresa } from '../../../../models/Empresa';
import { ID_PROCESO, TIPO_COMPROBANTE, ESTADO_VENTA, LISTA_PRECIO } from '../models/venta.constants';

// Motivos fijos para una ND "X" (cargo interno, no fiscal). Hoy el cliente solo
// usa "CARGO POR DEPÓSITO", pero se deja como array (mismo patrón que
// MOTIVOS_SIN_PRODUCTOS en nota-credito-x.component.ts) para poder sumar más
// opciones a futuro sin tocar la estructura del componente. Mientras haya una
// sola opción, queda preseleccionada.
const MOTIVOS_ND_X = ['CARGO POR DEPÓSITO'];

// Nota de Débito "X": análoga a la Nota de Crédito "X" (nota-credito-x.component.ts)
// pero invertida - en vez de generar saldo a favor, genera saldo deudor para el
// cliente. Es interna, no fiscal (no pasa por AFIP/ARCA), y no está atada a
// ninguna venta anterior (a diferencia de la ND clásica de notas-venta.component,
// que sí ajusta una factura ya emitida).
//
// A diferencia de la NC X, esta pantalla NO tiene sección de productos ni
// checkbox "Sin productos": siempre es un cargo puramente monetario (decisión
// jul-2026, ver conversación con el cliente - hoy el único caso de uso es
// "CARGO POR DEPÓSITO", sin mercadería de por medio). Por eso tampoco descuenta
// stock (ver comentario en ventasRepository.ts/Agregar, rama de stock). Si en el
// futuro aparece un caso real de ND con mercadería, es una decisión de negocio
// aparte - ahí sí se justificaría duplicar la sección de productos de la NC X.
@Component({
  selector: 'app-nota-debito-x',
  standalone: true,
  imports: [
    ...FORMS_IMPORTS,
    Dialog,
    TooltipModule,
    ConfirmDialogModule,
  ],
  providers: [ConfirmationService],
  templateUrl: './nota-debito-x.component.html',
  styleUrl: './nota-debito-x.component.scss',
})
export class NotaDebitoXComponent {
  @Input() visible = false;
  @Output() cerrar = new EventEmitter<boolean>();

  private destroy$ = new Subject<void>();
  sesion: any;
  guardando = false;

  // Mismo mask decimal (miles con punto, decimales con coma) que usa NC X para
  // el input Total.
  decimal_mask = {
    mask: Number,
    scale: 2,
    thousandsSeparator: '.',
    radix: ',',
    normalizeZeros: true,
    padFractionalZeros: true,
    lazy: false,
    signed: false,
  };

  // CLIENTE
  formCliente: FormGroup;
  clientes: Cliente[] = [];
  clientesFiltrados: Cliente[] = [];
  clienteSeleccionado?: Cliente;

  // CARGO (motivo + total)
  motivos = MOTIVOS_ND_X;
  formCargo: FormGroup;

  empresas: Empresa[] = [];

  get total(): number {
    // Mismo criterio que NC X: el valor crudo del FormControl queda como string
    // formateado por el mask (punto de miles, coma decimal), hay que reparsearlo.
    return this.globalesService.EstandarizarDecimal(this.formCargo?.get('total')?.value ?? '');
  }

  // Mismo formato es-AR que usa decimalFormat.pipe.ts, para que el mensaje de
  // confirmación coincida con lo que se ve en pantalla.
  private formatoMoneda(valor: number): string {
    return valor.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  constructor(
    private clientesService: ClientesService,
    private miscService: MiscService,
    private usuariosService: UsuariosService,
    private ventasService: VentasService,
    private Notificaciones: NotificacionesService,
    private confirmationService: ConfirmationService,
    private globalesService: GlobalesService,
  ) {
    this.ArmarFormularios();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['visible']?.currentValue === true) {
      this.Inicializar();
    }
  }

  private ArmarFormularios(): void {
    this.formCliente = new FormGroup({
      cliente: new FormControl('', [Validators.required]),
    });

    this.formCargo = new FormGroup({
      // Preseleccionado con el único motivo disponible (ver MOTIVOS_ND_X).
      motivo: new FormControl(MOTIVOS_ND_X[0]),
      total: new FormControl(''),
    });
  }

  private Inicializar(): void {
    this.sesion = this.usuariosService.GetSesion()?.data;
    this.ReiniciarTodo();

    this.clientesService.SelectorClientes()
      .pipe(takeUntil(this.destroy$))
      .subscribe(response => this.clientes = response);

    this.miscService.ObtenerEmpresas()
      .pipe(takeUntil(this.destroy$))
      .subscribe(response => this.empresas = response);
  }

  private ReiniciarTodo(): void {
    this.clienteSeleccionado = undefined;
    this.formCliente.reset();
    this.formCargo.reset({ motivo: MOTIVOS_ND_X[0], total: '' });
  }

  //#region CLIENTE
  FiltrarClientes(event: any) {
    const query = (event.query ?? '').toLowerCase();
    this.clientesFiltrados = this.clientes.filter(c => {
      const nombre = (c.nombre ?? '').toLowerCase();
      const dni = (c.documento ?? '').toString();
      const razon = (c.razonSocial ?? '').toLowerCase();
      return nombre.includes(query) || dni.includes(query) || razon.includes(query);
    });
  }

  SeleccionarCliente() {
    const seleccionado = this.formCliente.get('cliente')?.value;
    if (!seleccionado?.id) return;

    this.clientesService.ObtenerCliente(seleccionado.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe(response => {
        this.clienteSeleccionado = response;
      });
  }
  //#endregion

  //#region GUARDAR
  Guardar(): void {
    if (!this.clienteSeleccionado) {
      this.formCliente.get('cliente')?.markAsTouched();
      this.Notificaciones.Warn("Seleccioná un cliente antes de guardar.");
      return;
    }

    if (!this.formCargo.get('motivo')?.value) {
      this.formCargo.get('motivo')?.markAsTouched();
      this.Notificaciones.Warn("Seleccioná un motivo.");
      return;
    }

    if (this.total <= 0) {
      this.Notificaciones.Warn("No se permite realizar una nota de débito por $0.");
      return;
    }

    const mensaje = `Se va a generar una deuda de $${this.formatoMoneda(this.total)} para ${this.clienteSeleccionado!.nombre} (${this.formCargo.get('motivo')?.value}). No se mueve stock. ¿Confirmar?`;

    this.confirmationService.confirm({
      key: 'confirmarND',
      header: 'Confirmar Nota de Débito',
      message: mensaje,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Confirmar',
      rejectLabel: 'Cancelar',
      rejectButtonProps: { severity: 'secondary', outlined: true },
      accept: () => this.ConfirmarGuardado(),
    });
  }

  private ConfirmarGuardado(): void {
    const nuevaVenta = new Venta();
    nuevaVenta.idProceso = ID_PROCESO.NOTA_DEBITO;
    nuevaVenta.proceso = "Nota de Débito";
    nuevaVenta.idTipoComprobante = TIPO_COMPROBANTE.ND_X;
    nuevaVenta.idPunto = 7; // Otros - mismo criterio que NC X (no usa un punto de venta real)
    nuevaVenta.idCaja = this.sesion?.idCaja;
    nuevaVenta.idEmpresa = this.empresas[0]?.id;
    nuevaVenta.fecha = new Date();
    nuevaVenta.estado = ESTADO_VENTA.FINALIZADA;
    // nroRelacionado/tipoRelacionado son NOT NULL en la tabla ventas (ver mismo
    // comentario en nota-credito-x.component.ts) - esta ND libre nunca está
    // relacionada a un Presupuesto/Pedido/Nota de Empaque.
    nuevaVenta.nroRelacionado = 0;
    nuevaVenta.tipoRelacionado = "";
    nuevaVenta.idTipoDescuento = 1;
    nuevaVenta.codPromocion = 0;
    nuevaVenta.cliente = this.clienteSeleccionado;
    nuevaVenta.idListaPrecio = this.clienteSeleccionado?.idListaPrecio ?? LISTA_PRECIO.CONSUMIDOR_FINAL;
    nuevaVenta.total = this.total;

    // Siempre "sin productos": no hay nada que descontar de stock (ver
    // comentario de diseño en el header del componente). El motivo elegido
    // queda como observación de la venta, igual que en NC X.
    nuevaVenta.productos = [];
    nuevaVenta.observacion = this.formCargo.get('motivo')?.value;

    // impaga=1: la ND X siempre viaja 100% sin pagar (pagos=[] más abajo), igual
    // que una venta financiada 100% a Cuenta Corriente (ver addmod-ventas,
    // pagoCompleto==false). Sin esto, ObtenerVentasImpagas (cuentasRepository.ts)
    // no la ofrece como deuda cobrable en Entrega de Dinero - el saldo total del
    // cliente igual quedaría bien calculado (ObtenerSaldoCliente no depende de
    // impaga), pero esta deuda puntual quedaría "invisible" para cobrarla
    // individualmente. Mismo bug de fondo que Venta #109 (Club Náutico San
    // Isidro, corregido 07/2026): impaga=0 por default en el modelo Venta.
    nuevaVenta.impaga = 1;

    // Sin pagos: no hay venta de origen ni cobro real, es puramente un cargo a
    // cuenta corriente (ver ObtenerSaldoCliente/extracto en el backend - el
    // saldo se calcula por idTComprobante + total, no por ventas_pagos).
    nuevaVenta.pagos = [];

    this.guardando = true;
    this.ventasService.Agregar(nuevaVenta)
      .subscribe({
        next: (response) => {
          this.guardando = false;
          if (response) {
            this.Notificaciones.Success("Nota de débito generada correctamente.");
            this.CerrarModal(true);
          }
        },
        error: () => {
          this.guardando = false;
        }
      });
  }
  //#endregion

  CerrarModal(actualizar: boolean) {
    this.cerrar.emit(actualizar);
  }
}
