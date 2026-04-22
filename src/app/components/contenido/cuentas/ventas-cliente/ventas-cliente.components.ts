import { DatePipe } from '@angular/common';
import { Component, ViewChild } from '@angular/core';
import { Button } from 'primeng/button';
import { TableLazyLoadEvent, TableModule } from 'primeng/table';
import { TooltipModule } from 'primeng/tooltip';
import { DecimalFormatPipe } from '../../../../pipes/decimal-format.pipe';
import { Venta, VentasClienteCuenta } from '../../../../models/Factura';
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
import { FiltroVentasCliente } from '../../../../models/filtros/FiltroClientes';
import { TagModule } from 'primeng/tag';
import { TipoComprobante } from '../../../../models/ObjFacturar';
import { CuentaCorrienteReporteService } from '../../../../services/cuenta-corriente.reporte.service';
import { Popover, PopoverModule } from 'primeng/popover';
import { ComprobanteService } from '../../../../services/comprobante.service';
import { FacturaService } from '../../../../services/factura.service';
import { ReciboReporteService } from '../../../../services/recibo.service';
import { EstadisticaClientes } from "../../clientes/estadistica-clientes/estadistica-clientes.component";
import { Dialog } from 'primeng/dialog';

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
    SelectButtonModule,
    DatePicker,
    RadioButtonModule,
    EntregaDineroComponent,
    TagModule,
    PopoverModule,
    EstadisticaClientes,
    Dialog
],
  templateUrl: './ventas-cliente.components.html',
  styleUrl: './ventas-cliente.components.scss',
})
export class VentasClienteComponent {
  totalSaldo:number = 0;
  decimal_mask:any;
  estadisticasVisible: boolean = false;
  entregaVisible: boolean = false;

  ventas: VentasClienteCuenta[] = [];
  totalRecords: number = 0;
  loading: boolean = false;
  idCliente:number = 0;
  cliente:string = "";
  ventaSeleccionada:Venta = new Venta();
  desdeVenta: boolean = false;

  filtros:FormGroup;
  primeraCarga = true;

  @ViewChild('op') op!: Popover;

  mostrarObs: boolean = false;
  observacionSeleccionada: string = '';

  estados = [
    "A FAVOR", "PAGADA", "DEUDA"
  ]

  procesos = [
    "COTIZACION", "FACTURA", "NOTA DE CREDITO", "RECIBO"
  ]

  constructor(
    private rutaActiva:ActivatedRoute,
    private miscService:MiscService,
    private location: Location,
    private cuentasService:CuentasCorrientesService,
    private ventasService:VentasService,
    private reporteService:CuentaCorrienteReporteService,
    private comprobanteService:ComprobanteService,
    private facturaService:FacturaService,
    private reciboService:ReciboReporteService
  ){
    this.filtros = new FormGroup({
      estado: new FormControl(),
      proceso: new FormControl(),
      fechas: new FormControl(),
    })
  }

