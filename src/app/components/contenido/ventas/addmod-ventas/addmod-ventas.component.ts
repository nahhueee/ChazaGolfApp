
import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { FORMS_IMPORTS } from '../../../../imports/forms.import';
import { AccordionModule } from 'primeng/accordion';
import { Table, TableModule } from 'primeng/table';
import { DatePickerModule } from 'primeng/datepicker';
import { AbstractControl, FormArray, FormControl, FormGroup, Validators } from '@angular/forms';
import { Cliente } from '../../../../models/Cliente';
import { ClientesService } from '../../../../services/clientes.service';
import { ColorDisponible, LineasTalle, Producto, ProductoBusqueda } from '../../../../models/Producto';
import { ProductosService } from '../../../../services/productos.service';
import { MiscService } from '../../../../services/misc.service';
import { BadgeModule } from 'primeng/badge';
import { OverlayBadgeModule } from 'primeng/overlaybadge';
import { PagosFactura, ProductosFactura, ServiciosFactura, Venta } from '../../../../models/Factura';
import { ConfirmPopupModule } from 'primeng/confirmpopup';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService, MenuItem } from 'primeng/api';
import { NotificacionesService } from '../../../../services/notificaciones.service';
import { Servicio } from '../../../../models/Servicio';
import { GlobalesService } from '../../../../services/globales.service';
import { SplitButtonModule } from 'primeng/splitbutton';
import { Dialog } from 'primeng/dialog';
import { DividerModule } from 'primeng/divider';
import { AddModClientesComponent } from '../../clientes/addmod-clientes/addmod-clientes.component';
import { VentasService } from '../../../../services/ventas.service';
import { ActivatedRoute, Router } from '@angular/router';
import { TipoComprobante } from '../../../../models/TipoComprobante';
import { MetodoPago } from '../../../../models/MetodoPago';
import { ProcesoVenta } from '../../../../models/ProcesoVenta';
import { ObjFacturar } from '../../../../models/ObjFacturar';
import { FacturarVentaComponent } from '../facturar-venta/facturar-venta.component';
import { FacturaVenta } from '../../../../models/FacturaVenta';
import { TagModule } from 'primeng/tag';
import { ServiciosService } from '../../../../services/servicios.service';
import { PuntoVenta } from '../../../../models/PuntoVenta';
import { TipoDescuento } from '../../../../models/TipoDescuento';
import { TooltipModule } from 'primeng/tooltip';
import { ProductoPresupuesto } from '../../../../models/ProductoPresupuesto';
import { VistaPreviaComponent } from '../vista-previa/vista-previa.component';
import { Empresa } from '../../../../models/Empresa';
import { combineLatest, firstValueFrom, forkJoin, of, Subject, switchMap, take, takeUntil } from 'rxjs';
import { CuentasCorrientesService } from '../../../../services/cuentas-corriente.service';
import { UsuariosService } from '../../../../services/usuarios.service';
import { CheckboxModule } from 'primeng/checkbox';

import {
  METODO_PAGO,
  TIPO_COMPROBANTE,
  CONDICION_IVA,
  CATEGORIA_CLIENTE,
  CONDICION_EMPRESA,
  COMPROBANTE_POR_CONDICION_IVA,
  ESTADO_VENTA,
  ID_PROCESO,
  estadoVenta,
  EstadoVenta,
  LISTA_PRECIO,
  CondicionIva,
  TIPO_RELACIONADO,
  ESTADO_FACTURA,
  ID_CONDICION_PAGO,
  MAX_TALLES,
  TIPO_METODO_PAGO,
  TALLES_ESTANDAR,
} from '../models/venta.constants';
import { calcularPrecioCliente } from '../services/precio-cliente.utils';
import { DialogChequeComponent, DatosCheque } from '../dialog-cheque/dialog-cheque.component';
import { TotalesVenta } from '../models/venta.types';

interface SubtotalAcumulado {
  total:    number;
  descuento: number;
}

@Component({
  selector: 'app-addmod-ventas',
  standalone: true,
  imports: [
    ...FORMS_IMPORTS,
    AccordionModule,
    DatePickerModule,
    TableModule,
    BadgeModule,
    OverlayBadgeModule,
    ConfirmPopupModule,
    SplitButtonModule,
    Dialog,
    TagModule,
    DividerModule,
    AddModClientesComponent,
    FacturarVentaComponent,
    TooltipModule,
    ConfirmDialogModule,
    VistaPreviaComponent,
    CheckboxModule,
    DialogChequeComponent,
  ],
  providers: [ConfirmationService],
  templateUrl: './addmod-ventas.component.html',
  styleUrl: './addmod-ventas.component.scss',
})
export class AddModVentasComponent {
  sesion:any;

  tipo: 'factura' | 'pre' = 'factura';
  icono: string = "pi pi-plus-circle";
  titulo: string = "";
  proximoNroVenta:number = 0;
  nroRelacionado:number = 0;
  tipoRelacionado:string = "";
  talles = TALLES_ESTANDAR;

  decimal_mask: any;
  modificando:boolean;

  saldoAFavor:number = 0;
  saldoAplicado:number = 0;
  aplicaSaldoAFavor:boolean = false;

  venta:Venta = new Venta();
  totales: TotalesVenta = this.totalesVacios();

  vistaPreviaVisible:boolean = false;
  modalClienteVisible:boolean = false;
  modalAddClienteVisible:boolean = false;
  modalFacturarVisible:boolean = false;

  
  //PANTALLA 1
  formGenerales:FormGroup;
  procesos:ProcesoVenta[] = [];
  puntos:PuntoVenta[] = [];

  clienteSeleccionado:Cliente | undefined;
  clientes:Cliente[]=[];
  clientesFiltrados:Cliente[]=[];
  ventasCliente:Venta[]=[];

  //PANTALLA 2
  formProductos:FormGroup;
  productosFiltrados:ProductoBusqueda[]=[];
  resultadoBusqueda:Producto[]=[];
  variantesDisponibles:Producto[]=[];
  coloresDisponibles: ColorDisponible[] = [];

  productoSeleccionado:Producto = new Producto();
  tallesBase: string[] = Array(MAX_TALLES).fill("X");
  tallesProducto:string[] = [];

  productosFactura:ProductosFactura[]=[];
  lineasTalles: LineasTalle[] = [];

  productosPreFiltrados:ProductoPresupuesto[]=[];

  //PANTALLA 3
  formServicios:FormGroup;
  servicios:Servicio[]=[];
  serviciosFiltrado:Servicio[]=[];
  serviciosFactura:ServiciosFactura[]=[];

  //PANTALLA 4
  formFacturacion:FormGroup;
  formPagos:FormGroup;
  pagosFactura:PagosFactura[]=[];
  redondeo:FormControl = new FormControl('');
  empresas:Empresa[]=[];
  tiposDescuento:TipoDescuento[]=[];
  comprobantes:TipoComprobante[]=[];
  metodosPago: MetodoPago[] = [];
  metodosPagoOriginal: MetodoPago[] = [];

  // Dialog cheque
  dialogChequeVisible: boolean = false;
  dialogChequeImporte: number = 0;
  dialogChequeDatos: any = null;
  private _pagoAgregarPendiente: PagosFactura | null = null;
  private _editarChequeIndex: number = -1;
  private _pendingIdProceso: number | null = null;

  objFacturar:ObjFacturar = new ObjFacturar();

  @ViewChild('inputCodigo') inputCodigo: ElementRef<HTMLInputElement>; //Para usar el input de codigo
  @ViewChild('tablaProductos') tablaProductos: Table | undefined;
  private destroy$ = new Subject<void>();

  constructor(
    private router:Router,
    private clientesService:ClientesService,
    private productosService:ProductosService,
    private miscService:MiscService,
    private confirmationService: ConfirmationService,
    private Notificaciones: NotificacionesService,
    private globalesService:GlobalesService,
    private ventasService:VentasService,
    private rutaActiva:ActivatedRoute,
    private serviciosService:ServiciosService,
    private cuentasService:CuentasCorrientesService,
    private usuariosService:UsuariosService
  ){
    this.ArmarFormularios();
  }

