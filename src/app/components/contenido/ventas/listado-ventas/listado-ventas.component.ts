import { Component, OnDestroy, ViewChild } from '@angular/core';
import { Subscription, debounceTime } from 'rxjs';
import { NotasEmpaquePendientesService, ResumenNotasEmpaque } from '../../../../services/notas-empaque-pendientes.service';
import { Venta } from '../../../../models/Factura';
import { FiltroGral } from '../../../../models/filtros/FiltroGral';
import { VentasService } from '../../../../services/ventas.service';
import { TableLazyLoadEvent, TableModule } from 'primeng/table';
import { Button } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { DecimalFormatPipe } from '../../../../pipes/decimal-format.pipe';
import { DatePipe, TitleCasePipe } from '@angular/common';
import { TagModule } from 'primeng/tag';
import { FiltroVenta } from '../../../../models/filtros/FiltroVenta';
import { VistaPreviaComponent } from '../vista-previa/vista-previa.component';
import { FORMS_IMPORTS } from '../../../../imports/forms.import';
import { ProcesoVenta } from '../../../../models/ProcesoVenta';
import { MiscService } from '../../../../services/misc.service';
import { FormControl, FormGroup } from '@angular/forms';
import { DatePicker } from 'primeng/datepicker';
import { Cliente } from '../../../../models/Cliente';
import { ClientesService } from '../../../../services/clientes.service';
import { ComprobanteService } from '../../../../services/comprobante.service';
import { DocumentoComercialService } from '../../../../services/documento-comercial.service';
import { SplitButtonModule } from 'primeng/splitbutton';
import { Popover, PopoverModule } from 'primeng/popover';
import { FacturaService } from '../../../../services/factura.service';
import { ConfirmationService, MenuItem } from 'primeng/api';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { Dialog } from 'primeng/dialog';
import { TextareaModule } from 'primeng/textarea';
import { NotificacionesService } from '../../../../services/notificaciones.service';
import { NotasVentaComponent } from "../notas-venta/notas-venta.component";
import { NotaCreditoXComponent } from "../nota-credito-x/nota-credito-x.component";
import { NotaDebitoXComponent } from "../nota-debito-x/nota-debito-x.component";
import { FilesService } from '../../../../services/files.service';
import { EncabezadoSeccionComponent } from '../../../compartidos/encabezado-seccion/encabezado-seccion.component';
import { ESTADO_VENTA, ESTADOS_ENTREGA_ABIERTA, ESTADOS_POR_PROCESO, ID_PROCESO, puedeDarseDeBaja, puedeEditarseVenta, saldoDisponibleNotaFiscal, saldoDisponibleNotaInterna, TipoNotaCredito } from '../models/venta.constants';
import { PrepararPreciosVenta } from '../../../../services/helpers/precios-venta.helper';
import { Menu } from 'primeng/menu';

@Component({
  selector: 'app-listado-ventas.component',
  standalone: true,
  imports: [
    ...FORMS_IMPORTS,
    ConfirmDialogModule,
    Dialog,
    TextareaModule,
    TableModule,
    Button,
    RouterLink,
    TooltipModule,
    DecimalFormatPipe,
    DatePipe,
    TitleCasePipe,
    TagModule,
    DatePicker,
    VistaPreviaComponent,
    SplitButtonModule,
    PopoverModule,
    NotasVentaComponent,
    NotaCreditoXComponent,
    NotaDebitoXComponent,
    EncabezadoSeccionComponent,
    Menu
],
  templateUrl: './listado-ventas.component.html',
  styleUrl: './listado-ventas.component.scss',
  providers: [ConfirmationService],
})
export class ListadoVentasComponent implements OnDestroy {
  ventas: Venta[] = [];
  totalRecords: number = 0;
  loading: boolean = false;
  filtroActual!: FiltroVenta;
  tipo: 'factura' | 'pre' = 'factura';
  tipoNota: 'Crédito' | 'Débito' = 'Crédito';
  // Elegido en el popover #tipoNC (ver ElegirTipoNotaCredito) - viaja como
  // Input a app-notas-venta para preseleccionar el selector Fiscal/Interna.
  tipoNotaCreditoElegida: TipoNotaCredito = 'FISCAL';
  // true cuando la tabla ya disparó su primera carga (onLazyLoad). Hasta ese momento no se busca
  // a mano: la primera búsqueda la hace la propia tabla con los filtros ya restaurados.
  tablaInicializada = false;
  primerRegistro = 0;
  tamanioPagina = 10;
  private busquedaId = 0;
  // Atajo "Entregas de esta semana": además del rango, trae solo documentos abiertos.
  soloAbiertos = false;
  // Menú "⋯" de cada fila (Editar / Dar de baja / Emitir NC...), un solo menú que se reconstruye por fila.
  itemsMenu: MenuItem[] = [];
  private eventoMenu: any = null;
  private anclaMenu: any = null;
  detalleVisible: boolean = false;
  notasVisible: boolean = false;
  notaCreditoXVisible: boolean = false;
  notaDebitoXVisible: boolean = false;
  ventaSeleccionada:Venta = new Venta();

  // Dar de baja (Presupuesto/Pedido/Nota de Empaque) - mismo patrón que
  // DarBajaRecibo en ventas-cliente.components.ts.
  bajaVisible: boolean = false;
  ventaBaja: number = 0;
  motivoBaja: string = '';

