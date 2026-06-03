import { Component, OnInit } from '@angular/core';
import { FondosService } from '../../../../services/fondos.service';
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
import { ConfirmationService } from 'primeng/api';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { Usuario } from '../../../../models/Usuario';
import { TooltipModule } from 'primeng/tooltip';
import { AddTransferencia } from "../add-transferencia/add-transferencia.component";
import { Caja, DesglosePorEmpresa, DetalleMetodoPago, FiltrosFondos, ResumenCaja, ResumenFondo, TotalesValores, ValorPendiente } from '../../../../models/Fondos';
import { Dialog } from 'primeng/dialog';

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
    Button,
    TooltipModule,
    AddTransferencia,
    ConfirmDialogModule,
    Dialog
],
  templateUrl: './main-fondos.component.html',
  styleUrls: ['./main-fondos.component.scss']
})
export class MainFondosComponent implements OnInit {
  sesion: any;
  filtrosForm: FormGroup;
  filtros: FiltrosFondos = new FiltrosFondos();

  resumenCaja: ResumenCaja;
  resumenCajaCargado = false;

  resumenFondos: ResumenFondo[] = [];          
  resumenFondosCargado = false;                
  fondoSeleccionado: ResumenFondo | null = null;

  detalleMetodos: DetalleMetodoPago[] = [];    
  detalleMetodosCargado = false;
  desglosePorEmpresa: DesglosePorEmpresa[] = [];

  cajas: Caja[] = [];
  cajaSeleccionada: Caja = new Caja();

  periodos = [
    { label: 'Hoy',           value: 'hoy'    },
    { label: 'Ayer',          value: 'ayer'   },
    { label: 'Últimos 7 días', value: '7dias' },
    { label: 'Últimos 30 días', value: '30dias'},
    { label: 'Personalizado', value: 'custom' }
  ];

  usuarios: Usuario[] = [];
  movimientos: MovimientoFondo[] = [];
  totalRecords = 0;
  loading = false;
  primeraCarga = true;

  tipoMovimientoModal: 'INGRESO' | 'EGRESO' | 'AJUSTE' = 'INGRESO';
  mostrarMovimientoModal   = false;
  mostrarTransferenciaModal = false;

  // Valores a Recepcionar
  valoresPendientes: ValorPendiente[] = [];
  totalesValores: TotalesValores = {};
  valoresCargado = false;
  dialogAcreditarVisible = false;
  valorSeleccionado: ValorPendiente | null = null;
  fondoDestinoSeleccionado: ResumenFondo | null = null;
  fondosDisponibles: ResumenFondo[] = [];

  constructor(
    private fondosService:    FondosService,
    private usuariosService:  UsuariosService,
    private notificaciones:   NotificacionesService
  ) {
    this.filtrosForm = new FormGroup({
      caja:    new FormControl(),
      usuario: new FormControl(),
      periodo: new FormControl(),
      fechas:  new FormControl()
    });
    this.filtrosForm.get('periodo')?.setValue('hoy');
  }

  ngOnInit() {
    this.sesion = this.usuariosService.GetSesion().data;

    this.usuariosService.SelectorUsuarios().subscribe(response => {
      this.usuarios = [{ id: null, nombre: 'TODOS' }, ...response];

      this.filtrosForm.patchValue({
        usuario: this.sesion.cargo !== 'ADMINISTRADOR'
          ? this.sesion.usuario
          : null
      });

      this.fondosService.SelectorCajas().subscribe(response => {
        this.cajas = response;
        this.cajaSeleccionada = this.cajas[0];
        this.filtrosForm.get('caja')?.setValue(this.cajaSeleccionada);
        this.inicializarFiltros();
        this.cargarDatos();
      });
    });
  }

  // ── carga ────────────────────────────────────────────────────────────────────

  cargarDatos() {
    this.obtenerResumen();
    this.obtenerResumenFondos();
    this.cargarValoresPendientes();
  }

  obtenerResumen() {
    this.fondosService.ObtenerResumen(this.filtros)
      .subscribe(r => {
        this.resumenCaja = r;
        this.resumenCajaCargado = true;
      });
  }

  obtenerResumenFondos() {
    this.resumenFondosCargado = false;
    this.fondosService.ObtenerResumenFondosPorCaja(this.filtros)
      .subscribe(r => {
        this.resumenFondos      = r;
        this.resumenFondosCargado = true;
        // Fondos disponibles para acreditar (excluir el fondo VA)
        this.fondosDisponibles = r.filter((f: any) => f.tipo !== 'VALOR_PENDIENTE');

        // si había un fondo seleccionado, actualizamos su referencia
        if (this.fondoSeleccionado) {
          const actualizado = r.find(f => f.id === this.fondoSeleccionado!.id);
          this.fondoSeleccionado = actualizado ?? null;
        }
      });
  }