  //#region CICLO DE VIDA
  // ngOnInit(): void {
  //   this.sesion = this.usuariosService.GetSesion().data;

  //   this.rutaActiva.queryParams
  //   .pipe(takeUntil(this.destroy$)) 
  //   .subscribe(params => {
  //     this.tipo = params['tipo'] ?? 'factura';

  //     this.ReiniciarTodo();
  //     setTimeout(() => {
  //       this.ObtenerProcesosVenta();
  //     },10);
  //   });
  
  // }

  // ngAfterViewInit(): void {
  //   // Configurar redondeo 
  //   this.redondeo.valueChanges
  //     .pipe(takeUntil(this.destroy$))
  //     .subscribe(() => this.CalcularTotalGeneral());

  //   // Cargar todos los datos maestros en paralelo,
  //   // luego resolver si es edición o creación nueva
  //   this.cargarDatosMaestros()
  //   .pipe(
  //     take(1),
  //     takeUntil(this.destroy$)
  //   )
  //   .subscribe(datos => {
  //     this.poblarDatosMaestros(datos);
  //   });

  //   // Reacción a cambios de ruta — continua durante toda la vida del componente
  // this.rutaActiva.paramMap
  //   .pipe(takeUntil(this.destroy$))
  //   .subscribe(params => {
  //     const id = Number(params.get('id'));

  //     if (id && id !== 0) {
  //       this.modificando = true;
  //       this.ObtenerVenta(id);
  //     } else {
  //       this.ReiniciarTodo();
  //       this.ObtenerProcesosVenta();
  //     }
  //   });
  // }


  ngOnInit(): void {
    this.sesion = this.usuariosService.GetSesion().data;
  }

  ngAfterViewInit(): void {
    // Configurar redondeo
    this.redondeo.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.CalcularTotalGeneral());

