import { Component, OnInit } from '@angular/core';
import { FondosService } from '../../../../services/fondos.service';
import { FiltrosFondos } from '../../../../models/filtros/FiltroFondos';
import { CardResumenComponent } from '../card-resumen/card-resumen.component';
import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { TagModule } from 'primeng/tag';
import { DatePicker } from 'primeng/datepicker';
import { SelectModule } from 'primeng/select';
import { FloatLabel } from 'primeng/floatlabel';
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule } from "@angular/forms";
import { CardResumenFondoComponent } from '../card-resumen-fondo/card-resumen-fondo.component';
import { ChartModule } from 'primeng/chart';
import { CardModule } from 'primeng/card';
import { TableLazyLoadEvent, TableModule } from 'primeng/table';
import { DecimalFormatPipe } from '../../../../pipes/decimal-format.pipe';
import { UsuariosService } from '../../../../services/usuarios.service';
import { MovimientoFondo } from '../../../../models/Movimiento';
import { AddmodMovimientoManualComponent } from '../addmod-movimiento-manual/movimiento-manual-dialog.component';
import { Button } from 'primeng/button';
import { NotificacionesService } from '../../../../services/notificaciones.service';
import { Usuario } from '../../../../models/Usuario';

class CajaDashboard {
  id: number;
  nombre: string;
}

interface ResumenCaja {
  saldoTotal: number;
  ingresosDia: number;
  egresosDia: number;
  netoDia: number;
  cuentaCorrienteClientes: number;
  saldoFavorClientes: number;
}

class ResumenFondos {
  id: number;
  nombre: string;
  saldo: number;
  movimientos: number;
}

@Component({
  selector: 'app-main-fondos',
  standalone: true,
  imports: [
    CardResumenComponent,
    CardResumenFondoComponent,
    CommonModule,
    TagModule,
    DatePicker,
    SelectModule,
    FloatLabel,
    FormsModule,
    ReactiveFormsModule,
    ChartModule,
    CardModule,
    TableModule,
    DatePipe,
    DecimalFormatPipe,
    AddmodMovimientoManualComponent,
    Button
  ],
  templateUrl: './main-fondos.component.html',
  styleUrls: ['./main-fondos.component.scss']
})
export class MainFondosComponent implements OnInit {
  sesion:any;
  filtrosForm:FormGroup;
  filtros:FiltrosFondos = new FiltrosFondos();

  resumenCaja:ResumenCaja;
  resumenCajaCargado:boolean = false;

  resumenFondo:ResumenFondos[] = [];
  resumenFondoCargado:boolean = false;
  fondoSeleccionado:ResumenFondos = new ResumenFondos();

  cajas: CajaDashboard[] = [];
  cajaSeleccionada: CajaDashboard = new CajaDashboard();

  periodos = [
    { label: 'Hoy', value: 'hoy' },
    { label: 'Ayer', value: 'ayer' },
    { label: 'Últimos 7 días', value: '7dias' },
    { label: 'Últimos 30 días', value: '30dias' },
    { label: 'Personalizado', value: 'custom' }
  ];

  usuarios:Usuario[] = [];

  chartData: any;
  chartOptions: any;

  movimientos:MovimientoFondo[] = [];
  totalRecords: number = 0;
  loading: boolean = false;
  primeraCarga = true;

  tipoMovimientoModal: 'INGRESO' | 'EGRESO' | 'AJUSTE' = 'INGRESO';
  mostrarMovimientoModal = false;

  constructor(
    private fondosService:FondosService,
    private usuariosService:UsuariosService,
    private notificaciones:NotificacionesService,
    private usuarioService:UsuariosService
  ) { 
    this.filtrosForm = new FormGroup({
      caja: new FormControl(),
      usuario: new FormControl(),
      periodo: new FormControl(),
      fechas: new FormControl()
    })
    this.filtrosForm.get('periodo')?.setValue(this.periodos[0].value);
  }

  ngOnInit() {
    this.sesion = this.usuariosService.GetSesion().data;

    this.usuarioService.SelectorUsuarios()
      .subscribe(response => {
        this.usuarios = response;

        if (this.sesion.cargo !== 'ADMINISTRADOR') {
          this.filtrosForm.patchValue({
            usuario: this.sesion.usuario
          });
        } else {
          this.filtrosForm.patchValue({
            usuario: null
          });
        }

        this.inicializarFiltros();
        this.cargarDatos();
      });
  }

  cargarDatos() {
    this.obtenerCajas();
    this.obtenerResumen();
    this.obtenerResumenFondos();
    this.cargarMovimientos();
  }

  inicializarFiltros() {
    const rango = this.obtenerRangoFechas();

    this.filtros = {
      pagina: 1,
      tamanioPagina: 10,
      idCaja: this.filtrosForm.value.caja?.id,
      fechaDesde: rango?.desde,
      fechaHasta: rango?.hasta,
      usuario: this.filtrosForm.value.usuario || null
    };
  }

  onPeriodoChange() {
    const periodo = this.filtrosForm.get('periodo')?.value;

    if (periodo !== 'custom') {
      this.filtrosForm.patchValue({
        fechas: null
      });

      this.onFiltrosChange();
    }
  }