  // ── filtros ──────────────────────────────────────────────────────────────────

  inicializarFiltros() {
    const rango = this.obtenerRangoFechas();
    this.filtros = {
      pagina:        1,
      tamanioPagina: 10,
      idCaja:        this.filtrosForm.value.caja?.id,
      fechaDesde:    rango?.desde ? this.formatearFechaLocal(rango.desde) : null,
      fechaHasta:    rango?.hasta ? this.formatearFechaLocal(rango.hasta) : null,
      usuario:       this.filtrosForm.value.usuario || null
    };
  }

  async onFiltrosChange() {
    this.fondoSeleccionado  = null;
    this.detalleMetodos     = [];
    this.inicializarFiltros();
    this.cargarDatos();
    await this.cargarMovimientos();
  }

  onPeriodoChange() {
    if (this.filtrosForm.get('periodo')?.value !== 'custom') {
      this.filtrosForm.patchValue({ fechas: null });
      this.onFiltrosChange();
    }
  }

  // ── selección de fondo ───────────────────────────────────────────────────────

  seleccionarFondo(fondo: ResumenFondo) {
    if (this.fondoSeleccionado?.id === fondo.id) {
      // deseleccionar
      this.fondoSeleccionado  = null;
      this.filtros.idFondo    = undefined;
      this.detalleMetodos     = [];
      this.desglosePorEmpresa = [];
    } else {
      this.fondoSeleccionado = fondo;
      this.filtros.idFondo   = fondo.id;

      // detalle de métodos solo para fondos bancarios y digitales
      if (fondo.tipo === 'BANCARIO' || fondo.tipo === 'DIGITAL') {
        this.detalleMetodosCargado = false;
        this.fondosService.ObtenerDetalleMetodosPago(this.filtros)
          .subscribe(r => {
            this.detalleMetodos = r;
            this.detalleMetodosCargado = true;
          });
        // desglose por empresa para arqueo
        this.fondosService.ObtenerDesglosePorEmpresa(this.filtros)
          .subscribe(r => this.desglosePorEmpresa = r);
      } else {
        this.detalleMetodos     = [];
        this.desglosePorEmpresa = [];
      }

      // Valores pendientes: recargar al seleccionar el fondo VA
      if (fondo.tipo === 'VALOR_PENDIENTE') {
        this.cargarValoresPendientes();
      }
    }
    this.cargarMovimientos();
  }

  // ── movimientos ──────────────────────────────────────────────────────────────

  async cargarMovimientos(event?: TableLazyLoadEvent) {
    if (this.primeraCarga) {
      this.primeraCarga = false;
      return;
    }
    this.loading = true;
    this.filtros.pagina        = ((event?.first ?? 0) / (event?.rows ?? 10)) + 1;
    this.filtros.tamanioPagina = event?.rows ?? 10;

    this.fondosService.ObtenerMovimientos(this.filtros).subscribe(r => {
      this.movimientos  = r.registros;
      this.totalRecords = r.total;
      this.loading      = false;
    });
  }

  // ── modales ──────────────────────────────────────────────────────────────────

  abrirMovimiento(tipo: 'INGRESO' | 'EGRESO' | 'AJUSTE') {
    this.tipoMovimientoModal  = tipo;
    this.mostrarMovimientoModal = true;
  }

  abrirTransferencia() {
    this.mostrarTransferenciaModal = true;
  }

  transferenciaRealizada() {
    this.notificaciones.Success('Transferencia realizada correctamente');
    this.obtenerResumen();
    this.obtenerResumenFondos();
    this.cargarMovimientos();
  }

  insertarMovimientoManual(movimiento: MovimientoFondo) {
    this.mostrarMovimientoModal = false;
    movimiento.usuario = this.sesion.usuario;
    movimiento.idCaja  = this.cajaSeleccionada.id;

    this.fondosService.RegistrarMovimiento(movimiento).subscribe(r => {
      if (r) {
        this.notificaciones.Success('Movimiento registrado correctamente');
        this.obtenerResumen();
        this.obtenerResumenFondos();
        this.cargarMovimientos();
      } else {
        this.notificaciones.Error('Error al registrar el movimiento');
      }
    });
  }