    combineLatest([
      this.rutaActiva.paramMap,
      this.rutaActiva.queryParams
    ])
    .pipe(
      takeUntil(this.destroy$),

      switchMap(([params, query]) => {

        const id = Number(params.get('id'));
        const tipo = query['tipo'] ?? 'factura';

        this.tipo = tipo;

        this.ReiniciarTodo();

        return forkJoin({
          maestros: this.cargarDatosMaestros(),
          procesos: this.miscService.ObtenerProcesosVenta(tipo),
          venta: id > 0
            ? this.ventasService.ObtenerVenta(id)
            : of(null)
        });
      })
    )
    .subscribe({
      next: ({ maestros, procesos, venta }) => {

        // Datos maestros
        this.poblarDatosMaestros(maestros);

        // Procesos
        this.procesos = procesos;

        if (venta) {

          this.modificando = true;
          this.venta = venta;

          this.CompletarCampos();

        } else {

          this.modificando = false;

          if (this.procesos.length > 1) {
            this.formGenerales
              .get('proceso')
              ?.setValue(this.procesos[1]);
          }
        }
      },
      error: err => {
        console.error(err);
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  ArmarFormularios(){
    this.formGenerales = new FormGroup({
      proceso: new FormControl('', [Validators.required]),
      punto: new FormControl('', [Validators.required]),
      nroNota: new FormControl({ value: '', disabled: true }),
      fecha: new FormControl(new Date(), [Validators.required]),
      cliente: new FormControl([null], [Validators.required]),
      lista: new FormControl(''),
    });

    this.formProductos = new FormGroup({
      codigoBarras: new FormControl(''),
      producto: new FormControl([null]),
      descuento: new FormControl(''),
      colorSeleccionado: new FormControl([null]),

      //Solo para presupuestos
      precio: new FormControl(''),
      cantidad: new FormControl(''),
    });

    this.formServicios = new FormGroup({
      servicio: new FormControl([null]),
      cantidad: new FormControl(''),
      precio: new FormControl(''),
    });

    this.formFacturacion = new FormGroup({
      empresa: new FormControl('', [Validators.required]),
      tComprobante: new FormControl('', [Validators.required]),
      tDescuento: new FormControl(1),
      descuento: new FormControl('', [Validators.min(0), Validators.max(100)]),
      codPromo: new FormControl(''),
      ajuste: new FormControl('false')
    });

    this.formPagos = new FormGroup({
      metodo: new FormControl('', [Validators.required]),
      monto: new FormControl('', [Validators.min(0)])
    });
  }
  //#endregion

  //#region GETTERS
    get TipoDescuentoControl(){return this.formFacturacion.get('tDescuento')?.value;}
    get DescuentoControl(){return this.formFacturacion.get('descuento')?.value;}
    get ServicioControl(){return this.formServicios.get('servicio')?.value ?? '';}
    get ProcesoControl(){return this.formGenerales.get('proceso')?.value;}
    get PuntoControl(){return this.formGenerales.get('punto')?.value;}
    get ProductoControl(){return this.formProductos.get('producto')?.value ?? '';}
    get TipoComprobanteControl(){return this.formFacturacion.get('tComprobante')?.value ?? '';}
    get EmpresaControl(){return this.formFacturacion.get('empresa')?.value ?? '';}
    get esPresupuesto(): boolean {return this.ProcesoControl?.id === ID_PROCESO.PRESUPUESTO;}

    get pagoCompleto(): boolean {
    if(this.pagosFactura.length > 0){
      const totalPagos = this.pagosFactura
      .reduce(
        (acc, p) => acc + (p.monto || 0),
        0
      );
      return totalPagos >= this.totales.aPagar;
    }

    return false;
  }

  get getSaldoPendiente(): number {
    if(this.pagosFactura.length > 0){
      const totalPagos = this.pagosFactura
      .filter(p => p.idMetodo !== METODO_PAGO.CUENTA_CORRIENTE)
      .reduce(
        (acc, p) => acc + (p.monto || 0),
        0
      );
      return Math.max(this.totales.aPagar - totalPagos, 0);
    }
    
    return this.totales.aPagar;
  }

  get montoRestante(): number {
    const entregado = this.pagosFactura
      ?.reduce((acc, item) => acc + (item.monto || 0), 0) || 0;

    return Math.max(this.totales.aPagar - entregado, 0);
  }
  //#endregion
  
  //#region INICIALIZACION
  private cargarDatosMaestros() {
    return forkJoin({
      empresas:       this.miscService.ObtenerEmpresas(),
      puntos:         this.miscService.ObtenerPuntosVenta(),
      clientes:       this.clientesService.SelectorClientes(),
      lineasTalle:    this.miscService.ObtenerLineasTalle(true),
      servicios:      this.serviciosService.Selector(),
      tiposDescuento: this.miscService.ObtenerTiposDescuento(),
    });
  }

  private poblarDatosMaestros(datos: {
    empresas:       Empresa[];
    puntos:         PuntoVenta[];
    clientes:       Cliente[];
    lineasTalle:    LineasTalle[];
    servicios:      Servicio[];
    tiposDescuento: TipoDescuento[];
  }): void {
    this.empresas = datos.empresas;
    this.puntos   = datos.puntos;
    this.clientes = datos.clientes;
    this.servicios = datos.servicios;
    this.lineasTalles = datos.lineasTalle;
    this.tiposDescuento = datos.tiposDescuento;
    
    // Cargar métodos de pago de la empresa por defecto
    this.ObtenerMetodosPago(this.empresas[0]?.id!);

    // Máscara decimal
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

    // Valores por defecto de formulario 
    setTimeout(() => {
      this.formFacturacion.get('empresa')?.setValue(this.empresas[0]?.id);
      this.formPagos.get('metodo')?.setValue(this.metodosPago[0]);
      this.formFacturacion.get('tDescuento')?.setValue(1);
      this.formGenerales.get('punto')?.setValue(this.puntos[0]);
    });
  }

  ReiniciarTodo() {
    if(this.tipo == "factura"){
      this.titulo = "Nueva Facturación";
    }else{
      this.titulo = "Nueva PreFacturación"
    }

    this.modificando = false;
    this._pendingIdProceso = null;
    this.venta = new Venta();
    this.venta.id = 0;

    this.redondeo.setValue('');
    this.totales = this.totalesVacios();
    this.productosFactura = [];
    this.serviciosFactura = [];
    this.pagosFactura = [];
    this.clienteSeleccionado = undefined;

    this.ArmarFormularios();
    this.CalcularTotalGeneral();
  }
  //#endregion

  //#region UI
  SelectContent(event: FocusEvent) {
    const input = event.target as HTMLInputElement;
    input.select();
  }

  GetSeverity(estado: string): 'info' | 'warn' | 'success' {
    if (!estado) return 'info';
    const e = estado as EstadoVenta; 

    if (estadoVenta.esFacturado(e))  return 'success';
    if (estadoVenta.esAsociado(e))   return 'warn';
    if (estadoVenta.esPendiente(e))  return 'warn';

    return 'info';
  }
  
  ObtenerToolTip(idProceso: number): string {
    const procesoActual = this.ProcesoControl.id;

    if (
      idProceso === ID_PROCESO.PRESUPUESTO &&
      [ID_PROCESO.PEDIDO, ID_PROCESO.NOTA_EMPAQUE].includes(procesoActual)
    ) {
      return 'Click para Relacionar';
    }

    if (
      idProceso === ID_PROCESO.PEDIDO &&
      [ID_PROCESO.FACTURA, ID_PROCESO.COTIZACION, ID_PROCESO.NOTA_CREDITO].includes(procesoActual)
    ) {
      return 'Click para Facturar';
    }

    if (idProceso === procesoActual) {
      return 'Click para Editar';
    }

    return '';
  }

  EliminarItem(event: Event, lista: 'productos' | 'servicios' | 'pagos', indice: number): void {
    const mapaListas = {
      productos: this.productosFactura,
      servicios: this.serviciosFactura,
      pagos:     this.pagosFactura,
    };

    this.confirmationService.confirm({
      target: event.target as EventTarget,
      message: '¿Borrar el registro?',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Sí',
      rejectLabel: 'No',
      rejectButtonProps: {
        severity: 'secondary',
        outlined: true,
      },
      accept: () => {
        mapaListas[lista].splice(indice, 1);

        if (lista !== 'pagos') {
          this.CalcularTotalGeneral();
        }

        this.Notificaciones.Success("Registro eliminado correctamente");
      },
    });
  }
  //#endregion

  //#region OBTENER SELECCIONABLES Y MISC
  ObtenerProcesosVenta(){
    this.miscService.ObtenerProcesosVenta(this.tipo)
      .pipe(takeUntil(this.destroy$)) 
      .subscribe(response => {
        this.procesos = response;
        this.formGenerales.get('proceso')?.setValue(this.procesos[1]);
        console.log(this.procesos);
      });
  }
  ObtenerClientes(): void {
    this.clientesService.SelectorClientes()
      .pipe(takeUntil(this.destroy$))
      .subscribe(response => {
        this.clientes = response;
      });
  }

  ObtenerMetodosPago(idEmpresa: number): void {
    this.miscService.ObtenerMetodosPago(idEmpresa)
      .pipe(takeUntil(this.destroy$))
      .subscribe(response => {
        this.metodosPago         = response;
        this.metodosPagoOriginal = [...response];
        this.formPagos.get('metodo')?.setValue(this.metodosPago[0]);
      });
  }
  //#endregion  

  //#region TOTALES

  //Reinicia los valores de totalesVenta
  private totalesVacios(): TotalesVenta {
    return {
      items: 0,
      descuento: 0,
      subtotal: 0,
      iva: 0,
      general: 0,
      ajusteTransferencia: 0,
      aPagar: 0,
      cantItems: 0,
      mostrarIva: false,
    };
  }

  //Aplica descuentoAplicado a cada ítem según su tope individual.
  private aplicarDescuentoAItems(): void {
    const descuentoUsuario = parseFloat(this.DescuentoControl) || 0;
    [...this.productosFactura, ...this.serviciosFactura].forEach(item => {
      item.descuentoAplicado = Math.min(descuentoUsuario, item.topeDescuento ?? 100);
    });
  }

  //Calcula todos los totales de la venta a partir del estado actual.
  private recalcularTotales(): TotalesVenta {
    const descuentoUsuario = parseFloat(this.DescuentoControl) || 0;

    const calcularSubtotales = (
    items: { total?: number; topeDescuento?: number }[]
    ): SubtotalAcumulado =>
      (items ?? []).reduce<SubtotalAcumulado>(   
        (acc, item) => {
          const totalItem    = item.total || 0;
          const descAplicado = Math.min(descuentoUsuario, item.topeDescuento ?? 100);
          return {
            total:    acc.total    + totalItem,
            descuento: acc.descuento + (totalItem * descAplicado) / 100,
          };
        },
        { total: 0, descuento: 0 } 
      );

    const productos = calcularSubtotales(this.productosFactura);
    const servicios  = calcularSubtotales(this.serviciosFactura);

    const items = productos.total + servicios.total;
    const descuento = productos.descuento + servicios.descuento;
    const base = items - descuento;

    const ajusteTransferencia =
      this.formFacturacion.get('ajuste')?.value === true ? base * 0.10 : 0;

    // IVA aplica solo cuando hay un comprobante fiscal real (A o B).
    // No depende de ProcesoControl porque ese valor puede estar stale
    // cuando valueChanges dispara antes que CambioTipoComprobante() del template.
    const esFacturaConIva =
      this.tipo === 'factura' &&
      this.productosFactura.length > 0 &&
      this.TipoComprobanteControl !== TIPO_COMPROBANTE.SIN_COMPROBANTE;

    // Nota: usamos variable local para no depender del orden de evaluación
    const tipoComprobante = this.TipoComprobanteControl;

    let subtotal   = base;
    let iva        = 0;
    let general    = base;
    let mostrarIva = false;

    if (esFacturaConIva) {
      if (tipoComprobante === TIPO_COMPROBANTE.FACTURA_A) {
        // Precios incluyen IVA → discriminar el IVA contenido (igual que B)
        iva        = base * 21 / 121;
        subtotal   = base - iva;
        general    = base;
        mostrarIva = true;

      } else if (tipoComprobante === TIPO_COMPROBANTE.FACTURA_B) {
        // Precio con IVA incluido → se desglosa
        iva        = base * 21 / 121;
        subtotal   = base - iva;
        general    = base;
        mostrarIva = true;
      }
      // FACTURA_C y SIN_COMPROBANTE: sin IVA, subtotal = base, general = base
    }

    const redondeoVal = this.globalesService.EstandarizarDecimal(this.redondeo.value);
    const aPagar      = general + ajusteTransferencia + redondeoVal;

    const cantItems =
      (this.productosFactura ?? []).reduce((a, i) => a + (i.cantidad || 0), 0) +
      (this.serviciosFactura  ?? []).reduce((a, i) => a + (i.cantidad || 0), 0);

    return { items, descuento, subtotal, iva, general, ajusteTransferencia, aPagar, cantItems, mostrarIva };
  }

  CalcularTotalGeneral() {
    this.aplicarDescuentoAItems();
    this.totales = this.recalcularTotales();
  }
  //#endregion

  //#region EVENTOS DE CAMBIO
  CambioEmpresa(){
    const idEmpresa = this.formFacturacion.get('empresa')?.value;

    const condicion = this.clienteSeleccionado?.idCondicionIva ?? CONDICION_IVA.SIN_CLIENTE;

    // esCotizacion:false → re-evalúa empresa+cliente sin heredar el proceso previo
    this.PrepararFacturacionCliente(condicion, undefined, false);
    this.ObtenerMetodosPago(idEmpresa);
    // Cálculo inmediato (estado actual mientras la HTTP resuelve);
    // PrepararFacturacionCliente recalcula de nuevo al terminar con el comprobante correcto
    this.CalcularTotalGeneral();
  }

  CambioTipoComprobante(){
    if (
      !this.modificando &&
      this.clienteSeleccionado?.idCondicionIva == CONDICION_IVA.RESPONSABLE_INSCRIPTO &&
      this.productosFactura.length > 0
    ) {
      if (!this.esPresupuesto) {
        this.productosFactura.forEach(element => {
          element.unitario = calcularPrecioCliente(element.precio!, this.clienteSeleccionado?.idListaPrecio!);
          element.total = element.unitario! * element.cantidad!;
        });
      }
    }

    if(this.TipoComprobanteControl == TIPO_COMPROBANTE.SIN_COMPROBANTE){
      this.formGenerales.get('proceso')?.setValue(this.procesos[0]);
    }else{
      this.formGenerales.get('proceso')?.setValue(this.procesos[1]);
    }
    this.CalcularTotalGeneral();
  }
  //#endregion

  //#region CLIENTES
  FiltrarClientes(event: any) {
    const query = event.query.toLowerCase();
    this.clientesFiltrados = this.clientes.filter(c => {
      const nombre = (c.nombre ?? '').toLowerCase();
      const dni = (c.documento ?? '').toString();
      const razon = (c.razonSocial ?? '').toLowerCase();
      return nombre.includes(query) || dni.includes(query) || razon.includes(query);
    });
  }

  ObtenerSaldoCliente(){
    this.cuentasService.ObtenerSaldoTotalCliente(this.clienteSeleccionado!.id)
      .pipe(takeUntil(this.destroy$)) 
      .subscribe(response => {
        this.saldoAFavor = response * -1;
        this.aplicaSaldoAFavor = false;

        this.metodosPago = this.saldoAFavor > 0
        ? [...this.metodosPagoOriginal]
        : this.metodosPagoOriginal.filter(m => m.id !== METODO_PAGO.SALDO_A_FAVOR);
      });
  }

  SeleccionarCliente(comprobante?:number){
    const seleccionado = this.formGenerales.get('cliente')?.value;
    this.clientesService.ObtenerCliente(seleccionado.id)
        .pipe(takeUntil(this.destroy$)) 
        .subscribe(response => {
          this.clienteSeleccionado = response;
          if(this.clienteSeleccionado?.idListaPrecio == LISTA_PRECIO.CONSUMIDOR_FINAL) this.formFacturacion.get('ajuste')?.setValue(false);
          this.PrepararFacturacionCliente(this.clienteSeleccionado?.idCondicionIva!, comprobante);
          this.ObtenerSaldoCliente();
          
          //Obtenemos sus ventas relacionadas
          let nroVenta = this.modificando ? this.venta.id : 0;
          this.ventasService.ObtenerVentasCliente(this.clienteSeleccionado?.id!, nroVenta!)
          .pipe(takeUntil(this.destroy$)) 
          .subscribe(response => {
            this.ventasCliente = response;
            console.log("Ventas del cliente: ", this.ventasCliente);
          });
          
          if(!this.modificando){
            if(this.productosFactura.length > 0 && !this.esPresupuesto){
              this.productosFactura.forEach(element => {
                element.unitario = calcularPrecioCliente(element.precio!, this.clienteSeleccionado?.idListaPrecio!);
                element.total = element.unitario! * element.cantidad!;
              });
            }
            this.CalcularTotalGeneral();
          }

        });
  }

  PrepararFacturacionCliente(
    condIvaCliente: number, 
    comprobanteExistente?: number,
    esCotizacion: boolean = this.ProcesoControl?.id === ID_PROCESO.COTIZACION
  ) 
  {
    let seleccionada = this.empresas.find(e => e.id == this.formFacturacion.get('empresa')?.value);
    if(!seleccionada){
      seleccionada = this.empresas[0];
      this.formFacturacion.get('empresa')?.setValue(seleccionada.id);
    } 

    this.miscService.ObtenerComprobantes(seleccionada.abrevCondicion!, condIvaCliente)
      .pipe(takeUntil(this.destroy$)) 
      .subscribe(response => {
        this.comprobantes = response;

      if (!esCotizacion) {
        const comprobanteFinal = comprobanteExistente
          ?? COMPROBANTE_POR_CONDICION_IVA[condIvaCliente as CondicionIva];

        this.formFacturacion.get('tComprobante')?.setValue(comprobanteFinal);

        if (!this.modificando && this.productosFactura.length > 0 && !this.esPresupuesto) {
          this.productosFactura.forEach(element => {
            element.unitario = calcularPrecioCliente(element.precio!, this.clienteSeleccionado!.idListaPrecio!);
            element.total    = element.unitario! * element.cantidad!;
          });
        }

        if (seleccionada?.abrevCondicion === CONDICION_EMPRESA.RESPONSABLE_INSCRIPTO) {
          if (condIvaCliente === CONDICION_IVA.RESPONSABLE_INSCRIPTO) {
            this.formFacturacion.get('tComprobante')?.setValue(TIPO_COMPROBANTE.FACTURA_A);
          } else if (condIvaCliente === CONDICION_IVA.CONSUMIDOR_FINAL) {
            this.formFacturacion.get('tComprobante')?.setValue(TIPO_COMPROBANTE.FACTURA_B);
          }
        }

        if (seleccionada?.abrevCondicion === CONDICION_EMPRESA.MONOTRIBUTO) {
          this.formFacturacion.get('tComprobante')?.setValue(TIPO_COMPROBANTE.FACTURA_C);
        }

      } else {
        // Es cotización → siempre sin comprobante fiscal
        this.formFacturacion.get('tComprobante')?.setValue(TIPO_COMPROBANTE.SIN_COMPROBANTE);
      }

      // Recalcular siempre al final: cubre cambio de empresa, de cliente
      // y cualquier otro caller asíncrono de este método
      this.CalcularTotalGeneral();
    });
  }
  //#endregion

  //#region PROCESOS RELACIONADOS
  ObtenerVenta(idVenta){
    this.ventasService.ObtenerVenta(idVenta)
      .pipe(takeUntil(this.destroy$)) 
      .subscribe(response => {
        this.venta = response;
        this.CompletarCampos();
      });
  }

  CompletarCampos(){
    this.formGenerales.get('proceso')?.setValue(this.procesos.find(p => p.id == this.venta.idProceso));
    this.formGenerales.get('punto')?.setValue(this.puntos.find(p => p.id == this.venta.idPunto));
    this.formGenerales.get('fecha')?.setValue(new Date(this.venta.fecha ?? ''));
    this.formFacturacion.get('empresa')?.setValue(this.venta.idEmpresa);
    this.formFacturacion.get('tDescuento')?.setValue(this.venta.idTipoDescuento);
    this.formFacturacion.get('descuento')?.setValue(this.venta.descuento);
    this.formFacturacion.get('codPromo')?.setValue(this.venta.codPromocion);
    this.formFacturacion.get('ajuste')?.setValue(this.venta.ajuste == 1 ? true : false);
    this.redondeo.setValue(this.venta.redondeo?.toLocaleString('es-AR'));

    this.nroRelacionado = this.venta.nroRelacionado!;
    this.tipoRelacionado = this.venta.tipoRelacionado!;

    if(this.tipoRelacionado == TIPO_RELACIONADO.NOTA_EMPAQUE)
      this.formGenerales.get('nroNota')?.setValue(this.nroRelacionado);

    this.formGenerales.get('cliente')?.setValue(this.venta.cliente);

    if(this.venta.productos) this.productosFactura = this.venta.productos;
    if(this.venta.servicios) this.serviciosFactura = this.venta.servicios;
    if(this.venta.pagos) this.pagosFactura = this.venta.pagos;

    this.ObtenerMetodosPago(this.venta.idEmpresa!);
    this.SeleccionarCliente(this.venta.idTipoComprobante);

    this.titulo = "Editar " + this.ProcesoControl.descripcion + " Nro: " + this.venta.nroProceso;
    this.CalcularTotalGeneral();
  }

  SetearTitulo(){
    if(this.venta.id == 0) this.formFacturacion.get('empresa')?.setValue(this.empresas[0].id);
    
    const esCotizacion = this.ProcesoControl?.id === ID_PROCESO.COTIZACION;
    this.PrepararFacturacionCliente(
      this.clienteSeleccionado?.idCondicionIva ?? CONDICION_IVA.SIN_CLIENTE,
      undefined,
      esCotizacion  
    );

    this.ventasService.ObtenerProximoNroProceso(this.ProcesoControl.id)
    .pipe(takeUntil(this.destroy$)) 
    .subscribe(response => {
      this.proximoNroVenta = response;

      if(this.venta.id == 0){
        let antelacion = this.ProcesoControl.id === ID_PROCESO.PRESUPUESTO || this.ProcesoControl.id === ID_PROCESO.PEDIDO ? "Nuevo " : "Nueva ";
        this.titulo = antelacion + this.ProcesoControl.descripcion + " Nro: " + this.proximoNroVenta;
      }
    });
  }

  BuscarNotaEmpaque(){
    const nroNota = this.formGenerales.get('nroNota')?.value;
    if(nroNota == "" || nroNota == 0) return;

    this.ventasService.VerificarNroNota(nroNota)
      .pipe(takeUntil(this.destroy$)) 
      .subscribe(response => {
        if(response == null){
          this.Notificaciones.Warn("No se encontraron notas de empaque con este número.")
        }else{
          this.confirmationService.confirm({
            key: 'cerrarDialog',
            message: 'Se encontró una nota de empaque.<br> ¿Estas seguro de pasar a facturar el proceso nro ' + nroNota + "?",
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
              this.venta = response;
              this.nroRelacionado = response.nroProceso!;
              this.tipoRelacionado = TIPO_RELACIONADO.NOTA_EMPAQUE;

              if(this.venta.productos) this.productosFactura = this.venta.productos;
              if(this.venta.servicios) this.serviciosFactura = this.venta.servicios;
              this.formFacturacion.get('descuento')?.setValue(0);
              this.formFacturacion.get('tDescuento')?.setValue(this.tiposDescuento[0].id);
              this.CalcularTotalGeneral();

              this.Notificaciones.Success("Nota de empaque cargada correctamente.")
            },
            reject: () => {},
          });
        }
      });
  }

  RelacionarActualizarProceso(venta:Venta){
    if(venta.nroProceso == this.nroRelacionado) return;

    this.nroRelacionado = venta.nroProceso!;

    if (venta.idProceso === this.ProcesoControl.id) {
      this.confirmationService.confirm({
        key: 'cerrarDialog',
        message: '¿Estas seguro de pasar a editar el nro de proceso ' + venta.nroProceso + "?",
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
          this.venta = venta;
          this.CompletarCampos();
          this.modificando = true;
          this.Notificaciones.Info("Proceso cargado correctamente para edición.");
        },
        reject: () => {},
      });
      return;
    }

    if(venta.idProceso == ID_PROCESO.PRESUPUESTO){
      this.Notificaciones.Info("Se relacionará con el presupuesto Nro: " + venta.nroProceso);
      this.tipoRelacionado = TIPO_RELACIONADO.PRESUPUESTO;
    }

    if(venta.idProceso == ID_PROCESO.PEDIDO){
      this.tipoRelacionado = TIPO_RELACIONADO.PEDIDO;
      this.ConfirmarFacturacionRelacionado(venta);
      return;
    }

    if(venta.idProceso == ID_PROCESO.NOTA_EMPAQUE){
      this.tipoRelacionado = TIPO_RELACIONADO.NOTA_EMPAQUE;
      this.ConfirmarFacturacionRelacionado(venta);
      return;
    }
  }

  ConfirmarFacturacionRelacionado(venta:Venta){
    this.confirmationService.confirm({
      key: 'cerrarDialog',
      message: '¿Estas seguro de pasar a facturar el proceso nro ' + venta.nroProceso + "?",
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
        this.venta = venta;
        if(this.venta.productos) this.productosFactura = this.venta.productos;
        if(this.venta.servicios) this.serviciosFactura = this.venta.servicios;
        this.formGenerales.get('punto')?.setValue(this.puntos.find(p => p.id == this.venta.idPunto));
        this.formFacturacion.get('descuento')?.setValue(0);
        this.formFacturacion.get('tDescuento')?.setValue(this.tiposDescuento[0].id);
        this.CalcularTotalGeneral();

        if(venta.idProceso == ID_PROCESO.PEDIDO){
          this.Notificaciones.Info("Se facturará el pedido Nro: " + venta.nroProceso);
        }
        if(venta.idProceso == ID_PROCESO.NOTA_EMPAQUE){
          this.formGenerales.get('nroNota')?.setValue(venta.nroProceso);
          this.Notificaciones.Info("Se relacionará con la nota de empaque Nro: " + venta.nroProceso);
        }

      },
      reject: () => {},
    });
  }