  filtros:FormGroup;
  clientes:Cliente[]=[];
  clientesFiltrados:Cliente[]=[];
  procesos:ProcesoVenta[] = [];

  // El acceso rápido (badge/Ver pendientes) llega por query params. Una vez aplicados se sacan
  // de la URL; esa limpieza hace emitir de nuevo a queryParams y esta bandera evita que esa
  // emisión se tome como "cambio de pantalla" (limpiaría el filtro recién aplicado). Sin sacar
  // los parámetros, volver a tocar "Ver pendientes" después de Limpiar navegaba a la MISMA URL y
  // Angular lo ignoraba (el filtro no se aplicaba).
  private ignorarProximaEmisionDeParametros = false;

  // Notas de Empaque pendientes de control (oct-2026), para el cartel de arriba. Ver
  // NotasEmpaquePendientesService.
  pendientes: ResumenNotasEmpaque = { total: 0, atrasadas: 0, porFacturar: 0 };
  private subs = new Subscription();
  @ViewChild('op') op!: Popover;
  @ViewChild('notas') notas!: Popover;
  @ViewChild('tipoNC') tipoNC!: Popover;
  @ViewChild('menuAcciones') menuAcciones!: Menu;


  constructor(
    private ventasService:VentasService,
    private router:Router,
    private rutaActiva: ActivatedRoute,
    private miscService: MiscService,
    private clientesService:ClientesService,
    private comprobanteService:ComprobanteService,
    private facturaService:FacturaService,
    private documentoComercialService:DocumentoComercialService,
    private confirmationService: ConfirmationService,
    private Notificaciones: NotificacionesService,
    private filesService:FilesService,
    private pendientesService:NotasEmpaquePendientesService
  ){
    this.filtros = new FormGroup({
      proceso: new FormControl(),
      nroProceso: new FormControl(),
      estado: new FormControl(null),
      orden: new FormControl('fecha-desc'),
      fechas: new FormControl(),
      fechasEntrega: new FormControl(),
      cliente: new FormControl(),
      conSaldoPorDevolver: new FormControl(false)
    })
  }

  ngOnInit() {
    this.subs.add(this.pendientesService.resumen$.subscribe(r => this.pendientes = r));
    // El tilde "Con saldo por devolver" solo existe con el proceso Entrega sin cargo: al cambiar
    // de proceso se destilda para no dejar un filtro oculto activo. El Estado también depende del
    // proceso: se limpia/ajusta a las opciones del proceso nuevo.
    this.subs.add(this.filtros.controls['proceso'].valueChanges.subscribe(() => {
      this.filtros.patchValue({ conSaldoPorDevolver: false }, { emitEvent: false });
      this.SincronizarEstado();
    }));
    // Los filtros se aplican solos (sin botón Buscar), con una pausa corta para no buscar en cada tecla.
    this.subs.add(this.filtros.valueChanges.pipe(debounceTime(350)).subscribe(() => this.AlCambiarFiltros()));

    this.subs.add(this.rutaActiva.queryParams.subscribe(params => {
      if (this.ignorarProximaEmisionDeParametros) {
        this.ignorarProximaEmisionDeParametros = false;
        return;
      }
      this.tipo = params['tipo'] ?? 'factura';

      // Acceso rápido por URL (oct-2026), ej. el badge del menú: /ventas?tipo=pre&idProceso=7&estado=Pendiente
      // deja filtradas las Notas de Empaque pendientes de control. Solo aplica a Pre-Facturación.
      const idProcesoRapido = this.tipo === 'pre' ? Number(params['idProceso'] ?? 0) : 0;
      const estadoRapido = this.tipo === 'pre' ? (params['estado'] ?? null) : null;

      if (idProcesoRapido || estadoRapido) {
        this.soloAbiertos = false;
        this.filtros.reset(this.ValoresIniciales(), { emitEvent: false });
        this.SincronizarEstado();
        // El filtro de proceso necesita la lista de procesos ya cargada, así que la búsqueda se
        // hace UNA sola vez cuando llegan, en vez de buscar sin filtros primero.
        this.ObtenerProcesosVenta(() => {
          const proceso = this.procesos.find(p => p.id === idProcesoRapido);
          if (proceso) {
            this.filtros.patchValue({ proceso }, { emitEvent: false });
            this.SincronizarEstado();
          }
          if ([ESTADO_VENTA.PENDIENTE, ESTADO_VENTA.APROBADA].includes(estadoRapido) && this.EstadosDisponibles.includes(estadoRapido))
            this.filtros.patchValue({ estado: estadoRapido }, { emitEvent: false });
          this.AplicarFiltros();
        });

        // Se consumen los parámetros: se sacan de la URL (ver ignorarProximaEmisionDeParametros).
        this.ignorarProximaEmisionDeParametros = true;
        this.router.navigate([], {
          relativeTo: this.rutaActiva,
          queryParams: { idProceso: null, estado: null },
          queryParamsHandling: 'merge',
          replaceUrl: true
        }).then(() => this.ignorarProximaEmisionDeParametros = false);
      } else {
        // Vuelve a los filtros que tenía esta pantalla (se guardan por pestaña del navegador).
        this.RestaurarFiltros();
        this.ObtenerProcesosVenta();
        // En la primera carga busca la propia tabla (onLazyLoad); al cambiar entre Facturación y
        // Pre-Facturación la tabla ya existe, así que se busca a mano.
        if (this.tablaInicializada) this.Buscar();
      }
      this.ObtenerClientes();
    }));
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
  }

