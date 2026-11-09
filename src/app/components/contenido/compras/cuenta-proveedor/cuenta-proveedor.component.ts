import { DatePipe, Location } from '@angular/common';
import { Component } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
import { DatePicker } from 'primeng/datepicker';
import { ActivatedRoute } from '@angular/router';
import { Button } from 'primeng/button';
import { TableLazyLoadEvent, TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { Dialog } from 'primeng/dialog';

import { FORMS_IMPORTS } from '../../../../imports/forms.import';
import { CuentaCorrienteProveedor } from '../../../../models/CuentaCorrienteProveedor';
import { MovimientoProveedor } from '../../../../models/MovimientoProveedor';
import { FiltroCuentasProveedores } from '../../../../models/filtros/FiltroCuentasProveedores';
import { FiltroComprasProveedor } from '../../../../models/filtros/FiltroComprasProveedor';
import { CuentasProveedoresService } from '../../../../services/cuentas-proveedores.service';
import { ComprasService } from '../../../../services/compras.service';
import { UsuariosService } from '../../../../services/usuarios.service';
import { NotificacionesService } from '../../../../services/notificaciones.service';
import { OrdenPagoReporteService } from '../../../../services/orden-pago-reporte.service';
import { FormatoFecha } from '../../../../services/helpers/reporte-a4.helper';
import { CuentaProveedorReporteService } from '../../../../services/cuenta-proveedor.reporte.service';
import { PagarProveedorComponent } from '../pagar-proveedor/pagar-proveedor.component';
import { DetalleCompraComponent } from '../detalle-compra/detalle-compra.component';
import { CompraBaja, DialogBajaCompraComponent } from '../dialog-baja-compra/dialog-baja-compra.component';
import { DialogAnularPagoComponent, PagoAnular } from '../dialog-anular-pago/dialog-anular-pago.component';

@Component({
  selector: 'app-cuenta-proveedor',
  standalone: true,
  imports: [
    ...FORMS_IMPORTS,
    TableModule,
    Button,
    DatePipe,
    TagModule,
    TooltipModule,
    Dialog,
    DatePicker,
    PagarProveedorComponent,
    DetalleCompraComponent,
    DialogBajaCompraComponent,
    DialogAnularPagoComponent,
  ],
  templateUrl: './cuenta-proveedor.component.html',
  styleUrl: './cuenta-proveedor.component.scss',
})
export class CuentaProveedorComponent {
  idProveedor: number = 0;
  proveedor: string = '';
  cuenta: CuentaCorrienteProveedor = new CuentaCorrienteProveedor();

  movimientos: MovimientoProveedor[] = [];
  totalRecords: number = 0;
  loading: boolean = false;
  primeraCarga = true;

  // Paginado controlado: al filtrar hay que volver a la página 1, y "Imprimir"/recargas deben respetar las filas elegidas.
  first: number = 0;
  rows: number = 15;

  procesos = ['COMPRA', 'PAGO'];
  filtros: FormGroup = new FormGroup({
    proceso: new FormControl(),
    fechas: new FormControl(),
  });

  pagarVisible: boolean = false;
  cajaActiva: number = 0;
  sesion: any;

  mostrarObs: boolean = false;
  observacionSeleccionada: string = '';

  detalleVisible: boolean = false;
  pagoSeleccionado: any = null;

  detalleCompraVisible: boolean = false;
  idCompraDetalle: number | null = null;

  bajaCompraVisible: boolean = false;
  compraBaja: CompraBaja | null = null;

  anularPagoVisible: boolean = false;
  pagoAnular: PagoAnular | null = null;

  constructor(
    private rutaActiva: ActivatedRoute,
    private location: Location,
    private cuentasService: CuentasProveedoresService,
    private usuariosService: UsuariosService,
    private notificaciones: NotificacionesService,
    private ordenPagoService: OrdenPagoReporteService,
    private comprasService: ComprasService,
    private reporteService: CuentaProveedorReporteService,
  ) {}

  ngAfterViewInit() {
    this.sesion = this.usuariosService.GetSesion().data;
    this.cajaActiva = this.sesion.idCaja;

    this.rutaActiva.paramMap.subscribe(params => {
      this.idProveedor = Number(params.get('idProveedor'));
      this.proveedor = params.get('proveedor')!;
    });

    this.ObtenerSaldoProveedor();
    this.Buscar();
  }

  ObtenerSaldoProveedor() {
    const filtro = new FiltroCuentasProveedores({ idProveedor: this.idProveedor, pagina: 1, tamanioPagina: 1 });

    this.cuentasService.ObtenerCuentas(filtro).subscribe(response => {
      this.cuenta = response.registros[0] ?? new CuentaCorrienteProveedor();
    });
  }

  Buscar(event?: TableLazyLoadEvent) {
    if (this.primeraCarga) {
      this.primeraCarga = false;
      return; // ignora la carga automática del p-table
    }

    this.loading = true;

    if (event) {
      this.first = event.first ?? 0;
      this.rows = event.rows ?? this.rows;
    }

    const pageIndex = this.first / this.rows;

    const filtro = new FiltroComprasProveedor({
      pagina: pageIndex + 1,
      tamanioPagina: this.rows,
      idProveedor: this.idProveedor,
      proceso: this.filtros.value.proceso,
      fechas: this.filtros.value.fechas,
    });

    this.cuentasService.ObtenerMovimientosProveedor(filtro).subscribe(response => {
      this.movimientos = response.registros;
      this.totalRecords = response.total;
      this.loading = false;
    });
  }

  // Botón Buscar: aplica los filtros desde la primera página.
  BuscarConFiltros() {
    this.first = 0;
    this.Buscar();
  }

  LimpiarFiltros() {
    this.filtros.reset();
    this.BuscarConFiltros();
  }

  // Extracto con los filtros actuales, completo (sin paginado) y en orden cronológico.
  ImprimirReporte() {
    const fechas: Date[] | null = this.filtros.value.fechas;
    const proceso: string | null = this.filtros.value.proceso;

    const filtro = new FiltroComprasProveedor({
      idProveedor: this.idProveedor,
      proceso,
      fechas,
    });

    this.cuentasService.ObtenerMovimientosProveedorReporte(filtro).subscribe(response => {
      this.reporteService.VerReporte({
        proveedor: this.proveedor,
        saldo: this.cuenta.saldo,
        fechaDesde: fechas?.[0] ? FormatoFecha(fechas[0]) : null,
        fechaHasta: fechas?.[1] ? FormatoFecha(fechas[1]) : null,
        proceso: proceso || null,
        movimientos: response,
      });
    });
  }

  Pagar() {
    this.pagarVisible = true;
  }

  onRecargar(recargar: boolean) {
    if (recargar) {
      this.Buscar();
      this.ObtenerSaldoProveedor();
    }
  }

  Cerrar() {
    this.location.back();
  }

  VerObservaciones(obs: string) {
    this.observacionSeleccionada = obs;
    this.mostrarObs = true;
  }

  VerDetalle(idPagoProveedor: number) {
    this.cuentasService.ObtenerPago(idPagoProveedor).subscribe(response => {
      this.pagoSeleccionado = response;
      this.detalleVisible = true;
    });
  }

  VerDetalleCompra(idCompra: number) {
    this.idCompraDetalle = idCompra;
    this.detalleCompraVisible = true;
  }

  // El motivo del bloqueo con pagos aplicados lo muestra el tooltip del botón (pagado > 0 lo deshabilita)
  // y, si igual llegara el request, lo rechaza el backend.
  DarDeBajaCompra(movimiento: MovimientoProveedor) {
    this.compraBaja = { id: movimiento.id, comprobante: movimiento.comprobante, total: movimiento.haber };
    this.bajaCompraVisible = true;
  }

  // Imprime la Orden de Pago A4. Se pide el pago completo al backend (mismo endpoint que Ver Detalle); sirve
  // también para pagos anulados (salen con marca de agua y motivo).
  ImprimirOrdenPago(idPagoProveedor: number) {
    this.cuentasService.ObtenerPago(idPagoProveedor).subscribe(response => {
      if (response) this.ordenPagoService.VerReporte(response);
    });
  }

  // Compra con pago al contado: no tiene registro de pago, la OP se arma desde la propia compra.
  ImprimirOrdenPagoCompra(idCompra: number) {
    this.comprasService.ObtenerCompra(idCompra).subscribe(response => {
      if (response) this.ordenPagoService.VerReporteCompra(response);
    });
  }

  AnularPago(movimiento: MovimientoProveedor) {
    this.pagoAnular = { id: movimiento.id, comprobante: movimiento.comprobante, total: movimiento.debe };
    this.anularPagoVisible = true;
  }

  FechaBaja(baja: any): string {
    return FormatoFecha(baja);
  }

  GetSeverity(estado: string): 'info' | 'warn' | 'success' | 'danger' | 'secondary' {
    if (estado === 'PAGADA') return 'success';
    if (estado === 'PARCIAL') return 'warn';
    if (estado === 'IMPAGA') return 'danger';
    if (estado === 'CONTADO') return 'secondary';
    if (estado === 'ANULADA') return 'info';
    if (estado === 'ANULADO') return 'info';
    if (estado === 'INICIAL') return 'info';

    return 'info';
  }
}