  Actualizar(valor:boolean){
    if(valor)
      this.ObtenerClientes();

    this.modalAddClienteVisible = false;
  }
  //#endregion

  //#region PRODUCTOS
  FiltrarProductos(event: any) {
    const query = event.query.toLowerCase();
    if(query.length == 0){
      this.productosFiltrados = [];
      this.productoSeleccionado = new Producto();
      return;
    }
    
    if(this.ProcesoControl.id === ID_PROCESO.PRESUPUESTO){
      this.productosService.BuscarProductosPresupuesto(query)
      .pipe(takeUntil(this.destroy$)) 
      .subscribe(response => {
        this.productosPreFiltrados = response;
      });
    }else{
      this.productosService.BuscarProductos(query)
      .pipe(takeUntil(this.destroy$))
      .subscribe(response => {
        this.resultadoBusqueda = response;
        this.productosFiltrados = this.AgruparProductos(this.resultadoBusqueda);
      });
    }
    
  }

  AgruparProductos(productos: Producto[]) {
      const mapa = new Map<string, { codigo: string, nombre: string }>();

      for (const p of productos) {
          const key = `${p.codigo}|${p.nombre}`;
          if (!mapa.has(key)) {
              mapa.set(key, {
                  codigo: p.codigo ?? "",
                  nombre: p.nombre ?? ""
              });
          }
      }

      return Array.from(mapa.values());
  }