  // Lleva a las Notas de Empaque sin controlar (mismo filtro que el badge del menú).
  VerPendientes(){
    this.router.navigate(['/ventas'], {
      queryParams: { tipo: 'pre', idProceso: ID_PROCESO.NOTA_EMPAQUE, estado: 'Pendiente' }
    });
  }

  // Lleva a las Notas de Empaque ya controladas (Aprobadas) que faltan facturar.
  VerPorFacturar(){
    this.router.navigate(['/ventas'], {
      queryParams: { tipo: 'pre', idProceso: ID_PROCESO.NOTA_EMPAQUE, estado: 'Aprobada' }
    });
  }

  ObtenerProcesosVenta(alCargar?: () => void){
    this.miscService.ObtenerProcesosVenta(this.tipo)
      .subscribe(response => {
        this.procesos = response;
        alCargar?.();
      });
  }

  Buscar(event?: TableLazyLoadEvent, busqueda?: string, recargaConFiltro: boolean = false) {
    if (event) {
      this.tablaInicializada = true;
      this.tamanioPagina = event.rows ?? this.tamanioPagina;
    } else {
      this.primerRegistro = 0;
    }

    // Sin ningún filtro no se trae nada (nov-2026, pedido del cliente): la lista arranca vacía y se
    // completa al elegir filtros.
    if (!this.HayFiltros) {
      this.busquedaId++;
      this.ventas = [];
      this.totalRecords = 0;
      this.loading = false;
      return;
    }

    this.loading = true;

    const pageIndex = (event?.first ?? 0) / this.tamanioPagina;
    const pageSize = this.tamanioPagina;

    if (!recargaConFiltro) {
      const { orden, direccion } = this.OrdenActual();
      this.filtroActual = new FiltroVenta({
        pagina: pageIndex + 1,
        tamanioPagina: pageSize,
        busqueda: busqueda,
        tipo: this.tipo,
        idProceso: this.filtros.value.proceso?.id ?? 0,
        nroProceso: this.NroProcesoNumerico,
        estado: this.filtros.value.estado || '',
        fechas: this.filtros.value.fechas,
        fechasEntrega: this.filtros.value.fechasEntrega,
        cliente: this.filtros.value.cliente?.id ?? 0,
        conSaldoPorDevolver: this.EsFiltroEntregaSinCargo && !!this.filtros.value.conSaldoPorDevolver,
        soloPendientes: this.soloAbiertos,
        orden,
        direccion
      });
    }

    // Si el usuario cambia filtros rápido, solo vale la respuesta de la última búsqueda.
    const id = ++this.busquedaId;
    this.ventasService.ObtenerVentas(this.filtroActual).subscribe(response => {
      if (id !== this.busquedaId) return;
      this.ventas = response.registros;
      this.totalRecords = response.total;
      this.loading = false;
    });
  }

  // Opciones del botón Exportar de Facturación (SplitButton).
  opcionesExportar: MenuItem[] = [
    { label: 'Exportar', icon: 'pi pi-file-excel', command: () => this.Exportar() },
    { label: 'Exportar entregas sin cargo', icon: 'pi pi-file-excel', command: () => this.ExportarEntregasSinCargo() },
  ];

  // Pre-Facturación: informe de pedidos pendientes de entrega (nov-2026). Cada opción abre un diálogo
  // donde se elige el rango de fecha de entrega (obligatorio); Administración lleva el Total.
  opcionesExportarPre: MenuItem[] = [
    { label: 'Exportar', icon: 'pi pi-file-excel', command: () => this.Exportar() },
    { label: 'Pedidos pendientes - Producción', icon: 'pi pi-file-excel', command: () => this.AbrirPedidosPendientes('produccion') },
    { label: 'Pedidos pendientes - Administración', icon: 'pi pi-file-excel', command: () => this.AbrirPedidosPendientes('administracion') },
  ];
  pedidosPendientesVisible: boolean = false;
  tipoInformePendientes: 'produccion' | 'administracion' = 'produccion';
  rangoPendientes: Date[] | null = null;

  AbrirPedidosPendientes(tipo: 'produccion' | 'administracion'){
    this.tipoInformePendientes = tipo;
    // Si ya hay un rango de entrega elegido en el listado se usa de punto de partida.
    const entrega = this.filtros.get('fechasEntrega')?.value;
    this.rangoPendientes = Array.isArray(entrega) && entrega.length === 2 && entrega[0] && entrega[1] ? entrega : null;
    this.pedidosPendientesVisible = true;
  }

  DescargarPedidosPendientes(){
    const rango = this.rangoPendientes;
    if(!rango || rango.length !== 2 || !rango[0] || !rango[1]){
      this.Notificaciones.Warn("Debe seleccionar un rango de fechas de entrega completo (desde y hasta).");
      return;
    }
    const tipo = this.tipoInformePendientes;
    this.filesService.DescargarPedidosPendientesExcel({ fechasEntrega: rango, tipoInforme: tipo })
      .subscribe(blob => {
        this.GuardarExcel(blob, tipo === 'administracion' ? 'PedidosPendientes_Administracion' : 'PedidosPendientes_Produccion');
        this.pedidosPendientesVisible = false;
      });
  }