  ngAfterViewInit(){
    //this.ObtenerProcesosVenta();
    
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

      this.ObtenerSaldoCliente();
      this.Buscar();
    },10);
  }

  ObtenerSaldoCliente(){
    this.cuentasService.ObtenerSaldoTotalCliente(this.idCliente)
      .subscribe(response => {
        this.totalSaldo = response;
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

    const filtroActual = new FiltroVentasCliente({
      pagina: pageIndex + 1,  
      tamanioPagina: pageSize,
      cliente: this.idCliente,
      proceso: this.filtros.value.proceso ?? '',
      fechas: this.filtros.value.fechas,
      estado: this.filtros.value.estado
    });

    this.cuentasService.ObtenerVentasCliente(filtroActual).subscribe(response => {
      this.ventas = response.registros;
      this.totalRecords = response.total;
      this.loading = false;
    });
  }

  LimpiarFiltros(){
    this.filtros.reset();
    this.Buscar();
  }

  // ObtenerVenta(idVenta:number){
  //   this.ventasService.ObtenerVenta(idVenta)
  //     .subscribe(response => {
  //       this.ventaSeleccionada = response;
  //       this.PrepararPrecios();
  //       this.detalleVisible = true;
  //     });
  // }

  ImprimirRegistro(event, id:number, tipo:string){
    if(tipo == "RECIBO")
      this.VerRecibo(id);
    else{
      this.ElegirComprobante(event, id);
    }
  }

  ElegirComprobante(event, idVenta:number){
    this.ventasService.ObtenerVenta(idVenta)
      .subscribe(response => {
        this.ventaSeleccionada = response;
        this.op.toggle(event);
    });
  }
  VerComprobante(){
    this.comprobanteService.VerComprobante(this.ventaSeleccionada)
  }
  VerFactura(){
    this.PrepararPrecios();
    this.facturaService.VerFactura(this.ventaSeleccionada)
  }
  VerRecibo(idRecibo:number){
    this.cuentasService.ObtenerRecibo(idRecibo)
      .subscribe(response => {
        this.reciboService.VerReporte(response)
    });
  }
  VerObservaciones(obs:string) {
    this.observacionSeleccionada = obs;
    this.mostrarObs = true;
  }

  Cerrar(){
    this.location.back();
  }

  onRecargar(recargar: boolean) {
    if (recargar) {
      this.Buscar();
      this.ObtenerSaldoCliente();
    }
  }

  EntregaVenta(idVenta){
    this.ventasService.ObtenerVentaCuenta(idVenta)
      .subscribe(response => {
        this.ventaSeleccionada = response;
        this.desdeVenta = true;
        this.entregaVisible = true;
    });
  }
  Entrega(){
    this.desdeVenta = false;
    this.entregaVisible = true;
  }

  ImprimirReporte(){
    const fechas = this.filtros.value.fechas;
    const proceso = this.filtros.value.proceso;

    const formatDate = (d: Date) => {
      if (!d) return null;

      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();

      return `${day}-${month}-${year}`;
    };

    const filtroActual = new FiltroVentasCliente({
      pagina: 1,  
      tamanioPagina: 1,
      cliente: this.idCliente,
      proceso: proceso,
      fechas: fechas,
      estado: this.filtros.value.estado
    });

    this.cuentasService.ObtenerVentasClienteReporte(filtroActual).subscribe(response => {
      this.reporteService.VerReporte({
          codCliente: this.idCliente.toString(),
          cliente: this.cliente,
          saldo: this.totalSaldo,
          fechaDesde: fechas?.[0] ? formatDate(fechas[0]) : null,
          fechaHasta: fechas?.[1] ? formatDate(fechas[1]) : null,
          proceso: proceso || null,
          movimientos: response 
      });
    });
  }

  GetSeverity(estado: string): 'info' | 'warn' | 'success' {
    const value = estado.toLowerCase();

    if (value === 'pagada') {return 'info';}
    if (value === 'con deuda') {return 'warn';}
    if (value === 'a favor') {return 'success';}

    return 'info';
  }

  PrepararPrecios(){
    const esTipoA = [
      TipoComprobante.FACTURA_A,
      TipoComprobante.NC_A,
      TipoComprobante.ND_A
    ].includes(this.ventaSeleccionada.idTipoComprobante!);

    this.ventaSeleccionada.productos.forEach(producto => {
      const unitario = Number(producto.unitario) || 0; // Precio con iva
      const cantidad = Number(producto.cantidad) || 0;

      let precioNeto = 0; // Precio neto
      if(esTipoA)
        precioNeto = unitario / 1.21;
      else
        precioNeto = unitario;

      producto.precioMostrar = precioNeto;
      let totalNeto = precioNeto * cantidad;
      producto.total = totalNeto;

      // Porcentaje del descuento
      const descuentoAplicado = Math.min(this.ventaSeleccionada.descuento, producto.topeDescuento ?? 100);
      producto.descuentoAplicado = descuentoAplicado;

      // Importe del descuento
      const importeDescuento = totalNeto * (descuentoAplicado / 100);
      producto.importeDescuento = importeDescuento;

      // Total bruto del item
      const totalFinalNeto = totalNeto - importeDescuento;
      producto.totalMostrar = totalFinalNeto ;

      producto.stockInicial = Object.fromEntries(
        Object.entries(producto)
          .filter(([key]) => /^t\d+$/.test(key))
      );
    });
  }
}