  SeleccionarProducto(){
    const seleccionado = this.formProductos.get('producto')?.value;
    if(this.ProcesoControl.id === ID_PROCESO.PRESUPUESTO){
      this.productoSeleccionado = seleccionado;
      return;
    }

    this.variantesDisponibles = this.resultadoBusqueda.filter(p=> p.codigo == seleccionado.codigo)
    this.coloresDisponibles = this.variantesDisponibles.map(p => {
        const cd = new ColorDisponible();
        cd.idProducto = p.id;
        cd.color = p.color?.descripcion ?? 'Sin color';
        cd.hexa = p.color?.hexa ?? '#000000';
        return cd;
    })
    .sort((a, b) => a.color.localeCompare(b.color));

    if(this.coloresDisponibles.length == 1){
      this.productoSeleccionado = this.variantesDisponibles.find(v=>v.id === this.coloresDisponibles[0].idProducto)!;
      this.formProductos.get('colorSeleccionado')?.setValue(this.coloresDisponibles[0]);
      this.SeleccionarVariante(this.productoSeleccionado.id!)
    }
  }

  SeleccionarVariante(idProducto){
   
    this.productoSeleccionado = this.variantesDisponibles.find(v=>v.id === idProducto)!;
    let linea = this.lineasTalles.find(l => l.id === this.productoSeleccionado.talles![0].idLineaTalle);
    if(!linea) return;
    this.tallesProducto = linea.talles!;

    //Para nota de empaque buscamos la disponibilidad actual
    if(this.ProcesoControl.id === ID_PROCESO.NOTA_EMPAQUE){
      this.productosService.ObtenerStockDisponiblePorProducto(this.productoSeleccionado.id!.toString())
      .pipe(takeUntil(this.destroy$)) 
      .subscribe(response => {
        this.productoSeleccionado.talles = response;
      });
    }
  }

  ObtenerCantidad(talle: string, proceso:string) {
    if (!this.productoSeleccionado?.talles) return 0;

    const encontrado = this.productoSeleccionado.talles.find((t: any) => t.talle === talle);
    console.log("encontrado", encontrado);
    if(proceso=="stock")
      return encontrado ? encontrado.cantidad : 0;
    else if(proceso=="agregar")
      return encontrado && encontrado.cantAgregar! > 0 ? encontrado.cantAgregar : 0;
    else if(proceso=="disponible")
      return encontrado ? encontrado.disponible : 0;

    return 0;
  }

  DefinirCantidadAgregarTalle(talle:string){
    if (!this.productoSeleccionado?.talles) return 0;
    
    let encontrado = this.productoSeleccionado.talles.find((t: any) => t.talle === talle);
    if (encontrado) {
      if(encontrado && encontrado.cantidad == 0) return;
      if(encontrado && encontrado.cantAgregar! >= encontrado.cantidad!) return; //Si la cantidad a agregar es mayor o igual a lo disponible no agregamos

      encontrado.cantAgregar = (encontrado.cantAgregar || 0) + 1;
    }

    return;
  }

