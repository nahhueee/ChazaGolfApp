import { Component, OnDestroy, ViewChild } from '@angular/core';
import { Subscription } from 'rxjs';
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
import { ConfirmationService } from 'primeng/api';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { Dialog } from 'primeng/dialog';
import { TextareaModule } from 'primeng/textarea';
import { NotificacionesService } from '../../../../services/notificaciones.service';
import { NotasVentaComponent } from "../notas-venta/notas-venta.component";
import { NotaCreditoXComponent } from "../nota-credito-x/nota-credito-x.component";
import { NotaDebitoXComponent } from "../nota-debito-x/nota-debito-x.component";
import { FilesService } from '../../../../services/files.service';
import { EncabezadoSeccionComponent } from '../../../compartidos/encabezado-seccion/encabezado-seccion.component';
import { ESTADO_VENTA, ID_PROCESO, puedeDarseDeBaja, puedeEditarseVenta, saldoDisponibleNotaFiscal, saldoDisponibleNotaInterna, TipoNotaCredito } from '../models/venta.constants';
import { PrepararPreciosVenta } from '../../../../services/helpers/precios-venta.helper';

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
    EncabezadoSeccionComponent
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
  primeraCarga = true;
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

  // Estado que filtra el toggle "Solo pendientes de control" (la NE sin controlar). Antes había
  // un selector con todos los estados, pero mezclaba los de Presupuesto/Pedido/Nota de Empaque
  // (Aprobado/Aprobada, Asociado/Asociada...) y no se entendía; el backend sigue aceptando
  // cualquier estado en FiltroVenta.estado.
  private readonly ESTADO_PENDIENTE_CONTROL = ESTADO_VENTA.PENDIENTE;

  // El acceso rápido (badge/Ver pendientes) llega por query params. Una vez aplicados se sacan
  // de la URL; esa limpieza hace emitir de nuevo a queryParams y esta bandera evita que esa
  // emisión se tome como "cambio de pantalla" (limpiaría el filtro recién aplicado). Sin sacar
  // los parámetros, volver a tocar "Ver pendientes" después de Limpiar navegaba a la MISMA URL y
  // Angular lo ignoraba (el filtro no se aplicaba).
  private ignorarProximaEmisionDeParametros = false;

  // Notas de Empaque pendientes de control (oct-2026), para el cartel de arriba. Ver
  // NotasEmpaquePendientesService.
  pendientes: ResumenNotasEmpaque = { total: 0, atrasadas: 0 };
  private subs = new Subscription();
  @ViewChild('op') op!: Popover;
  @ViewChild('notas') notas!: Popover;
  @ViewChild('tipoNC') tipoNC!: Popover;


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
      soloPendientes: new FormControl(false),
      fechas: new FormControl(),
      fechasEntrega: new FormControl(),
      cliente: new FormControl()
    })
  }

  ngOnInit() {
    this.subs.add(this.pendientesService.resumen$.subscribe(r => this.pendientes = r));

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
        // El filtro de proceso necesita la lista de procesos ya cargada (el select trabaja con
        // el objeto), así que la búsqueda se hace UNA sola vez cuando llegan, en vez de
        // buscar sin filtros primero.
        this.filtros.reset();
        this.filtros.patchValue({ soloPendientes: estadoRapido === this.ESTADO_PENDIENTE_CONTROL });
        this.ObtenerProcesosVenta(() => {
          const proceso = this.procesos.find(p => p.id === idProcesoRapido);
          if (proceso) this.filtros.patchValue({ proceso });
          this.Buscar();
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
        this.LimpiarFiltros();
        this.ObtenerProcesosVenta();
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

  ObtenerProcesosVenta(alCargar?: () => void){
    this.miscService.ObtenerProcesosVenta(this.tipo)
      .subscribe(response => {
        this.procesos = response;
        alCargar?.();
      });
  }

  Buscar(event?: TableLazyLoadEvent, busqueda?: string, recargaConFiltro: boolean = false) {
    if (this.primeraCarga) {
      this.primeraCarga = false;
      return; // ignora la carga automática
   }
   
    this.loading = true;

    const pageIndex = (event?.first ?? 0) / (event?.rows ?? 10); 
    const pageSize = event?.rows ?? 10;

    if (!recargaConFiltro) {
      this.filtroActual = new FiltroVenta({
        pagina: pageIndex + 1,  
        tamanioPagina: pageSize,
        busqueda: busqueda,
        tipo: this.tipo,
        idProceso: this.filtros.value.proceso?.id ?? 0,
        nroProceso: this.filtros.value.nroProceso,
        estado: this.filtros.value.soloPendientes ? this.ESTADO_PENDIENTE_CONTROL : '',
        fechas: this.filtros.value.fechas,
        fechasEntrega: this.filtros.value.fechasEntrega,
        cliente: this.filtros.value.cliente?.id ?? 0
      });
    }

    this.ventasService.ObtenerVentas(this.filtroActual).subscribe(response => {
      this.ventas = response.registros;
      this.totalRecords = response.total;
      this.loading = false;
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
      nroProceso: this.filtros.value.nroProceso,
      estado: this.filtros.value.soloPendientes ? this.ESTADO_PENDIENTE_CONTROL : '',
      fechas: fechasCompletas ? fechas : null,
      // Mismo filtro que el listado: sin esto el export no coincidía con lo que se ve en pantalla.
      fechasEntrega: this.filtros.value.fechasEntrega,
      cliente: this.filtros.value.cliente?.id ?? 0
    });

    const descarga$ = esPre
      ? this.filesService.DescargarPreFacturacionExcel(this.filtroActual)
      : this.filesService.DescargarVentasExcel(this.filtroActual);

    descarga$.subscribe(blob => {
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');

      // Fecha en formato DD-MM-YY
      const fecha = new Date();
      const dd = String(fecha.getDate()).padStart(2, '0');
      const mm = String(fecha.getMonth() + 1).padStart(2, '0'); // Meses empiezan en 0
      const yy = String(fecha.getFullYear()).slice(-2); // últimos 2 dígitos del año

      const nombreArchivo = `${esPre ? 'PreFacturacion' : 'Ventas'}_${dd}-${mm}-${yy}.xlsx`;

      a.href = url;
      a.download = nombreArchivo; 
      a.click();
      window.URL.revokeObjectURL(url);
    });
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
  ElegirTipoNotaCredito(event: Event, venta: Venta) {
    this.ventaSeleccionada = venta;
    this.tipoNC.toggle(event);
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

    if (value === 'aprobada' || value === 'aprobado') {
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

  LimpiarFiltros(){
    this.filtros.reset();
    this.Buscar();
  }

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
