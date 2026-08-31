import { Component, ViewChild } from '@angular/core';
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
import { puedeDarseDeBaja, tieneNotaFiscal, tieneNotaInterna, TipoNotaCredito } from '../models/venta.constants';
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
export class ListadoVentasComponent {
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
    private filesService:FilesService
  ){
    this.filtros = new FormGroup({
      proceso: new FormControl(),
      nroProceso: new FormControl(),
      fechas: new FormControl(),
      fechasEntrega: new FormControl(),
      cliente: new FormControl()
    })
  }

  ngOnInit() {
    this.rutaActiva.queryParams.subscribe(params => {
      this.tipo = params['tipo'] ?? 'factura';
      this.LimpiarFiltros();
      this.ObtenerProcesosVenta();
      this.ObtenerClientes();
    });
  }

  ObtenerProcesosVenta(){
    this.miscService.ObtenerProcesosVenta(this.tipo)
      .subscribe(response => {
        this.procesos = response;
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
    if(!fechas || fechas.length !== 2 || !fechas[0] || !fechas[1]){
      this.Notificaciones.Warn("Debe seleccionar un rango de fechas completo (desde y hasta).");
      return;
    }

    this.filtroActual = new FiltroVenta({
      tipo: this.tipo,
      idProceso: this.filtros.value.proceso?.id ?? 0,
      nroProceso: this.filtros.value.nroProceso,
      fechas: this.filtros.value.fechas,
      cliente: this.filtros.value.cliente?.id ?? 0
    });

    this.filesService.DescargarVentasExcel(this.filtroActual).subscribe(blob => {
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');

      // Fecha en formato DD-MM-YY
      const fecha = new Date();
      const dd = String(fecha.getDate()).padStart(2, '0');
      const mm = String(fecha.getMonth() + 1).padStart(2, '0'); // Meses empiezan en 0
      const yy = String(fecha.getFullYear()).slice(-2); // últimos 2 dígitos del año

      const nombreArchivo = `Ventas_${dd}-${mm}-${yy}.xlsx`;

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

  TieneNotaFiscal(venta: Venta): boolean {
    return tieneNotaFiscal(venta.notas);
  }

  TieneNotaInterna(venta: Venta): boolean {
    return tieneNotaInterna(venta.notas);
  }

  EmitirNotaCredito(tipo: TipoNotaCredito){
    this.tipoNota = 'Crédito';
    this.tipoNotaCreditoElegida = tipo;
    this.PrepararPrecios();
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
  // - ver precios-venta.helper.ts.
  PrepararPrecios(){
    PrepararPreciosVenta(this.ventaSeleccionada);
  }
}