  async AgregarProducto() {
    if (this.tablaProductos) this.tablaProductos.editingCell = null;

    if(this.ProcesoControl.id === ID_PROCESO.PRESUPUESTO){
      if (!this.productoSeleccionado) return;
      if (estadoVenta.esAsociado(this.venta.estado as EstadoVenta)) {
        this.Notificaciones.Warn("No puedes editar un presupuesto en estado asociado.");
        return;
      }

      const cantidad = this.formProductos.get('cantidad')?.value != '' ? this.formProductos.get('cantidad')?.value : 1;
      const precio = this.globalesService.EstandarizarDecimal(this.formProductos.get('precio')?.value);
      const nuevo = new ProductosFactura({
        idProducto: this.productoSeleccionado.id,
        codProducto: this.productoSeleccionado.codigo,
        nomProducto: this.productoSeleccionado.nombre,
        cantidad: cantidad,
        unitario: precio,
        total: precio * cantidad,
      });

      if(nuevo.unitario === 0){
        nuevo.unitario = this.ProductoControl.sugerido;
        nuevo.total = nuevo.unitario! * nuevo.cantidad!;
      }

      this.productosFactura.push(nuevo);
    }
    else{
      if (estadoVenta.esFacturado(this.venta.estado as EstadoVenta)) {
        this.Notificaciones.Warn("No puedes editar una venta en estado facturada.");
        return;
      }
      
      const codigo = this.formProductos.get('codigoBarras')?.value ?? "";
      if (!codigo.trim() && !this.productoSeleccionado?.talles) return;

      let idTalle = 0;
      if(codigo != ""){
        const response = await firstValueFrom(this.productosService.ValidarCodigo(codigo));
        if(response){
          idTalle = parseInt(codigo.slice(6, 9));
          this.productoSeleccionado = response;
        }else{
          this.Notificaciones.Warn("No se encontraron productos con este código");
          this.inputCodigo.nativeElement.select();
          return
        }
      }
     

      let tallesSeleccionados:any[] = [];
      if(this.ProcesoControl.id == ID_PROCESO.PEDIDO){
        // Tomar todos los talles disponibles
        tallesSeleccionados = this.productoSeleccionado.talles!;
      }else{
        if(idTalle === 0){
          // Tomar solo los talles que el usuario seleccionó
          tallesSeleccionados = this.productoSeleccionado.talles!.filter((t: any) => t.cantAgregar > 0);
          if(tallesSeleccionados.length === 0) {
            this.Notificaciones.Warn("Asegurate de seleccionar al menos un talle.");
            return;
          }
        }else{
          // Tomar solo el talle seleccionado
          tallesSeleccionados.push(this.productoSeleccionado.talles!.find((t: any) => t.idTalle === idTalle));
          tallesSeleccionados[0].cantAgregar = 1;
        }
      }

      tallesSeleccionados.forEach((talleSel: any) => {
        const cantidad = talleSel.cantAgregar ?? 0;
        let precio = talleSel.precio;

        if(this.clienteSeleccionado){
          precio = calcularPrecioCliente(precio, this.clienteSeleccionado.idListaPrecio!);
        }
        
        // Ver si ya existe ese producto con ese precio en el detalle
        let existente = this.productosFactura.find(
          (p: ProductosFactura) =>
            p.idProducto === this.productoSeleccionado.id && p.unitario === precio
        );

        if (existente) {
          // Sumar cantidad y total
          existente.cantidad = (existente.cantidad ?? 0) + cantidad;
          existente.total = (existente.unitario ?? 0) * (existente.cantidad ?? 0);
          existente.totalMostrar = existente.total;

          // Asignar cantidad a tX
          this.AsignarTalle(existente, talleSel.talle, cantidad, talleSel.idLineaTalle);

          // Agregar el talle si no estaba ya en tallesSeleccionados
          const tallesExistentes = existente.tallesSeleccionados ? existente.tallesSeleccionados.split(",").map(t => t.trim()) : [];
          if (!tallesExistentes.includes(talleSel.talle)) {
            tallesExistentes.push(talleSel.talle);
            existente.tallesSeleccionados = tallesExistentes.join(", ");
          }
        } else {
          // Crear nueva línea de producto
          const nuevo = new ProductosFactura({
            idProducto: this.productoSeleccionado.id,
            codProducto: this.productoSeleccionado.codigo,
            nomProducto: this.productoSeleccionado.nombre,
            topeDescuento: this.productoSeleccionado.topeDescuento,
            talles: this.productoSeleccionado.talles,
            idColor: this.productoSeleccionado.color!.id,
            color: this.productoSeleccionado.color!.descripcion,
            hexa: this.productoSeleccionado.color!.hexa,
            idLineaTalle: talleSel.idLineaTalle,
            cantidad: cantidad,
            precio: talleSel.precio,
            unitario: precio,
            total: precio * cantidad,
            precioMostrar: precio,
            totalMostrar: precio * cantidad,
            tallesSeleccionados: talleSel.talle
          });

          // Asignar cantidad a tX
          this.AsignarTalle(nuevo, talleSel.talle, cantidad, talleSel.idLineaTalle);
          this.productosFactura.push(nuevo);

        }
      });
    }
    
    this.CalcularTotalGeneral();
    this.productoSeleccionado = new Producto();
    this.formProductos.reset();
    setTimeout(() => {
        if (this.tablaProductos) this.tablaProductos.editingCell = null;
        this.inputCodigo.nativeElement.focus();
    }, 0);
  }

  getPrecioMostrado(precioBase: number): number {
    return this.TipoComprobanteControl === TIPO_COMPROBANTE.FACTURA_B
      ? precioBase * 1.21
      : precioBase;
  }

  AsignarTalle(productoFactura: ProductosFactura, talle: string, cantidad: number, idLineaTalle: number) {
    const linea = this.lineasTalles.find(l => l.id === idLineaTalle);
    if (!linea) return;

    const index = linea.talles!.indexOf(talle);
    if (index === -1) return;

    const campo = `t${index + 1}` as keyof ProductosFactura;
    (productoFactura as any)[campo] = ((productoFactura as any)[campo] ?? 0) + cantidad;
  }

  ActualizarCantidad(producto: any, field: string, event: any) {
    const input = event.target as HTMLInputElement;
    const value = Number(input.value) || 0;

    const talleReal = this.ObtenerTalleDesdeField(producto, field);
    if (!talleReal) return;

    const talleEncontrado = producto.talles.find((t: any) => t.talle === talleReal);
    if (!talleEncontrado) {
      this.Notificaciones.Warn(
        `No está habilitado el talle ${talleReal} para el producto ${producto.nomProducto}.`
      );
      return;
    }

    if (talleEncontrado.precio !== producto.precio) {
      this.Notificaciones.Warn(
        'No coincide el precio del talle con el unitario del producto.'
      );
      return;
    }

    if (
      this.ProcesoControl.id !== ID_PROCESO.PEDIDO &&
      value > talleEncontrado.cantidad
    ) {
      this.Notificaciones.Warn(
        `La cantidad ingresada supera el stock disponible (${talleEncontrado.cantidad}) para el talle ${talleReal}.`
      );
      input.value = producto[field];
      return;
    }

    producto[field] = value;

    this.AgregarTalleSeleccionado(producto, talleReal);
    this.RecalcularProducto(producto);
  }

  private ObtenerTalleDesdeField(producto: any, field: string): string | null {
    if (producto[field] !== undefined) {
      return this.ObtenerTalleReal(field, producto);
    }

    const linea = this.lineasTalles.find(l => l.id === producto.idLineaTalle);
    if (!linea) return null;

    const index = parseInt(field.replace('t', '')) - 1;
    return linea.talles?.[index] ?? null;
  }

  private AgregarTalleSeleccionado(producto: any, talle: string) {
    const talles = producto.tallesSeleccionados
      ? producto.tallesSeleccionados.split(',').map((t: string) => t.trim())
      : [];

    if (!talles.includes(talle)) {
      talles.push(talle);
      producto.tallesSeleccionados = talles.join(', ');
    }
  }

