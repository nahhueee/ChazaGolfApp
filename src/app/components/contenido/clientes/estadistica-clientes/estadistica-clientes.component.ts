import { Component, ViewChild } from '@angular/core';
import { Venta } from '../../../../models/Factura';
import { ProcesoVenta } from '../../../../models/ProcesoVenta';
import { ActivatedRoute } from '@angular/router';
import { TableLazyLoadEvent, TableModule } from 'primeng/table';
import { FiltroVenta } from '../../../../models/filtros/FiltroVenta';
import { FormControl, FormGroup } from '@angular/forms';
import { VentasService } from '../../../../services/ventas.service';
import { MiscService } from '../../../../services/misc.service';
import { DatePipe, Location } from '@angular/common';
import { DatePicker } from 'primeng/datepicker';
import { VistaPreviaComponent } from '../../ventas/vista-previa/vista-previa.component';
import { DecimalFormatPipe } from '../../../../pipes/decimal-format.pipe';
import { TooltipModule } from 'primeng/tooltip';
import { Button } from 'primeng/button';
import { FORMS_IMPORTS } from '../../../../imports/forms.import';
import { Tag } from 'primeng/tag';
import { EstadisticasService } from '../../../../services/estadistica.service';
import {
  NgApexchartsModule,
  ApexChart,
  ApexAxisChartSeries,
  ApexXAxis,
  ApexPlotOptions,
  ApexDataLabels,
  ApexTitleSubtitle,
  ApexYAxis,
  ApexLegend,
  ApexTooltip,
  ApexTheme,
  ApexGrid,
  ApexStroke,
  ChartComponent,
} from "ng-apexcharts";
import { TemaService } from '../../../../services/tema.service';
import { Subscription } from 'rxjs';

export type ChartOptions = {
  series: ApexAxisChartSeries;
  chart: ApexChart;
  xaxis: ApexXAxis;
  plotOptions: ApexPlotOptions;
  dataLabels: ApexDataLabels;
  colors: string[];
  title: ApexTitleSubtitle;
  yaxis: ApexYAxis | ApexYAxis[];
  legend: ApexLegend;
  tooltip: ApexTooltip;
  theme: ApexTheme;
  grid: ApexGrid;
  stroke: ApexStroke,
  labels: string[];
};

const aliasMetodos: any = {
  'CONTADO': 'Contado',
  'TARJETA CREDITO': 'Crédito',
  'TARJETA DEBITO': 'Débito',
  'MERCADO PAGO': 'MP'
};

@Component({
  selector: 'app-estadistica-clientes',
  standalone: true,
  imports: [
    FORMS_IMPORTS,
    TableModule,
    Button,
    TooltipModule,
    DatePipe,
    DecimalFormatPipe,
    VistaPreviaComponent,
    DatePicker,
    Tag,
    NgApexchartsModule
  ],
  templateUrl: './estadistica-clientes.component.html',
  styleUrl: './estadistica-clientes.component.scss',
})
export class EstadisticaClientes {
  detalleVisible: boolean = false;

  ventas: Venta[] = [];
  totalRecords: number = 0;
  loading: boolean = false;
  idCliente:number = 0;
  cliente:string = "";
  ventaSeleccionada:Venta = new Venta();
  procesos:ProcesoVenta[] = [];
  primeraCarga = true;
  filtros:FormGroup;
  esDark:boolean;
  sub!: Subscription;
  

  //Dashboard
  cantidad_impagas: number = 0;
  cantidad_pagas: number = 0;
  cantidad_total_ventas: number = 0;
  deuda_total: number = 0;
  total_cobrado: number = 0;
  total_facturado: number = 0;
  total_ventas_impagas: number = 0;
  total_ventas_pagas: number = 0;

  //Charts
  grafTipoPagoReady:boolean;
  public chartTiposPagoOptions?: Partial<ChartOptions>;
  @ViewChild("chartTiposPago") chartTiposPago!: ChartComponent;

  grafComprobantesReady:boolean;
  public chartComprobantesOptions?: Partial<ChartOptions>;
  @ViewChild("chartComprobantes") chartComprobantes!: ChartComponent;

  grafProcesosReady:boolean;
  public chartProcesosOptions?: Partial<ChartOptions>;
  @ViewChild("chartProcesos") chartProcesos!: ChartComponent;

  constructor(
    private rutaActiva:ActivatedRoute,
    private ventasService:VentasService,
    private miscService:MiscService,
    private estadisticasService:EstadisticasService,
    private location: Location,
    private temaService:TemaService
  ){
    this.esDark = localStorage.getItem('theme') === 'dark';
    this.filtros = new FormGroup({
      proceso: new FormControl(),
      fechas: new FormControl(),
    })
  }