  Exportar(){
    const fechas = this.filtros.get('fechas')?.value;
    const fechasCompletas = !!fechas && fechas.length === 2 && !!fechas[0] && !!fechas[1];
    const esPre = this.tipo === 'pre';

    // Facturación: el rango de fechas sigue siendo obligatorio. Pre-Facturación: opcional (sin
    // rango se exporta todo lo cargado, que es lo que necesitan para ver pedidos pendientes).
    if(!esPre && !fechasCompletas){
      this.Notificaciones.Warn("Debe seleccionar un rango de fechas completo (desde y hasta).");
      return;
    }

    this.filtroActual = new FiltroVenta({
      tipo: this.tipo,
      idProceso: this.filtros.value.proceso?.id ?? 0,
      nroProceso: this.NroProcesoNumerico,
      estado: this.filtros.value.estado || '',
      fechas: fechasCompletas ? fechas : null,
      // Mismo filtro que el listado: sin esto el export no coincidía con lo que se ve en pantalla.
      fechasEntrega: this.filtros.value.fechasEntrega,
      cliente: this.filtros.value.cliente?.id ?? 0
    });

    const descarga$ = esPre
      ? this.filesService.DescargarPreFacturacionExcel(this.filtroActual)
      : this.filesService.DescargarVentasExcel(this.filtroActual);

    descarga$.subscribe(blob => this.GuardarExcel(blob, esPre ? 'PreFacturacion' : 'Ventas'));
  }

  // Facturación: entregas sin cargo (ESC) y sus devoluciones, neteadas. Mismos filtros de la
  // pantalla que Exportar (rango de fechas obligatorio + cliente); sin filtro por motivo.
  ExportarEntregasSinCargo(){
    const fechas = this.filtros.get('fechas')?.value;
    const fechasCompletas = !!fechas && fechas.length === 2 && !!fechas[0] && !!fechas[1];
    if(!fechasCompletas){
      this.Notificaciones.Warn("Debe seleccionar un rango de fechas completo (desde y hasta).");
      return;
    }

    const filtro = new FiltroVenta({
      tipo: this.tipo,
      fechas: fechas,
      cliente: this.filtros.value.cliente?.id ?? 0
    });

    this.filesService.DescargarEntregasSinCargoExcel(filtro)
      .subscribe(blob => this.GuardarExcel(blob, 'EntregasSinCargo'));
  }

  private GuardarExcel(blob: Blob, prefijo: string){
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');

    // Fecha en formato DD-MM-YY
    const fecha = new Date();
    const dd = String(fecha.getDate()).padStart(2, '0');
    const mm = String(fecha.getMonth() + 1).padStart(2, '0'); // Meses empiezan en 0
    const yy = String(fecha.getFullYear()).slice(-2); // últimos 2 dígitos del año

    a.href = url;
    a.download = `${prefijo}_${dd}-${mm}-${yy}.xlsx`;
    a.click();
    window.URL.revokeObjectURL(url);
  }

  Editar(id:number){
    this.router.navigate(
      ['/ventas/administrar', id],
      { queryParams: { tipo: this.tipo} }
    );
  }

  // ElegirNota(venta:Venta){
  //   this.notas.toggle(event);
  //   this.ventaSeleccionada = venta;
  // }

  VerResumen(venta:Venta){
    this.ventaSeleccionada = venta;
    this.PrepararPrecios();
    this.detalleVisible = true;
  }

  // Abre el popover para elegir Fiscal/Interna (ver #tipoNC en el html). La
  // venta se fija acá para que los botones del popover (TieneNotaFiscal/
  // TieneNotaInterna) sepan sobre qué venta preguntar.
  ElegirTipoNotaCredito(event: Event, venta: Venta, ancla?: any) {
    this.ventaSeleccionada = venta;
    // Desde el menú "⋯" el popover se ancla al botón de la fila (el ítem del menú ya no existe).
    this.tipoNC.toggle(event, ancla);
  }

  // true cuando no queda saldo de la factura para otra NC fiscal (sep-2026: ya
  // no bloquea por "ya existe una", ver saldoDisponibleNotaFiscal).
  TieneNotaFiscal(venta: Venta): boolean {
    return saldoDisponibleNotaFiscal(venta) <= 0;
  }

  // true cuando no queda saldo para otra NC interna (X) - mismo mecanismo que
  // TieneNotaFiscal, ya no bloquea por "ya existe una" (sep-2026, ver
  // saldoDisponibleNotaInterna).
  TieneNotaInterna(venta: Venta): boolean {
    return saldoDisponibleNotaInterna(venta) <= 0;
  }

  EmitirNotaCredito(tipo: TipoNotaCredito){
    this.tipoNota = 'Crédito';
    this.tipoNotaCreditoElegida = tipo;
    this.PrepararPrecios(tipo);
    this.notasVisible = true;
  }
  // Devolución de entrega (F3): reusa el diálogo de notas en modo "interna" (sin ARCA). El modo lo
  // decide notas-venta por venta.idProceso (ESC); el remanente viene del bucket interno que arma el backend.
  EmitirDevolucionEntrega(venta: Venta){
    this.ventaSeleccionada = venta;
    this.tipoNota = 'Crédito'; // el título lo resuelve notas-venta por idProceso (esDevolucionEntrega)
    this.tipoNotaCreditoElegida = 'INTERNA';
    this.PrepararPrecios('INTERNA');
    this.notasVisible = true;
  }
  Actualizar(actualiza){
    this.notasVisible = false;
    if(actualiza)
      this.Buscar();
  }