  private obtenerRangoFechas() {
    const periodo = this.filtrosForm.value.periodo;
    const hoy = new Date();

    switch (periodo) {
      case 'hoy':
        return { desde: hoy, hasta: hoy };

      case 'ayer':
        const ayer = new Date();
        ayer.setDate(hoy.getDate() - 1);
        return { desde: ayer, hasta: ayer };

      case '7dias':
        const siete = new Date();
        siete.setDate(hoy.getDate() - 7);
        return { desde: siete, hasta: hoy };

      case '30dias':
        const treinta = new Date();
        treinta.setDate(hoy.getDate() - 30);
        return { desde: treinta, hasta: hoy };

      case 'custom':
        const fechas = this.filtrosForm.value.fechas;
        return {
          desde: fechas?.[0],
          hasta: fechas?.[1]
        };

      default:
        return null;
    }
  }

  async onFiltrosChange() {
    this.inicializarFiltros();
    await this.obtenerResumen();
    await this.cargarMovimientos();
    this.obtenerResumenFondos();
  }
  obtenerCajas(){
    this.fondosService.ObtenerCajas()
    .subscribe(response => {
      this.cajas = response;
      this.cajaSeleccionada = this.cajas[0];
      this.filtrosForm.get('caja')?.setValue(this.cajaSeleccionada);
    });
  }
  obtenerResumen(){
    this.fondosService.ObtenerResumen(this.filtros)
    .subscribe(response => {
      this.resumenCaja = response;
      this.resumenCajaCargado = true;
    });
  }
  obtenerResumenFondos(){
    this.fondosService.ObtenerResumenFondos(this.filtros)
    .subscribe(response => {
      this.resumenFondo = response;
      this.resumenFondoCargado = true;
      
      this.generarGraficoFondos();
    });
  }

  seleccionarFondo(fondo: any) {
    if (this.fondoSeleccionado?.id === fondo.id) {

      this.fondoSeleccionado = new ResumenFondos();
      this.filtros.idFondo = undefined;

    } else {

      this.fondoSeleccionado = fondo;
      this.filtros.idFondo = fondo.id;
    }

    this.cargarMovimientos();
  }

  async cargarMovimientos(event?: TableLazyLoadEvent) {
    if (this.primeraCarga) {
      this.primeraCarga = false;
      return; // ignora la carga automática
    }

    this.loading = true;
    const pageIndex = (event?.first ?? 0) / (event?.rows ?? 10); 
    const pageSize = event?.rows ?? 10;

    this.filtros.pagina = pageIndex + 1;
    this.filtros.tamanioPagina = pageSize;

    this.fondosService.ObtenerMovimientos(this.filtros)
    .subscribe(response => {
      this.movimientos = response.registros;
      this.totalRecords = response.total;
      this.loading = false;
    });
  }

  generarGraficoFondos() {

  const fondosValidos = this.resumenFondo
    .filter(f => f.saldo > 0);

    this.chartData = {
      labels: fondosValidos.map(f => f.nombre),
      datasets: [
        {
          data: fondosValidos.map(f => f.saldo),

          backgroundColor: [
            '#22c55e',
            '#3b82f6',
            '#f59e0b',
            '#6366f1',
            '#14b8a6'
          ],

          borderWidth: 0,
          hoverOffset: 6
        }
      ]
    };

    this.chartOptions = {

      cutout: '60%',
      responsive: true,
      maintainAspectRatio: false,


      plugins: {

        legend: {
          position: 'right',

          labels: {
            color: getComputedStyle(document.documentElement)
              .getPropertyValue('--text-color'),

            usePointStyle: true,
            pointStyle: 'circle',
            padding: 18,

            font: {
              size: 13
            }
          }
        }
      }
    };
  }

  obtenerIconoFondo(nombre: string): string {
    if(nombre.includes('Efectivo')){
      return 'pi pi-wallet';
    }

    if(nombre.includes('Banco')){
      return 'pi pi-building-columns';
    }

    if(nombre.includes('Digital')){
      return 'pi pi-qrcode';
    }

    if(nombre.includes('Corriente')){
      return 'pi pi-user';
    }

    if(nombre.includes('Favor')){
      return 'pi pi-receipt';
    }

    return 'pi pi-money-bill';
  }

  obtenerSeverityTipo(tipo:string){
    switch(tipo){
      case 'INGRESO':
        return 'success';
      case 'EGRESO':
        return 'danger';
      default:
        return 'info';
    }

  }
  
  abrirMovimiento(tipo: 'INGRESO' | 'EGRESO' | 'AJUSTE') {
    this.tipoMovimientoModal = tipo;
    this.mostrarMovimientoModal = true;
  }

  insertarMovimientoManual(movimiento:MovimientoFondo){
    this.mostrarMovimientoModal = false;
    movimiento.usuario = this.sesion.usuario;
    movimiento.idCaja = this.cajaSeleccionada.id;

    this.fondosService.RegistrarMovimiento(movimiento)
    .subscribe(response => {
      if(response){
        this.notificaciones.Success("Movimiento registrado correctamente");
        this.obtenerResumen();
        this.cargarMovimientos();
        this.obtenerResumenFondos();
      }else{
        this.notificaciones.Error("Error al registrar el movimiento");
      }
    });
  }
}