  ngOnInit(): void {
    this.sub = this.temaService.theme$.subscribe(theme => {
      this.esDark = theme === 'dark';
      if (this.chartTiposPago) {
        this.chartTiposPago.updateOptions({
          theme: {
            mode: this.esDark ? "dark" : "light"
          },
          stroke: {
            colors: [this.esDark ? "#ffffff" : "#383838"]
          },
          title: {
            style: {
              color: this.esDark ? "#ffffff99" : "#00000099"
            }
          }
        }, true, true);
      }
      if (this.chartComprobantes) {
        this.chartComprobantes.updateOptions({
          theme: {
            mode: this.esDark ? "dark" : "light"
          },
          stroke: {
            colors: [this.esDark ? "#ffffff" : "#383838"]
          },
          tooltip: {
            theme: this.esDark ? "dark" : "light"
          },
          title: {
            style: {
              color: this.esDark ? "#ffffff99" : "#00000099"
            }
          }
        }, true, true);
      }
      if (this.chartComprobantes) {
        this.chartProcesos.updateOptions({
          theme: {
            mode: this.esDark ? "dark" : "light"
          },
          stroke: {
            colors: [this.esDark ? "#ffffff" : "#383838"]
          },
          title: {
            style: {
              color: this.esDark ? "#ffffff99" : "#00000099"
            }
          }
        }, true, true);
      }
    });
  }

  ngOnDestroy(): void {
    this.sub.unsubscribe();
  }

  ngAfterViewInit(){
    this.ObtenerProcesosVenta();

    setTimeout(() => {
      this.rutaActiva.paramMap.subscribe(params => {
        this.idCliente = Number(params.get('idCliente'));
        this.cliente = params.get('cliente')!;
      });

      this.ObtenerDatos();
    },10);
  }

  ObtenerDatos(){
    this.Buscar();
    this.ObtenerTotalesVenta();
    this.ObtenerTotalesPorMetodoPago();
    this.ObtenerTotalesPorComprobante();
    this.ObtenerTotalesPorProceso();
  }

  Filtrar(){
    this.ObtenerDatos();
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
      impagas: 0,
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
    this.ObtenerDatos();
  }

  ObtenerProcesosVenta(){
    this.miscService.ObtenerProcesosVenta('factura')
      .subscribe(response => {
        this.procesos = response;
      });
  }

  ObtenerTotalesVenta(){
    const filtro = {
      idCliente: this.idCliente,
      fechas: this.filtros.value.fechas,
      idProceso: this.filtros.value.proceso?.id
    }

    this.estadisticasService.ObtenerTotalesVenta(filtro)
      .subscribe(response => {
        this.cantidad_impagas = response.cantidad_impagas ?? 0;
        this.cantidad_pagas = response.cantidad_pagas ?? 0;
        this.cantidad_total_ventas = response.cantidad_total_ventas ?? 0;

        this.deuda_total = response.deuda_total ?? 0;
        this.total_cobrado = response.total_cobrado ?? 0;
        this.total_facturado = response.total_facturado ?? 0;

        this.total_ventas_impagas = response.total_ventas_impagas ?? 0;
        this.total_ventas_pagas = response.total_ventas_pagas ?? 0;
      });
  }

  ObtenerTotalesPorMetodoPago(){
    const filtro = {
      idCliente: this.idCliente,
      fechas: this.filtros.value.fechas,
      idProceso: this.filtros.value.proceso?.id
    }

    this.estadisticasService.ObtenerTotalesPorMetodoPago(filtro)
      .subscribe(response => {

        this.GenerarGraficoTiposPago(response);
        this.grafTipoPagoReady = true;
      });
  }

  ObtenerTotalesPorComprobante(){
    const filtro = {
      idCliente: this.idCliente,
      fechas: this.filtros.value.fechas,
      idProceso: this.filtros.value.proceso?.id
    }

    this.estadisticasService.ObtenerTotalesPorComprobante(filtro)
      .subscribe(response => {
        this.GenerarGraficoComprobantes(response);
        this.grafComprobantesReady = true;
      });
  }
  
  ObtenerTotalesPorProceso(){
    const filtro = {
      idCliente: this.idCliente,
      fechas: this.filtros.value.fechas,
      idProceso: this.filtros.value.proceso?.id
    }

    this.estadisticasService.ObtenerTotalesPorProceso(filtro)
      .subscribe(response => {
        this.GenerarGraficoProcesos(response);
        this.grafProcesosReady = true;
      });
  }

  Cerrar(){
    this.location.back();
  }