  AbrirNotaCreditoX(){
    this.notaCreditoXVisible = true;
  }

  ActualizarNotaCreditoX(actualiza:boolean){
    this.notaCreditoXVisible = false;
    if(actualiza)
      this.Buscar();
  }

  AbrirNotaDebitoX(){
    this.notaDebitoXVisible = true;
  }

  ActualizarNotaDebitoX(actualiza:boolean){
    this.notaDebitoXVisible = false;
    if(actualiza)
      this.Buscar();
  }

  ElegirComprobante(venta:Venta){
    this.op.toggle(event);
    this.ventaSeleccionada = venta;
  }
  VerComprobante(){
    this.comprobanteService.VerComprobante(this.ventaSeleccionada)
  }
  VerFactura(){
    this.PrepararPrecios();
    this.facturaService.VerFactura(this.ventaSeleccionada)
  }
  // Documento comercial (Presupuesto/Pedido/Nota de Empaque) con formato tipo factura +
  // condiciones de venta - análogo a VerFactura() pero para tipo === 'pre'.
  VerDocumentoComercial(){
    this.documentoComercialService.VerDocumento(this.ventaSeleccionada)
  }

  // Fase 4: abre la pantalla normal de facturación con la NE aprobada precargada
  // (empresa, comprobante y pagos se eligen allá).
  Facturar(venta:Venta){
    this.router.navigate(['/ventas/administrar/0'], { queryParams: { tipo: 'factura', notaEmpaque: venta.id } });
  }

  // Pasar a NE (nov-2026): abre la pantalla de Pre-Facturación con el Pedido Aprobado precargado como
  // origen de una Nota de Empaque nueva (ítems y cliente bloqueados, copia fiel del Pedido).
  PasarANotaEmpaque(venta:Venta){
    this.router.navigate(['/ventas/administrar/0'], { queryParams: { tipo: 'pre', pedido: venta.id } });
  }

