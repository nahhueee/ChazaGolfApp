import { Component, OnInit } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { TableLazyLoadEvent, TableModule } from 'primeng/table';
import { Button } from 'primeng/button';
import { Dialog } from 'primeng/dialog';
import { TooltipModule } from 'primeng/tooltip';
import { TagModule } from 'primeng/tag';
import { DatePickerModule } from 'primeng/datepicker';
import { ConfirmationService } from 'primeng/api';
import { ConfirmDialogModule } from 'primeng/confirmdialog';

import { FORMS_IMPORTS } from '../../../../imports/forms.import';
import { Compra } from '../../../../models/Compra';
import { Proveedor } from '../../../../models/Proveedor';
import { FiltroCompras } from '../../../../models/filtros/FiltroCompras';
import { COMPROBANTES_COMPRA } from '../models/compra.constants';

import { ComprasService } from '../../../../services/compras.service';
import { ProveedoresService } from '../../../../services/proveedores.service';
import { NotificacionesService } from '../../../../services/notificaciones.service';
import { EncabezadoSeccionComponent } from '../../../compartidos/encabezado-seccion/encabezado-seccion.component';

@Component({
  selector: 'app-listado-compras',
  standalone: true,
  imports: [
    TableModule,
    Button,
    RouterLink,
    Dialog,
    TooltipModule,
    TagModule,
    DatePickerModule,
    ConfirmDialogModule,
    ...FORMS_IMPORTS,
    EncabezadoSeccionComponent,
  ],
  providers: [ConfirmationService],
  templateUrl: './listado-compras.component.html',
  styleUrl: './listado-compras.component.scss',
})
export class ListadoComprasComponent implements OnInit {
  compras: Compra[] = [];
  totalRecords: number = 0;
  loading: boolean = false;
  filtroActual!: FiltroCompras;

  proveedores: Proveedor[] = [];
  proveedoresFiltrados: Proveedor[] = [];
  comprobantes = COMPROBANTES_COMPRA;

  compraSeleccionada: Compra | undefined;
  mostrarModalDetalle: boolean = false;

  filtros: FormGroup;

  constructor(
    private comprasService: ComprasService,
    private proveedoresService: ProveedoresService,
    private confirmationService: ConfirmationService,
    private Notificaciones: NotificacionesService,
  ) {
    this.filtros = new FormGroup({
      proveedor: new FormControl(''),
      fechas: new FormControl(''),
      tipoComprobante: new FormControl(0),
    });
  }

  ngOnInit(): void {
    this.ObtenerProveedores();
  }

  ObtenerProveedores() {
    this.proveedoresService.SelectorProveedores().subscribe(response => {
      this.proveedores = response;
    });
  }

  FiltrarProveedores(event: any) {
    const query = event.query.toLowerCase();
    this.proveedoresFiltrados = this.proveedores.filter(p => {
      const nombre = p.razonSocial!.toLowerCase();
      return nombre.includes(query);
    });
  }

  Buscar(event?: TableLazyLoadEvent, recargaConFiltro: boolean = false) {
    this.loading = true;

    const pageIndex = (event?.first ?? 0) / (event?.rows ?? 15);
    const pageSize = event?.rows ?? 15;

    if (!recargaConFiltro) {
      this.filtroActual = new FiltroCompras({
        pagina: pageIndex + 1,
        tamanioPagina: pageSize,
        idProveedor: this.filtros.get('proveedor')?.value?.id ?? 0,
        fechas: this.filtros.get('fechas')?.value ?? '',
        idTipoComprobante: this.filtros.get('tipoComprobante')?.value ?? 0,
        incluirBaja: true, //Siempre se incluyen las dadas de baja en el listado.
      });
    }

    this.comprasService.ObtenerCompras(this.filtroActual).subscribe(response => {
      this.compras = response.registros;
      this.totalRecords = response.total;
      this.loading = false;
    });
  }

  LimpiarFiltros() {
    this.filtros.reset({ proveedor: '', fechas: '', tipoComprobante: 0 });
    this.Buscar();
  }

  VerDetalle(id: number) {
    this.comprasService.ObtenerCompra(id).subscribe(response => {
      this.compraSeleccionada = response;
      this.mostrarModalDetalle = true;
    });
  }

  GetSeverity(compra: Compra): 'danger' | 'success' {
    return compra.baja ? 'danger' : 'success';
  }

  //No existe Modificar: la única acción posible sobre una compra ya registrada es darla de baja.
  DarDeBaja(compra: Compra) {
    const generaReverso = !!compra.metodoPago;

    this.confirmationService.confirm({
      key: 'bajaCompra',
      message: generaReverso
        ? `¿Estás seguro de dar de baja la compra Nro ${compra.id}? Se revertirá el egreso generado en Fondos (${compra.metodoPago}).`
        : `¿Estás seguro de dar de baja la compra Nro ${compra.id}?`,
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
        this.comprasService.Eliminar(compra.id!).subscribe(response => {
          if (response == 'OK') {
            this.Notificaciones.Success("Compra dada de baja correctamente.");
            this.Buscar(undefined, true);
          } else {
            this.Notificaciones.Warn(response);
          }
        });
      },
      reject: () => {},
    });
  }
}