  GenerarGraficoTiposPago(data:any){
    const labels: string[] = [];
    const totales: number[] = [];
    const cantidades: number[] = [];

    data.forEach(item => {
      const nombreCorto = aliasMetodos[item.descripcion] || item.descripcion;

      labels.push(nombreCorto);
      totales.push(Number(item.total_por_metodo));
      cantidades.push(Number(item.cantidad_ventas));
    });

    this.chartTiposPagoOptions = {
      series: [
        {
          name: "Totales",
          type: "column",
          data: totales
        },
        {
          name: "Cantidad",
          type: "line",
          data: cantidades
        }
      ],
      chart: {
        height: 280,
        type: "line",
        toolbar: {
          show: false
        },
        background: "transparent",
        zoom: {
          enabled: false
        },
      },
      stroke: {
        width: [0, 4],
        colors: [this.esDark ? "#ffffffff" : "#383838ff"]
      },
      title: {
        text: "VENTAS POR TIPO DE PAGO",
        align: 'center',
        margin: 30,
        style: {
          fontWeight: '300',
          fontSize:  '15px',
          fontFamily:  'Poppins',
          color: this.esDark ? "#ffffff99" : "#00000099"
        },
      },
      dataLabels: {
        enabled: true,
        enabledOnSeries: [1]
      },
      labels: labels,
      yaxis: [
        {
          title: {
            text: "Totales"
          }
        },
        {
          opposite: true,
          title: {
            text: "Cantidad"
          }
        }
      ],
      theme: {
        mode: this.esDark ? "dark" : "light", 
      },
      colors: [
        '#4F46E5', 
        '#22C55E', 
        '#F59E0B', 
        '#EF4444', 
        '#06B6D4', 
        '#A855F7', 
        '#84CC16',
        '#F97316'  
      ],
      tooltip: {
        y: {
          formatter: (val, opts) => {
            // opts.seriesIndex = índice de la serie (0 = Totales, 1 = Cantidad)
            if (opts.seriesIndex === 0) {
              return '$' + val.toLocaleString('es-AR', { minimumFractionDigits: 2 });
            }
            return val.toString(); 
          }
        }
      }
    };
  }

  GenerarGraficoComprobantes(datos:any){
    const series = datos.map(d => Number(d.total_ventas));
    const labels = datos.map(d => d.tipo_comprobante);

    this.chartComprobantesOptions = {
      series: series,
      chart: {
        type: "pie",
        background: 'transparent',
        height: 270,
        toolbar: {
          show: false
        }
      },
      labels: labels,
      theme: {
        mode: this.esDark ? "dark" : "light", 
      },
      title: {
        text: "VENTAS POR TIPO DE COMPROBANTE",
        align:'center',
        style: {
          fontWeight: '300',
          fontSize:  '14px',
          fontFamily:  'Poppins',
          color: this.esDark ? "#ffffff99" : "#00000099"
        },
      },
      plotOptions: {
        pie: {
          offsetY: 20,
          dataLabels: {
            offset: -18  
          }
        }
      },
      stroke: {
        show: false,
        width: 0,
        colors: ['transparent']
      },
      legend: {
        position: 'bottom',
        horizontalAlign: 'center',
        offsetY: 25
      },
      colors: [
        '#4F46E5', 
        '#22C55E', 
        '#F59E0B', 
        '#EF4444', 
        '#06B6D4', 
        '#A855F7', 
        '#84CC16',
        '#F97316'  
      ],
    };
  }

  GenerarGraficoProcesos(datos:any){
    datos.sort((a, b) => b.monto_total - a.monto_total);

    const labels: string[] = [];
    const seriePagas: number[] = [];
    const serieImpagas: number[] = [];

    datos.forEach(x => {
      labels.push(x.proceso);
      seriePagas.push(x.monto_pagas);
      serieImpagas.push(x.monto_impagas);
    });

    this.chartProcesosOptions = {
      series: [
        {
          name: 'Pagas',
          data: seriePagas
        },
        {
          name: 'Impagas',
          data: serieImpagas
        }
      ],
      chart: {
        type: 'bar',
        stacked: true,
        background: 'transparent',
        height: 280,
        toolbar: {
          show: false
        }
      },
      title: {
        text: "VENTAS POR PROCESO",
        align:'center',
        margin: 30,
        style: {
          fontWeight: '300',
          fontSize:  '14px',
          fontFamily:  'Poppins',
          color: this.esDark ? "#ffffff99" : "#00000099"
        },
      },
      plotOptions: {
        bar: {
          horizontal: false,
          columnWidth: '80%'
        }
      },
      labels: labels,
      tooltip: {
        shared: true,
        intersect: false,
        y: [
          {
            formatter: (val) =>
              '$' + Number(val).toLocaleString('es-AR', { minimumFractionDigits: 2 })
          },
          {
            formatter: (val) =>
              '$' + Number(val).toLocaleString('es-AR', { minimumFractionDigits: 2 })
          }
        ]
      },
      theme: {
        mode: this.esDark ? "dark" : "light", 
      },
      yaxis: {
        title: {
          text: 'Monto'
        }
      },
      colors: ['#22c55e', '#ef4444'],
      dataLabels: {
        enabled: true,
        formatter: (val) => {
          return '$' + val.toLocaleString('es-AR', { minimumFractionDigits: 0 });
        },
        style: {
          fontSize: '11px',
        }
      },

    };

  }
}
