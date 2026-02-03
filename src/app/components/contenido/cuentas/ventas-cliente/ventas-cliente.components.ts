import { DatePipe } from '@angular/common';
import { Component } from '@angular/core';
import { Button } from 'primeng/button';
import { TableLazyLoadEvent, TableModule } from 'primeng/table';
import { TooltipModule } from 'primeng/tooltip';
import { DecimalFormatPipe } from '../../../../pipes/decimal-format.pipe';
import { Venta } from '../../../../models/Factura';
import { FiltroVenta } from '../../../../models/filtros/FiltroVenta';
import { ActivatedRoute } from '@angular/router';
import { VentasService } from '../../../../services/ventas.service';
import { VistaPreviaComponent } from '../../ventas/vista-previa/vista-previa.component';
import { FormControl, FormGroup } from '@angular/forms';
import { FORMS_IMPORTS } from '../../../../imports/forms.import';
import { ProcesoVenta } from '../../../../models/ProcesoVenta';
import { SelectButtonModule } from 'primeng/selectbutton';
import { DatePicker } from 'primeng/datepicker';
import { MiscService } from '../../../../services/misc.service';
import { RadioButtonModule } from 'primeng/radiobutton';
import { Location } from '@angular/common';
import { EntregaDineroComponent } from '../entrega-dinero/entrega-dinero.component';
import { CuentasCorrientesService } from '../../../../services/cuentas-corriente.service';

@Component({
  selector: 'app-ventas-cliente',
  standalone: true,
  imports: [
    FORMS_IMPORTS,
    TableModule,
    Button,
    TooltipModule,
    DatePipe,
    DecimalFormatPipe,
    VistaPreviaComponent,
    SelectButtonModule,
    DatePicker,
    RadioButtonModule,
    EntregaDineroComponent
  ],
  templateUrl: './ventas-cliente.components.html',
  styleUrl: './ventas-cliente.components.scss',
})
export class VentasClienteComponent {
  totalDeuda:number = 0;
  decimal_mask:any;
  detalleVisible: boolean = false;
  entregaVisible: boolean = false;

  ventas: Venta[] = [];
  totalRecords: number = 0;
  loading: boolean = false;
  idCliente:number = 0;
  cliente:string = "";
  ventaSeleccionada:Venta = new Venta();
  procesos:ProcesoVenta[] = [];
  desdeVenta: boolean = false;

  filtros:FormGroup;
  primeraCarga = true;

  constructor(
    private rutaActiva:ActivatedRoute,
    private ventasService:VentasService,
    private miscService:MiscService,
    private location: Location,
    private cuentasService:CuentasCorrientesService
  ){
    this.filtros = new FormGroup({
      impagas: new FormControl(1),
      proceso: new FormControl(),
      fechas: new FormControl(),
    })
  }

  ngAfterViewInit(){
    this.ObtenerProcesosVenta();
    
    setTimeout(() => {
      //Configuracion para la mascara decimal Imask
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

      this.rutaActiva.paramMap.subscribe(params => {
        this.idCliente = Number(params.get('idCliente'));
        this.cliente = params.get('cliente')!;
      });

      this.ObtenerDeudaCliente();
      this.Buscar();
    },10);
  }

  ObtenerDeudaCliente(){
    this.cuentasService.ObtenerDeudaTotalCliente(this.idCliente)
      .subscribe(response => {
        this.totalDeuda = response;
      });
  }

  Buscar(event?: TableLazyLoadEvent) {
    if (this.primeraCarga) {
      this.primeraCarga = false;
      return; // ignora la carga automática
    }
      
    this.loading = true;

    const pageIndex = (event?.first ?? 0) / (event?.rows ?? 10); 
    const pageSize = event?.rows ?? 10;

    const filtroActual = new FiltroVenta({
      pagina: pageIndex + 1,  
      tamanioPagina: pageSize,
      tipo: "factura",
      cliente: this.idCliente,
      impagas: this.filtros.value.impagas,
      idProceso: this.filtros.value.proceso?.id ?? 0,
      fechas: this.filtros.value.fechas,
      desdeCuenta: true
    });

    this.ventasService.ObtenerVentas(filtroActual).subscribe(response => {
      this.ventas = response.registros;
      this.totalRecords = response.total;
      this.loading = false;
    });
  }

  LimpiarFiltros(){
    this.filtros.reset();
    this.filtros.get('impagas')?.setValue(1);
    this.Buscar();
  }

  ObtenerProcesosVenta(){
    this.miscService.ObtenerProcesosVenta('factura')
      .subscribe(response => {
        this.procesos = response;
      });
  }

  Cerrar(){
    this.location.back();
  }

  onRecargar(recargar: boolean) {
    if (recargar) {
      this.Buscar();
      this.ObtenerDeudaCliente();
    }
  }

  EntregaVenta(venta:Venta){
    this.ventaSeleccionada = venta;
    this.desdeVenta = true;
    this.entregaVisible = true;
  }
  Entrega(){
    this.desdeVenta = false;
    this.entregaVisible = true;
  }

}
