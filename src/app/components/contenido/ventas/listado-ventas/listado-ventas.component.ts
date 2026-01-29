import { Component, ViewChild } from '@angular/core';
import { Venta } from '../../../../models/Factura';
import { FiltroGral } from '../../../../models/filtros/FiltroGral';
import { VentasService } from '../../../../services/ventas.service';
import { TableLazyLoadEvent, TableModule } from 'primeng/table';
import { Button } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';
import { ActivatedRoute, Router } from '@angular/router';
import { DecimalFormatPipe } from '../../../../pipes/decimal-format.pipe';
import { DatePipe } from '@angular/common';
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
import { SplitButtonModule } from 'primeng/splitbutton';
import { Popover, PopoverModule } from 'primeng/popover';
import { FacturaService } from '../../../../services/factura.service';
import { ConfirmationService } from 'primeng/api';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { NotificacionesService } from '../../../../services/notificaciones.service';

@Component({
  selector: 'app-listado-ventas.component',
  standalone: true,
  imports: [
    ...FORMS_IMPORTS,
    ConfirmDialogModule,
    TableModule,
    Button,
    TooltipModule,
    DecimalFormatPipe,
    DatePipe,
    TagModule,
    DatePicker,
    VistaPreviaComponent,
    SplitButtonModule,
    PopoverModule
  ],
  templateUrl: './listado-ventas.component.html',
  styleUrl: './listado-ventas.component.scss',
  providers: [ConfirmationService],
})
export class ListadoVentasComponent {
  ventas: Venta[] = [];
  totalRecords: number = 0;
  loading: boolean = false;
  filtroActual!: FiltroGral;
  tipo: 'factura' | 'pre' = 'factura';
  primeraCarga = true;
  detalleVisible: boolean = false;
  ventaSeleccionada:Venta = new Venta();
  
  filtros:FormGroup;
  clientes:Cliente[]=[];
  clientesFiltrados:Cliente[]=[];
  procesos:ProcesoVenta[] = [];
  @ViewChild('op') op!: Popover;


  constructor(
    private ventasService:VentasService,
    private router:Router,
    private rutaActiva: ActivatedRoute,
    private miscService: MiscService,
    private clientesService:ClientesService,
    private comprobanteService:ComprobanteService,
    private facturaService:FacturaService,
    private confirmationService: ConfirmationService,
    private Notificaciones: NotificacionesService
  ){
    this.filtros = new FormGroup({
      proceso: new FormControl(),
      nroProceso: new FormControl(),
      fechas: new FormControl(),
      cliente: new FormControl()
    })
  }

  ngOnInit() {
    this.rutaActiva.queryParams.subscribe(params => {
      this.tipo = params['tipo'] ?? 'factura';
      this.LimpiarFiltros();
      this.ObtenerProcesosVenta();
      this.ObtenerClientes();

      this.Buscar();
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
        cliente: this.filtros.value.cliente?.id ?? 0
      });
    }

    this.ventasService.ObtenerVentas(this.filtroActual).subscribe(response => {
      this.ventas = response.registros;
      this.totalRecords = response.total;
      this.loading = false;
    });
  }

  Editar(id:number){
    this.router.navigate(
      ['/ventas/administrar', id],
      { queryParams: { tipo: this.tipo} }
    );
  }

  ElegirComprobante(venta:Venta){
    this.op.toggle(event);
    this.ventaSeleccionada = venta;
  }

  VerComprobante(){
    this.comprobanteService.VerComprobante(this.ventaSeleccionada)
  }

  VerFactura(){
    this.facturaService.VerFactura(this.ventaSeleccionada)
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
      const nombre = c.nombre!.toLowerCase();
      const dni = c.documento!.toString(); 
      return nombre.includes(query) || dni.includes(query);
    });
  }

  LimpiarFiltros(){
    this.filtros.reset();
    this.Buscar();
  }

}
