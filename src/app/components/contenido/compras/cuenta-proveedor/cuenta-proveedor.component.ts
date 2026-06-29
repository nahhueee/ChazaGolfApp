import { DatePipe, Location } from '@angular/common';
import { Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Button } from 'primeng/button';
import { TableLazyLoadEvent, TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { Dialog } from 'primeng/dialog';
import { ConfirmationService } from 'primeng/api';
import { ConfirmDialogModule } from 'primeng/confirmdialog';

import { FORMS_IMPORTS } from '../../../../imports/forms.import';
import { CuentaCorrienteProveedor } from '../../../../models/CuentaCorrienteProveedor';
import { MovimientoProveedor } from '../../../../models/MovimientoProveedor';
import { FiltroCuentasProveedores } from '../../../../models/filtros/FiltroCuentasProveedores';
import { FiltroComprasProveedor } from '../../../../models/filtros/FiltroComprasProveedor';
import { CuentasProveedoresService } from '../../../../services/cuentas-proveedores.service';
import { UsuariosService } from '../../../../services/usuarios.service';
import { NotificacionesService } from '../../../../services/notificaciones.service';
import { PagarProveedorComponent } from '../pagar-proveedor/pagar-proveedor.component';

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
    ConfirmDialogModule,
    PagarProveedorComponent,
  ],
  templateUrl: './cuenta-proveedor.component.html',
  styleUrl: './cuenta-proveedor.component.scss',
  providers: [ConfirmationService],
})
export class CuentaProveedorComponent {
  idProveedor: number = 0;
  proveedor: string = '';
  cuenta: CuentaCorrienteProveedor = new CuentaCorrienteProveedor();

  movimientos: MovimientoProveedor[] = [];
  totalRecords: number = 0;
  loading: boolean = false;
  primeraCarga = true;

  pagarVisible: boolean = false;
  cajaActiva: number = 0;
  sesion: any;

  mostrarObs: boolean = false;
  observacionSeleccionada: string = '';

  detalleVisible: boolean = false;
  pagoSeleccionado: any = null;

  constructor(
    private rutaActiva: ActivatedRoute,
    private location: Location,
    private cuentasService: CuentasProveedoresService,
    private usuariosService: UsuariosService,
    private notificaciones: NotificacionesService,
    private confirmationService: ConfirmationService,
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

    const pageIndex = (event?.first ?? 0) / (event?.rows ?? 15);
    const pageSize = event?.rows ?? 15;

    const filtro = new FiltroComprasProveedor({
      pagina: pageIndex + 1,
      tamanioPagina: pageSize,
      idProveedor: this.idProveedor,
    });

    this.cuentasService.ObtenerMovimientosProveedor(filtro).subscribe(response => {
      this.movimientos = response.registros;
      this.totalRecords = response.total;
      this.loading = false;
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

  AnularPago(movimiento: MovimientoProveedor) {
    this.confirmationService.confirm({
      key: 'confirmarAnularPago',
      message: `¿Anular el pago # ${movimiento.id} por $${movimiento.haber.toLocaleString('es-AR')}? Se revertirán los movimientos de fondos y la deuda o saldo a favor que haya generado.`,
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
        this.cuentasService.RevertirPago(movimiento.id).subscribe(response => {
          if (response == 'OK') {
            this.notificaciones.Success('Pago anulado correctamente.');
            this.onRecargar(true);
          }
        });
      },
      reject: () => {},
    });
  }

  GetSeverity(estado: string): 'info' | 'warn' | 'success' | 'danger' {
    if (estado === 'PAGADA') return 'success';
    if (estado === 'PARCIAL') return 'warn';
    if (estado === 'IMPAGA') return 'danger';
    if (estado === 'ANULADA') return 'info';
    if (estado === 'ANULADO') return 'info';
    if (estado === 'INICIAL') return 'info';

    return 'info';
  }
}