  private RecalcularProducto(producto: any) {
    producto.cantidad = Array.from({ length: MAX_TALLES }, (_, i) => producto[`t${i + 1}`] || 0)
      .reduce((a, b) => a + b, 0);

    producto.total = producto.cantidad * producto.unitario;
    this.CalcularTotalGeneral();
  }


  ActualizarValoresPresupuesto(producto: any, event: any, tipo: 'cantidad' | 'precio') {
    const input = event.target as HTMLInputElement;
    const value = this.globalesService.EstandarizarDecimal(input.value);
    if(value <= 0) return;

    if(tipo === 'cantidad')
      producto.cantidad = value;

    if(tipo === 'precio')
      producto.unitario = value;

    producto.total = producto.cantidad * producto.unitario;
    this.CalcularTotalGeneral();
  }

  ObtenerTalleReal(tx: string, objeto: any): string | null {
    const talles = objeto.tallesSeleccionados.split(',').map(t => t.trim());
    const clavesConValor = Object.keys(objeto)
    .filter(k => /^t\d+$/.test(k) && objeto[k] != null && objeto[k] !== undefined)
    .sort((a,b) => Number(a.replace('t','')) - Number(b.replace('t','')));
    const index = clavesConValor.indexOf(tx);
    return talles[index] ?? null;
  }
  //#endregion

  //#region SERVICIOS VENTA
  FiltrarServicios(event: any) {
    const query = event.query.toLowerCase();
    this.serviciosFiltrado = this.servicios.filter(c => {
      const nombre = c.descripcion!.toLowerCase();
      const codigo = c.codigo!.toLowerCase();
      return nombre.includes(query) || codigo.includes(query);
    });
  }

  AgregarServicio() {
    if (estadoVenta.esFacturado(this.venta.estado as EstadoVenta)) {
      this.Notificaciones.Warn("No puedes editar una venta en estado facturada.");
      return;
    }
    if (estadoVenta.esAsociado(this.venta.estado as EstadoVenta) || this.venta.idProceso === ID_PROCESO.PRESUPUESTO) {
      this.Notificaciones.Warn("No puedes editar un presupuesto en estado asociado.");
      return;
    }

    const nuevoServicio:ServiciosFactura = new ServiciosFactura();
    const seleccionado = this.formServicios.get('servicio')?.value;

    nuevoServicio.idServicio = seleccionado.id;
    nuevoServicio.codServicio = seleccionado.codigo;
    nuevoServicio.nomServicio = seleccionado.descripcion;
    nuevoServicio.cantidad = this.formServicios.get('cantidad')?.value != '' ? this.formServicios.get('cantidad')?.value : 1;
    nuevoServicio.unitario = this.globalesService.EstandarizarDecimal(this.formServicios.get('precio')?.value);
    if(nuevoServicio.unitario === 0){
      nuevoServicio.unitario = seleccionado.sugerido;
    }
    nuevoServicio.total = nuevoServicio.cantidad! * nuevoServicio.unitario!;
    nuevoServicio.topeDescuento = seleccionado.topeDescuento;

    this.serviciosFactura.push(nuevoServicio);
    this.CalcularTotalGeneral();
    this.formServicios.reset();
  }
  //#endregion

  //#region PAGOS
  AgregarPagoContado(){
    if(this.totales.aPagar == 0) return;
    const nuevoPago = new PagosFactura();
    const seleccionado = this.metodosPago[0];
    nuevoPago.idMetodo = seleccionado.id;
    nuevoPago.metodo = seleccionado.descripcion;
    nuevoPago.monto = this.totales.aPagar;
    this.pagosFactura.push(nuevoPago);
  }

  AgregarPagoAFavor() {
    if (this.totales.aPagar === 0) return;

    const metodo = this.metodosPago.find(x => x.id === METODO_PAGO.SALDO_A_FAVOR)!;
    this.saldoAplicado = Math.min(this.saldoAFavor, this.totales.aPagar);

    this.pagosFactura.push(new PagosFactura({
      idMetodo: metodo.id,
      metodo:   metodo.descripcion,
      monto:    this.saldoAplicado,
    }));

    this.aplicaSaldoAFavor = true;
    this.CalcularTotalGeneral();
  }

  AgregarPago() {
    if (this.formPagos.invalid) return;

    const montoIngresado = this.formPagos.get('monto')?.value;
    const montoFinal = montoIngresado
      ? this.globalesService.EstandarizarDecimal(montoIngresado)
      : this.montoRestante;

    if (montoFinal <= 0) return;

    if (montoFinal > this.montoRestante) {
      this.Notificaciones.Warn(
        "La entrega por pago no puede superar el total a pagar."
      );
      return;
    }

    const seleccionado: MetodoPago = this.formPagos.get('metodo')?.value;

    const nuevoPago = new PagosFactura();
    nuevoPago.idMetodo = seleccionado.id;
    nuevoPago.metodo   = seleccionado.descripcion;
    nuevoPago.tipo     = seleccionado.tipo;
    nuevoPago.monto    = montoFinal;

    // CHEQUE: abrir diálogo antes de confirmar el pago
    if (seleccionado.tipo === TIPO_METODO_PAGO.CHEQUE) {
      this._pagoAgregarPendiente = nuevoPago;
      this.dialogChequeImporte   = montoFinal;
      this.dialogChequeVisible   = true;
      return; // espera confirmación del diálogo
    }

    this.pagosFactura.push(nuevoPago);
    this.formPagos.reset();
  }

  onChequeConfirmado(datos: DatosCheque): void {
    if (this._editarChequeIndex >= 0) {
      // Modo edición: actualizar cheque existente
      this.pagosFactura[this._editarChequeIndex].cheque = datos;
      this._editarChequeIndex = -1;
    } else if (this._pagoAgregarPendiente) {
      // Modo alta: agregar nuevo pago
      this._pagoAgregarPendiente.cheque = datos;
      this.pagosFactura.push(this._pagoAgregarPendiente);
      this._pagoAgregarPendiente = null;
      this.formPagos.reset();
    }
    this.dialogChequeDatos = null;
  }

  onChequeCancelado(): void {
    // El usuario canceló — no se agrega/edita el pago
    this._pagoAgregarPendiente = null;
    this._editarChequeIndex    = -1;
    this.dialogChequeDatos     = null;
  }

  EditarCheque(rowIndex: number): void {
    const pago = this.pagosFactura[rowIndex];
    if (!pago?.cheque) return;
    this._editarChequeIndex  = rowIndex;
    this.dialogChequeDatos   = pago.cheque;
    this.dialogChequeImporte = pago.monto ?? 0;
    this.dialogChequeVisible = true;
  }
  //#endregion