  Aprobar(venta:Venta){
    this.confirmationService.confirm({
        key: 'cerrarDialog',
        message: '¿Estas seguro de pasar a estado APROBADA la nota de empaque Nro ' + venta.nroProceso + "?",
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
          this.ventasService.AprobarVenta(venta.id!)
          .subscribe(response => {
            if(response=='OK'){
              this.Notificaciones.Success("Nota de empaque aprobada correctamente.");
              this.pendientesService.Actualizar();
              this.Buscar();
            }
          });
        },
        reject: () => {},
      });
  }

  // Solo Presupuesto/Pedido/Nota de Empaque en su estado "abierto" (ver
  // ESTADOS_ABIERTOS_BAJA en venta.constants.ts). La validación real la hace
  // el backend igual - esto es solo para no mostrar el botón habilitado
  // cuando ya se sabe que va a rechazar.
  PuedeDarseDeBaja(venta: Venta): boolean {
    return puedeDarseDeBaja(venta.idProceso, venta.estado);
  }

  // Una Nota de Empaque Asociada/Facturada ya no se edita (ver puedeEditarseVenta). La
  // validación real la hace el backend en ModificarBody.
  PuedeEditar(venta: Venta): boolean {
    return puedeEditarseVenta(venta.idProceso, venta.estado);
  }

  // Auditoría de la Nota de Empaque (oct-2026): quién aprobó y quién la modificó por última
  // vez. Solo aplica a NE; para el resto devuelve '' (p-tooltip no muestra nada con vacío).
  // La aprobación se muestra solo si la NE sigue Aprobada: al modificarla el backend la
  // limpia, pero una NE ya Asociada/Facturada conserva quién la aprobó.
  TooltipAuditoria(venta: Venta): string {
    if (venta.idProceso !== ID_PROCESO.NOTA_EMPAQUE) return '';
    const formato = (f?: Date) => f ? new Date(f).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' }) : '';
    const lineas: string[] = [];
    if (venta.usuarioAprobacion)
      lineas.push(`Aprobada por ${venta.usuarioAprobacion} el ${formato(venta.fechaAprobacion)}`);
    if (venta.usuarioModificacion)
      lineas.push(`Última modificación: ${venta.usuarioModificacion} el ${formato(venta.fechaModificacion)}`);
    return lineas.join('\n');
  }

  AbrirDarBaja(venta: Venta) {
    this.ventaBaja = venta.id!;
    this.motivoBaja = '';
    this.bajaVisible = true;
  }

  ConfirmarDarBaja() {
    if (!this.motivoBaja?.trim()) return;

    this.ventasService.DarBajaVenta(this.ventaBaja, this.motivoBaja.trim())
      .subscribe({
        next: () => {
          this.Notificaciones.Success(`Venta #${this.ventaBaja} dada de baja correctamente.`);
          this.bajaVisible = false;
          this.pendientesService.Actualizar();
          this.Buscar();
        },
        // Mismo patrón que ConfirmarDarBaja en ventas-cliente.components.ts: el
        // backend tira { status, message } con el motivo específico del bloqueo
        // (proceso no válido, estado no abierto, motivo faltante).
        error: (e) => this.Notificaciones.Error(e?.error ?? 'No se pudo dar de baja.')
      });
  }

  GetSeverity(estado: string): 'info' | 'warn' | 'success' {
    if (!estado) return 'info';

    const value = estado.toLowerCase();

    if (value === 'aprobada' || value === 'aprobado' || value === 'emitido') {
      return 'info';
    }

    if (
      value === 'pendiente' ||
      value === 'asociado' ||
      value === 'asociada'
    ) {
      return 'warn';
    }

    if (value === 'facturado' || value === 'facturada' || value === 'finalizada') {
      return 'success';
    }

    return 'info';
  }

  ObtenerClientes(){
    this.clientesService.SelectorClientes()
      .subscribe(response => {
        this.clientes = response;
      });
  }
  
  FiltrarClientes(event: any) {
    const query = event.query.toLowerCase();
    this.clientesFiltrados = this.clientes.filter(c => {
      const nombre = (c.nombre ?? '').toLowerCase();
      const dni = (c.documento ?? '').toString();
      return nombre.includes(query) || dni.includes(query);
    });
  }

  // true cuando el proceso elegido en los filtros es Entrega sin cargo (habilita "Con saldo por devolver").
  get EsFiltroEntregaSinCargo(): boolean {
    return this.tipo === 'factura' && this.filtros.value.proceso?.id === ID_PROCESO.ENTREGA_SIN_CARGO;
  }

  //#region FILTROS (nov-2026)
  // La lista arranca vacía y se completa al elegir filtros; los filtros se aplican solos y se guardan
  // por pestaña del navegador (sessionStorage) para no perderlos al entrar a un documento y volver.

  private RangoCompleto(v: any): boolean {
    return Array.isArray(v) && v.length === 2 && !!v[0] && !!v[1];
  }

  // Solo dígitos: el campo es de texto y el backend arma el filtro con este número.
  private get NroProcesoNumerico(): number {
    return Number(String(this.filtros.value.nroProceso ?? '').replace(/\D/g, '')) || 0;
  }

  get HayFiltros(): boolean {
    const f = this.filtros.value;
    return !!(f.proceso?.id || f.estado || this.NroProcesoNumerico || this.RangoCompleto(f.fechas)
      || this.RangoCompleto(f.fechasEntrega) || f.cliente?.id);
  }

  get ControlOrden(): FormControl {
    return this.filtros.controls['orden'] as FormControl;
  }

  get EstadosDisponibles(): string[] {
    const idProceso = this.filtros.controls['proceso'].value?.id;
    return (idProceso && ESTADOS_POR_PROCESO[idProceso]) || [];
  }

  // Estado habilitado solo con un proceso elegido y limitado a sus opciones.
  private SincronizarEstado() {
    const ctrl = this.filtros.controls['estado'];
    const estados = this.EstadosDisponibles;
    if (estados.length === 0) {
      ctrl.setValue(null, { emitEvent: false });
      ctrl.disable({ emitEvent: false });
      return;
    }
    ctrl.enable({ emitEvent: false });
    if (ctrl.value && !estados.includes(ctrl.value)) ctrl.setValue(null, { emitEvent: false });
  }

  ElegirProceso(proceso: ProcesoVenta) {
    const actual = this.filtros.controls['proceso'].value;
    this.filtros.controls['proceso'].setValue(actual?.id === proceso.id ? null : proceso);
  }

  // Se llama (con pausa) en cada cambio del formulario. No busca mientras el rango de fechas está a
  // medias ni mientras se tipea el nombre del cliente (sin elegir de la lista todavía).
  private AlCambiarFiltros() {
    const f = this.filtros.value;
    if ((f.fechas && !this.RangoCompleto(f.fechas)) || (f.fechasEntrega && !this.RangoCompleto(f.fechasEntrega))) return;
    if (typeof f.cliente === 'string' && f.cliente.trim() !== '') return;
    this.AplicarFiltros();
  }

  AplicarFiltros() {
    this.primerRegistro = 0;
    this.GuardarFiltros();
    this.Buscar();
  }

  private OrdenPorDefecto(): string {
    return this.tipo === 'pre' ? 'entrega-asc' : 'fecha-desc';
  }

  // Facturación arranca con los últimos 7 días (pedido del cliente); Pre-Facturación, sin fechas.
  private ValoresIniciales(): any {
    const hoy = new Date();
    const desde = new Date();
    desde.setDate(hoy.getDate() - 6);
    return {
      proceso: null, nroProceso: null, estado: null,
      fechas: this.tipo === 'factura' ? [desde, hoy] : null,
      fechasEntrega: null, cliente: null, conSaldoPorDevolver: false,
      orden: this.OrdenPorDefecto()
    };
  }

  LimpiarFiltros(){
    this.soloAbiertos = false;
    this.filtros.reset(this.ValoresIniciales(), { emitEvent: false });
    this.SincronizarEstado();
    this.AplicarFiltros();
  }

  private get ClaveFiltros(): string {
    return 'listado-ventas.filtros.' + this.tipo;
  }

  private GuardarFiltros() {
    try {
      const f = this.filtros.getRawValue();
      const cliente = f.cliente?.id ? { id: f.cliente.id, nombre: f.cliente.nombre, documento: f.cliente.documento } : null;
      sessionStorage.setItem(this.ClaveFiltros, JSON.stringify({ ...f, cliente, soloAbiertos: this.soloAbiertos }));
    } catch { /* storage no disponible: los filtros solo no se recuerdan */ }
  }

  private RestaurarFiltros() {
    const valores = this.ValoresIniciales();
    this.soloAbiertos = false;
    let guardado: any = null;
    try { guardado = JSON.parse(sessionStorage.getItem(this.ClaveFiltros) ?? 'null'); } catch { guardado = null; }
    if (guardado) {
      const fechas = (v: any) => Array.isArray(v) ? v.map((x: any) => x ? new Date(x) : null) : null;
      Object.assign(valores, {
        proceso: guardado.proceso ?? null,
        nroProceso: guardado.nroProceso ?? null,
        estado: guardado.estado ?? null,
        fechas: fechas(guardado.fechas),
        fechasEntrega: fechas(guardado.fechasEntrega),
        cliente: guardado.cliente ?? null,
        conSaldoPorDevolver: !!guardado.conSaldoPorDevolver,
        orden: guardado.orden || valores.orden
      });
      this.soloAbiertos = !!guardado.soloAbiertos;
    }
    this.filtros.reset(valores, { emitEvent: false });
    this.SincronizarEstado();
  }

  private FormatoFecha(d: any): string {
    const f = new Date(d);
    return String(f.getDate()).padStart(2, '0') + '-' + String(f.getMonth() + 1).padStart(2, '0') + '-' + f.getFullYear();
  }

  // Etiquetas de "Filtros activos", cada una se puede quitar con su "x".
  get FiltrosActivos(): { clave: string; texto: string }[] {
    const f = this.filtros.value;
    const r: { clave: string; texto: string }[] = [];
    if (f.proceso?.id) r.push({ clave: 'proceso', texto: 'Proceso: ' + (f.proceso.descripcion ?? '') });
    if (f.estado) r.push({ clave: 'estado', texto: 'Estado: ' + f.estado });
    if (this.NroProcesoNumerico) r.push({ clave: 'nroProceso', texto: 'N° Proceso: ' + this.NroProcesoNumerico });
    if (this.RangoCompleto(f.fechas)) r.push({ clave: 'fechas', texto: 'Fecha: ' + this.FormatoFecha(f.fechas[0]) + ' a ' + this.FormatoFecha(f.fechas[1]) });
    if (this.RangoCompleto(f.fechasEntrega)) r.push({ clave: 'fechasEntrega', texto: 'Entrega: ' + this.FormatoFecha(f.fechasEntrega[0]) + ' a ' + this.FormatoFecha(f.fechasEntrega[1]) });
    if (this.soloAbiertos) r.push({ clave: 'soloAbiertos', texto: 'Solo abiertos' });
    if (f.cliente?.id) r.push({ clave: 'cliente', texto: 'Cliente: ' + (f.cliente.nombre ?? '') });
    if (f.conSaldoPorDevolver) r.push({ clave: 'conSaldoPorDevolver', texto: 'Con saldo por devolver' });
    return r;
  }

  QuitarFiltro(clave: string) {
    switch (clave) {
      case 'proceso':
        this.filtros.patchValue({ proceso: null, conSaldoPorDevolver: false }, { emitEvent: false });
        this.SincronizarEstado();
        break;
      case 'soloAbiertos':
        this.soloAbiertos = false;
        break;
      case 'fechasEntrega':
        this.soloAbiertos = false;
        this.filtros.patchValue({ fechasEntrega: null }, { emitEvent: false });
        break;
      case 'conSaldoPorDevolver':
        this.filtros.patchValue({ conSaldoPorDevolver: false }, { emitEvent: false });
        break;
      default:
        this.filtros.patchValue({ [clave]: null }, { emitEvent: false });
    }
    this.AplicarFiltros();
  }

  // Atajo de la pantalla vacía: entregas de la semana (lunes a domingo) de documentos todavía abiertos.
  AtajoEntregasSemana() {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const lunes = new Date(hoy);
    lunes.setDate(hoy.getDate() - ((hoy.getDay() + 6) % 7));
    const domingo = new Date(lunes);
    domingo.setDate(lunes.getDate() + 6);
    this.soloAbiertos = true;
    this.filtros.patchValue({ fechasEntrega: [lunes, domingo], orden: 'entrega-asc' }, { emitEvent: false });
    this.AplicarFiltros();
  }

  get OpcionesOrden(): { label: string; value: string }[] {
    return this.tipo === 'pre'
      ? [
          { label: 'Entrega: más próxima primero', value: 'entrega-asc' },
          { label: 'Entrega: más lejana primero', value: 'entrega-desc' },
          { label: 'Fecha: más reciente primero', value: 'fecha-desc' },
          { label: 'Fecha: más antigua primero', value: 'fecha-asc' }
        ]
      : [
          { label: 'Fecha: más reciente primero', value: 'fecha-desc' },
          { label: 'Fecha: más antigua primero', value: 'fecha-asc' },
          { label: 'Total: mayor primero', value: 'total-desc' },
          { label: 'Total: menor primero', value: 'total-asc' }
        ];
  }

  // El valor del selector ('entrega-asc') se traduce al par que entiende el backend.
  private OrdenActual(): { orden: string; direccion: string } {
    const [campo, direccion] = String(this.filtros.value.orden || this.OrdenPorDefecto()).split('-');
    return { orden: campo === 'entrega' ? 'fechaEntrega' : campo, direccion: direccion || 'desc' };
  }

  // Clic en el encabezado "Entrega": alterna próxima primero / lejana primero.
  ToggleOrdenEntrega() {
    this.ControlOrden.setValue(this.ControlOrden.value === 'entrega-asc' ? 'entrega-desc' : 'entrega-asc');
  }

  get IconoOrdenEntrega(): string {
    const o = this.ControlOrden.value;
    return o === 'entrega-asc' ? 'pi pi-sort-amount-up-alt' : o === 'entrega-desc' ? 'pi pi-sort-amount-down' : 'pi pi-sort-alt';
  }
  //#endregion

  //#region FILAS: menú "⋯", clic en la fila y aviso de entrega
  AlHacerClicFila(event: Event, venta: Venta) {
    // Los botones de la fila tienen su propia acción: el clic en la fila solo abre el resumen.
    if ((event.target as HTMLElement)?.closest('.acciones, .p-tag')) return;
    this.VerResumen(venta);
  }

  AbrirMenu(event: any, venta: Venta) {
    this.eventoMenu = event;
    this.anclaMenu = event?.currentTarget ?? event?.target ?? null;
    this.itemsMenu = this.ConstruirMenu(venta);
    this.menuAcciones.toggle(event);
  }

  private PuedeEditarFila(venta: Venta): boolean {
    return !(venta.proceso === 'NOTA DE CREDITO' || venta.proceso === 'NOTA DE DEBITO'
      || venta.idProceso == 8 || venta.idProceso == 9 || !this.PuedeEditar(venta));
  }

  private PuedeEmitirNota(venta: Venta): boolean {
    return (venta.estado == 'Finalizada' || venta.estado == 'Facturada')
      && venta.proceso != 'NOTA DE CREDITO' && venta.proceso != 'NOTA DE DEBITO'
      && venta.idProceso != 8 && venta.idProceso != 9;
  }

  // Imprimir queda siempre visible (es lo más usado); Editar y Dar de baja van al menú (dos clics).
  private ConstruirMenu(venta: Venta): MenuItem[] {
    const items: MenuItem[] = [
      { label: 'Editar', icon: 'pi pi-pencil', disabled: !this.PuedeEditarFila(venta), command: () => this.Editar(venta.id!) }
    ];
    if (this.tipo === 'factura' && this.PuedeEmitirNota(venta)) {
      // El popover Fiscal/Interna se abre después de que el menú termine de cerrarse.
      items.push({ label: 'Emitir nota de crédito', icon: 'pi pi-file-edit',
        command: () => setTimeout(() => this.ElegirTipoNotaCredito(this.eventoMenu, venta, this.anclaMenu)) });
    }
    if (this.tipo === 'factura' && venta.idProceso == 8 && venta.estado == 'Finalizada') {
      items.push({ label: 'Devolver entrega', icon: 'pi pi-replay', disabled: this.TieneNotaInterna(venta),
        command: () => this.EmitirDevolucionEntrega(venta) });
    }
    if (this.tipo !== 'factura' && this.PuedeDarseDeBaja(venta)) {
      items.push({ separator: true });
      items.push({ label: 'Dar de baja', icon: 'pi pi-times', styleClass: 'item-baja', command: () => this.AbrirDarBaja(venta) });
    }
    return items;
  }

  // Etiqueta de urgencia junto a la fecha de entrega: solo en documentos abiertos (un pedido ya
  // facturado no tiene por qué decir "vencida").
  EntregaUrgencia(venta: Venta): { texto: string; severidad: 'danger' | 'warn' | 'secondary' } | null {
    if (!venta.fechaEntrega || !ESTADOS_ENTREGA_ABIERTA.has(venta.estado ?? '')) return null;
    const entrega = new Date(venta.fechaEntrega);
    const hoy = new Date();
    const dias = Math.round((new Date(entrega.getFullYear(), entrega.getMonth(), entrega.getDate()).getTime()
      - new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate()).getTime()) / 86400000);
    if (dias < 0) return { texto: 'Vencida hace ' + (-dias) + (dias === -1 ? ' día' : ' días'), severidad: 'danger' };
    if (dias === 0) return { texto: 'Hoy', severidad: 'warn' };
    if (dias === 1) return { texto: 'Mañana', severidad: 'secondary' };
    return { texto: 'En ' + dias + ' días', severidad: 'secondary' };
  }
  //#endregion

  // Delegado al helper compartido (ago-2026): la misma lógica la necesita Cuentas
  // Corrientes (ventas-cliente.components.ts), que tenía una copia vieja y desincronizada
  // - ver precios-venta.helper.ts. tipoNota: contra qué bucket (fiscal/interna)
  // calcular el remanente - solo relevante para EmitirNotaCredito, que lo pasa
  // explícito; el resto de los llamadores (VerResumen, etc.) no eligen tipo y usan
  // el default ('FISCAL') del helper.
  PrepararPrecios(tipoNota?: TipoNotaCredito){
    PrepararPreciosVenta(this.ventaSeleccionada, tipoNota);
  }
}