  // ── helpers ──────────────────────────────────────────────────────────────────

  obtenerSeverityTipo(tipo: string) {
    switch (tipo) {
      case 'INGRESO': return 'success';
      case 'EGRESO':  return 'danger';
      default:        return 'info';
    }
  }

  private formatearFechaLocal(fecha: Date): string {
    const y = fecha.getFullYear();
    const m = String(fecha.getMonth() + 1).padStart(2, '0');
    const d = String(fecha.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  private obtenerRangoFechas() {
    const periodo = this.filtrosForm.value.periodo;
    const hoy     = new Date();
    switch (periodo) {
      case 'hoy':    return { desde: hoy, hasta: hoy };
      case 'ayer':   const a = new Date(); a.setDate(hoy.getDate()-1); return { desde: a, hasta: a };
      case '7dias':  const s = new Date(); s.setDate(hoy.getDate()-7); return { desde: s, hasta: hoy };
      case '30dias': const t = new Date(); t.setDate(hoy.getDate()-30); return { desde: t, hasta: hoy };
      case 'custom': const f = this.filtrosForm.value.fechas; return { desde: f?.[0], hasta: f?.[1] };
      default:       return null;
    }
  }

  // ── Valores a Recepcionar ────────────────────────────────────────────────────

  cargarValoresPendientes(): void {
    this.valoresCargado = false;
    this.fondosService.ObtenerValoresPendientes(1) // TODO: obtener de sesion cuando esté disponible
      .subscribe({
        next: (r) => {
          this.valoresPendientes = r.pendientes;
          this.totalesValores    = r.totales;
          this.valoresCargado    = true;
        },
        error: () => this.notificaciones.Error('Error al cargar valores pendientes.')
      });
  }

  abrirAcreditar(valor: ValorPendiente): void {
    this.valorSeleccionado        = valor;
    this.fondoDestinoSeleccionado = null;
    // Para CREDITO el fondo destino ya está definido; para CHEQUE el usuario lo elige
    if (valor.tipo === 'TARJETA_CREDITO' && valor.idFondoDestino) {
      // Buscar el objeto ResumenFondo correspondiente
      this.fondoDestinoSeleccionado = this.fondosDisponibles.find(f => f.id === valor.idFondoDestino) ?? null;
    }
    this.dialogAcreditarVisible = true;
  }

  confirmarAcreditar(): void {
    if (!this.valorSeleccionado) return;
    if (!this.fondoDestinoSeleccionado) {
      this.notificaciones.Warn('Seleccioná el fondo destino.');
      return;
    }
    this.fondosService.AcreditarValor({
      idValor:         this.valorSeleccionado.id,
      idCaja:          this.cajaSeleccionada.id,
      usuario:         this.sesion.usuario,
      idFondoDestino:  this.fondoDestinoSeleccionado.id,
    }).subscribe({
      next: () => {
        this.notificaciones.Success('Valor acreditado correctamente.');
        this.dialogAcreditarVisible = false;
        this.valorSeleccionado      = null;
        this.cargarValoresPendientes();
        this.cargarDatos();
      },
      error: (e) => this.notificaciones.Error(e?.error ?? 'Error al acreditar.')
    });
  }

  rechazarValor(valor: ValorPendiente): void {
    this.fondosService.RechazarValor({
      idValor:      valor.id,
      idCaja:       this.cajaSeleccionada.id,
      usuario:      this.sesion.usuario,
      observaciones: 'Rechazado manualmente',
    }).subscribe({
      next: () => {
        this.notificaciones.Success('Valor rechazado.');
        this.cargarValoresPendientes();
        this.cargarDatos();
      },
      error: (e) => this.notificaciones.Error(e?.error ?? 'Error al rechazar.')
    });
  }

  get totalValoresPendientes(): number {
    return (this.totalesValores.CHEQUE ?? 0) + (this.totalesValores.TARJETA_CREDITO ?? 0);
  }
}
// export class MainFondosComponent implements OnInit {
//   sesion:any;
//   filtrosForm:FormGroup;
//   filtros:FiltrosFondos = new FiltrosFondos();

//   resumenCaja:ResumenCaja;
//   resumenCajaCargado:boolean = false;

//   resumenFondo:ResumenFondo[] = [];
//   resumenFondoCargado:boolean = false;
//   fondoSeleccionado:ResumenFondo = new ResumenFondo();
//   resumenBancos: any[] = [];

//   cajas: Caja[] = [];
//   cajaSeleccionada: Caja = new Caja();

//   periodos = [
//     { label: 'Hoy', value: 'hoy' },
//     { label: 'Ayer', value: 'ayer' },
//     { label: 'Últimos 7 días', value: '7dias' },
//     { label: 'Últimos 30 días', value: '30dias' },
//     { label: 'Personalizado', value: 'custom' }
//   ];

//   usuarios:Usuario[] = [];

//   chartData: any;
//   chartOptions: any;

//   movimientos:MovimientoFondo[] = [];
//   totalRecords: number = 0;
//   loading: boolean = false;
//   primeraCarga = true;

//   tipoMovimientoModal: 'INGRESO' | 'EGRESO' | 'AJUSTE' = 'INGRESO';
//   mostrarMovimientoModal = false;
//   mostrarTransferenciaModal = false;

//   constructor(
//     private fondosService:FondosService,
//     private usuariosService:UsuariosService,
//     private notificaciones:NotificacionesService,
//     private usuarioService:UsuariosService
//   ) { 
//     this.filtrosForm = new FormGroup({
//       caja: new FormControl(),
//       usuario: new FormControl(),
//       periodo: new FormControl(),
//       fechas: new FormControl()
//     })
//     this.filtrosForm.get('periodo')?.setValue(this.periodos[0].value);
//   }

//   ngOnInit() {
//     this.sesion = this.usuariosService.GetSesion().data;

//     this.usuarioService.SelectorUsuarios()
//       .subscribe(response => {
//         this.usuarios = response;
//         this.usuarios = [
//           {
//             id: null,
//             nombre: 'TODOS'
//           },
//           ...response
//         ];


//         if (this.sesion.cargo !== 'ADMINISTRADOR') {
//           this.filtrosForm.patchValue({
//             usuario: this.sesion.usuario
//           });
//         } else {
//           this.filtrosForm.patchValue({
//             usuario: null
//           });
//         }

//         this.fondosService.SelectorCajas()
//         .subscribe(response => {
//           this.cajas = response;
//           this.cajaSeleccionada = this.cajas[0];
//           this.filtrosForm.get('caja')?.setValue(this.cajaSeleccionada);

//           this.inicializarFiltros();
//           this.cargarDatos();
//         });
       
//       });
//   }

//   cargarDatos() {
//     this.obtenerResumen();
//     this.obtenerResumenFondos();
//     this.cargarMovimientos();
//   }

//   private formatearFechaLocal(fecha: Date): string {
//     const year = fecha.getFullYear();
//     const month = String(fecha.getMonth() + 1).padStart(2, '0');
//     const day = String(fecha.getDate()).padStart(2, '0');

//     return `${year}-${month}-${day}`;
//   }

//   inicializarFiltros() {
//     const rango = this.obtenerRangoFechas();

//     this.filtros = {
//       pagina: 1,
//       tamanioPagina: 10,
//       idCaja: this.filtrosForm.value.caja?.id,
//       fechaDesde: rango?.desde
//         ? this.formatearFechaLocal(rango.desde)
//         : null,
//       fechaHasta: rango?.hasta
//         ? this.formatearFechaLocal(rango.hasta)
//         : null,
//       usuario: this.filtrosForm.value.usuario || null
//     };
//   }

//   onPeriodoChange() {
//     const periodo = this.filtrosForm.get('periodo')?.value;

//     if (periodo !== 'custom') {
//       this.filtrosForm.patchValue({
//         fechas: null
//       });

//       this.onFiltrosChange();
//     }
//   }

//   private obtenerRangoFechas() {
//     const periodo = this.filtrosForm.value.periodo;
//     const hoy = new Date();

//     switch (periodo) {
//       case 'hoy':
//         return { desde: hoy, hasta: hoy };

//       case 'ayer':
//         const ayer = new Date();
//         ayer.setDate(hoy.getDate() - 1);
//         return { desde: ayer, hasta: ayer };

//       case '7dias':
//         const siete = new Date();
//         siete.setDate(hoy.getDate() - 7);
//         return { desde: siete, hasta: hoy };

//       case '30dias':
//         const treinta = new Date();
//         treinta.setDate(hoy.getDate() - 30);
//         return { desde: treinta, hasta: hoy };

//       case 'custom':
//         const fechas = this.filtrosForm.value.fechas;
//         return {
//           desde: fechas?.[0],
//           hasta: fechas?.[1]
//         };

//       default:
//         return null;
//     }
//   }

//   async onFiltrosChange() {
//     this.inicializarFiltros();
//     await this.obtenerResumen();
//     await this.cargarMovimientos();
//     this.obtenerResumenFondos();
//   }

//   obtenerResumen(){
//     this.fondosService.ObtenerResumen(this.filtros)
//     .subscribe(response => {
//       this.resumenCaja = response;
//       this.resumenCajaCargado = true;
//     });
//   }
//   obtenerResumenFondos(){
//     this.fondosService.ObtenerResumenFondos(this.filtros)
//     .subscribe(response => {
//       this.resumenFondo = response;
//       this.resumenFondoCargado = true;
      
//       //this.generarGraficoFondos();
//     });
//   }

//   seleccionarFondo(fondo: any) {
//     if (this.fondoSeleccionado?.id === fondo.id) {

//       this.fondoSeleccionado = new ResumenFondos();
//       this.filtros.idFondo = undefined;

//     } else {

//       this.fondoSeleccionado = fondo;
//       this.filtros.idFondo = fondo.id;
//     }

//     this.obtenerResumenBancos();
//     this.cargarMovimientos();
//   }

//   obtenerResumenBancos() {
//     // solo aplica para fondo bancos
//     if (this.filtros.idFondo !== 2) {
//       this.resumenBancos = [];
//       return;
//     }

//     this.fondosService.ObtenerResumenFondoBancos(this.filtros)
//       .subscribe(response => {
//         this.resumenBancos = response;
//       });
//   }

//   async cargarMovimientos(event?: TableLazyLoadEvent) {
//     if (this.primeraCarga) {
//       this.primeraCarga = false;
//       return; // ignora la carga automática
//     }

//     this.loading = true;
//     const pageIndex = (event?.first ?? 0) / (event?.rows ?? 10); 
//     const pageSize = event?.rows ?? 10;

//     this.filtros.pagina = pageIndex + 1;
//     this.filtros.tamanioPagina = pageSize;

//     this.fondosService.ObtenerMovimientos(this.filtros)
//     .subscribe(response => {
//       this.movimientos = response.registros;
//       this.totalRecords = response.total;
//       this.loading = false;
//     });
//   }

//   generarGraficoFondos() {

//   const fondosValidos = this.resumenFondo
//     .filter(f => f.saldo > 0);

//     this.chartData = {
//       labels: fondosValidos.map(f => f.nombre),
//       datasets: [
//         {
//           data: fondosValidos.map(f => f.saldo),

//           backgroundColor: [
//             '#22c55e',
//             '#3b82f6',
//             '#f59e0b',
//             '#6366f1',
//             '#14b8a6'
//           ],

//           borderWidth: 0,
//           hoverOffset: 6
//         }
//       ]
//     };

//     this.chartOptions = {

//       cutout: '60%',
//       responsive: true,
//       maintainAspectRatio: false,


//       plugins: {

//         legend: {
//           position: 'right',

//           labels: {
//             color: getComputedStyle(document.documentElement)
//               .getPropertyValue('--text-color'),

//             usePointStyle: true,
//             pointStyle: 'circle',
//             padding: 18,

//             font: {
//               size: 13
//             }
//           }
//         }
//       }
//     };
//   }

//   obtenerSeverityTipo(tipo:string){
//     switch(tipo){
//       case 'INGRESO':
//         return 'success';
//       case 'EGRESO':
//         return 'danger';
//       default:
//         return 'info';
//     }

//   }
  
//   abrirMovimiento(tipo: 'INGRESO' | 'EGRESO' | 'AJUSTE') {
//     this.tipoMovimientoModal = tipo;
//     this.mostrarMovimientoModal = true;
//   }
//   abrirTransferencia() {
//     this.mostrarTransferenciaModal = true;
//   }

//   transferenciaRealizada(): void {
//     this.notificaciones.Success("Transferencia realizada correctamente");
//     this.obtenerResumen();
//     this.cargarMovimientos();
//     this.obtenerResumenFondos();
//   }

//   insertarMovimientoManual(movimiento:MovimientoFondo){
//     this.mostrarMovimientoModal = false;
//     movimiento.usuario = this.sesion.usuario;
//     movimiento.idCaja = this.cajaSeleccionada.id;

//     this.fondosService.RegistrarMovimiento(movimiento)
//     .subscribe(response => {
//       if(response){
//         this.notificaciones.Success("Movimiento registrado correctamente");
//         this.obtenerResumen();
//         this.cargarMovimientos();
//         this.obtenerResumenFondos();
//       }else{
//         this.notificaciones.Error("Error al registra