  //#region GUARDAR Y FACTURAR
  Guardar(factura?:FacturaVenta, finalizando:boolean = false){
    if (this.modificando) {
      if (estadoVenta.esFacturado(this.venta.estado as EstadoVenta)) {
        this.Notificaciones.Warn("No puedes editar una venta en estado facturada.");
        return;
      }
      if (estadoVenta.esAsociado(this.venta.estado as EstadoVenta) || this.venta.idProceso === ID_PROCESO.PRESUPUESTO) {
        this.Notificaciones.Warn("No puedes editar un presupuesto en estado asociado.");
        return;
      }
    }

    this.markFormTouched(this.formGenerales);
    this.markFormTouched(this.formFacturacion);

    if (!this.clienteSeleccionado) {
      this.Notificaciones.Warn("Seleccioná un cliente antes de guardar.");
      this.formGenerales.get('cliente')?.markAsTouched();
      this.formGenerales.get('cliente')?.markAsDirty();
      return;
    }

    if(this.formGenerales.invalid || this.formFacturacion.invalid){
      this.Notificaciones.Warn("Falta completar datos obligatorios.")
      return;
    } 

    this.ArmarObjetoVenta();
    if(factura && factura.estado === ESTADO_VENTA.APROBADO)
      this.venta.factura = factura;
      
    if(this.venta.factura)
      this.venta.estado = ESTADO_VENTA.FACTURADA;

    if(this.ProcesoControl.id == ID_PROCESO.COTIZACION)
      this.venta.estado = ESTADO_VENTA.FINALIZADA;


    //Control para clientes con cuenta corriente
    const pendiente = this.getSaldoPendiente;
    if (!this.pagoCompleto && pendiente > 0) {
      this.venta.pagos.push(new PagosFactura({
        idMetodo: METODO_PAGO.CUENTA_CORRIENTE,
        metodo:   "Cuenta Corriente",
        monto:    pendiente,
      }));
    }

    if(!this.modificando){
      this.ventasService.Agregar(this.venta)
      .subscribe({
        next: (response) => {
          if (response) {
            if (!finalizando) {
              this.Notificaciones.Success(this.venta.proceso + " agregado/a correctamente");
              this.venta.id = parseInt(response);
              this.venta.hora = new Date().toLocaleTimeString('es-AR', { 
                hour: '2-digit', 
                minute: '2-digit', 
                hour12: false 
              });
              this.router.navigateByUrl("/ventas?tipo=" + this.tipo);
            } else {
              this.Notificaciones.Success("Se guardaron los cambios y se facturó correctamente");
              this.router.navigateByUrl("/ventas?tipo=" + this.tipo);
            }
          }
        },
        error: (err) => {
          this.venta.estado = "";
        }
      });
    }else{
      this.ventasService.Modificar(this.venta)
      .subscribe(response => {
        if(response){

          if(!finalizando){
            this.Notificaciones.Success(this.venta.proceso + " actualizado/a correctamente");
            this.router.navigateByUrl("/ventas?tipo=" + this.tipo)
          }else{
            this.Notificaciones.Success("Venta actualizada y facturada correctamente");
            this.router.navigateByUrl("/ventas?tipo=" + this.tipo)
          } 
        }   
      });
    }
  }
  
  Cerrar(){
    if (
    this.venta.id === 0 && (
        (this.ProcesoControl?.id > 0 && this.clienteSeleccionado)
        || this.productosFactura.length > 0
    )
    ) {
      this.confirmationService.confirm({
        key: 'cerrarDialog',
        message: 'Si cierras ahora la ventana vas a perder los cambios no guardados. <br> ¿Estas seguro que deseas cerrar?',
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
          this.router.navigateByUrl("/ventas?tipo=" + this.tipo)
        },
        reject: () => {},
      });
    } else {
      this.router.navigateByUrl("/ventas?tipo=" + this.tipo)
    }
  }

  ConfirmarFacturacion(){
    this.markFormTouched(this.formGenerales);
    if(this.formGenerales.invalid){
      this.Notificaciones.Warn("Falta completar datos obligatorios.")
      return;
    } 

    this.markFormTouched(this.formFacturacion);
      if(this.formFacturacion.invalid) {
        this.Notificaciones.Warn("Falta completar datos obigatorios de facturación.")
        return;
      };

    if(this.clienteSeleccionado!.idCondicionPago != ID_CONDICION_PAGO.CUENTA_CORRIENTE){
      if(this.pagosFactura.length == 0){
        this.Notificaciones.Warn("No se registraron métodos de pago.");
        return;
      }
      if(!this.pagoCompleto){
        this.Notificaciones.Warn("Este cliente no admite cuenta corriente. Para continuar, debés registrar el pago total de la venta.");
        return;
      }
    }

    const empresaSeleccionada = this.empresas.find(e => e.id == this.formFacturacion.get('empresa')?.value);
    this.objFacturar.total = Number(this.totales.general.toFixed(2));
    this.objFacturar.neto  = Number(this.totales.subtotal.toFixed(2));
    this.objFacturar.iva   = Number(this.totales.iva.toFixed(2));
    this.objFacturar.tipoComprobante = this.formFacturacion.get('tComprobante')?.value;
    this.objFacturar.tipoFacturaDesc = this.comprobantes.find(c => c.id == this.formFacturacion.get('tComprobante')?.value)?.descripcion;
    this.objFacturar.docNro = this.clienteSeleccionado!.documento;
    this.objFacturar.docTipo = this.clienteSeleccionado!.idTipoDocumento;
    this.objFacturar.docTipoDesc = this.clienteSeleccionado!.tipoDocumento;
    this.objFacturar.condReceptor = this.clienteSeleccionado!.idCondicionIva;
    this.objFacturar.condicion = this.clienteSeleccionado!.condicionIva;
    this.objFacturar.cliente = this.clienteSeleccionado!.nombre;
    this.objFacturar.empresa = empresaSeleccionada?.razonSocial;
    this.objFacturar.ptoVenta = empresaSeleccionada?.puntoVta;
    this.objFacturar.idEmpresa = this.formFacturacion.get('empresa')?.value;
    this.objFacturar.pagos = this.pagosFactura;
    this.objFacturar.saldoPendiente = this.getSaldoPendiente;

    this.modalFacturarVisible = true;
  }

  GuardarFacturar(factura?:FacturaVenta){
    if(factura && factura!=undefined){
      if(factura.estado == ESTADO_FACTURA.APROBADO || factura.estado == ESTADO_FACTURA.COTIZACION){
        this.Guardar(factura, true);
      }else{
        this.Notificaciones.Error("No se pudo realizar la facturación electrónica, consulte los registros.")
      }

    }

    this.modalFacturarVisible = false;
  }

  ArmarObjetoVenta(){
    this.venta.idCaja = this.sesion.idCaja; 
    this.venta.idProceso = this.formGenerales.get('proceso')?.value.id;
    this.venta.proceso = this.formGenerales.get('proceso')?.value.descripcion;
    this.venta.idPunto = this.formGenerales.get('punto')?.value.id;
    this.venta.punto = this.formGenerales.get('punto')?.value.descripcion;
    this.venta.fecha = this.formGenerales.get('fecha')?.value;
    this.venta.ajuste = this.formGenerales.get('ajuste')?.value == true ? 1 : 0;
    
    this.venta.cliente = this.clienteSeleccionado;
    this.venta.nroRelacionado = this.nroRelacionado;
    this.venta.tipoRelacionado = this.tipoRelacionado;

    if(this.venta.idProceso == ID_PROCESO.NOTA_EMPAQUE)
      this.venta.estado = ESTADO_VENTA.PENDIENTE;
    else
      this.venta.estado = ESTADO_VENTA.APROBADO;


    const idLista = this.formGenerales.get('lista')?.value;

    if(idLista == null || idLista == ""){
      this.venta.idListaPrecio = LISTA_PRECIO.CONSUMIDOR_FINAL;
      this.venta.listaPrecio = "CONSUMIDOR FINAL";
    }
    else
    {
      this.venta.idListaPrecio = this.formGenerales.get('lista')?.value.id;
      this.venta.listaPrecio = this.formGenerales.get('lista')?.value.descripcion;
    }
      
    if(this.tipo === 'factura'){
      this.venta.idEmpresa = this.formFacturacion.get('empresa')?.value;
      this.venta.idTipoComprobante = this.formFacturacion.get('tComprobante')?.value;
      this.venta.idTipoDescuento = this.formFacturacion.get('tDescuento')?.value;
      const descuento = this.formFacturacion.get('descuento')?.value;
      this.venta.descuento = descuento == '' ? 0 : descuento;
      this.venta.codPromocion = 0;
      this.venta.redondeo = this.globalesService.EstandarizarDecimal(this.redondeo.value);

      this.venta.empresa = this.empresas.find(e => e.id == this.formFacturacion.get('empresa')?.value)?.razonSocial;
      this.venta.tipoComprobante = this.comprobantes.find(c => c.id == this.formFacturacion.get('tComprobante')?.value)?.descripcion;
      this.venta.tipoDescuento = this.tiposDescuento.find(t => t.id == this.formFacturacion.get('tDescuento')?.value)?.descripcion;

      this.venta.estado = ESTADO_VENTA.PENDIENTE;
      if(this.pagoCompleto == false){
        this.venta.impaga = 1;
      }
    }

    this.venta.total = this.totales.aPagar;
    this.venta.productos = this.productosFactura;
    this.venta.servicios = this.serviciosFactura;
    this.venta.pagos = this.pagosFactura;
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
  //#endregion
}
