import { Component, OnInit } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { TableLazyLoadEvent, TableModule } from 'primeng/table';
import { Button } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';
import { TagModule } from 'primeng/tag';
import { DatePickerModule } from 'primeng/datepicker';

import { FORMS_IMPORTS } from '../../../../imports/forms.import';
import { Compra } from '../../../../models/Compra';
import { Proveedor } from '../../../../models/Proveedor';
import { FiltroCompras } from '../../../../models/filtros/FiltroCompras';
import { COMPROBANTES_COMPRA } from '../models/compra.constants';

import { ComprasService } from '../../../../services/compras.service';
import { FilesService } from '../../../../services/files.service';
import { ProveedoresService } from '../../../../services/proveedores.service';
import { NotificacionesService } from '../../../../services/notificaciones.service';
import { EncabezadoSeccionComponent } from '../../../compartidos/encabezado-seccion/encabezado-seccion.component';
import { DetalleCompraComponent } from '../detalle-compra/detalle-compra.component';
import { CompraBaja, DialogBajaCompraComponent } from '../dialog-baja-compra/dialog-baja-compra.component';

@Component({
  selector: 'app-listado-compras',
  standalone: true,
  imports: [
    TableModule,
    Button,
    RouterLink,
    TooltipModule,
    TagModule,
    DatePickerModule,
    ...FORMS_IMPORTS,
    EncabezadoSeccionComponent,
    DetalleCompraComponent,
    DialogBajaCompraComponent,
  ],
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

  detalleVisible: boolean = false;
  idCompraDetalle: number | null = null;

  bajaVisible: boolean = false;
  compraBaja: CompraBaja | null = null;

  filtros: FormGroup;

  constructor(
    private comprasService: ComprasService,
    private proveedoresService: ProveedoresService,
    private Notificaciones: NotificacionesService,
    private filesService: FilesService,
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

  Exportar() {
    const fechas = this.filtros.get('fechas')?.value;
    if (!fechas || fechas.length !== 2 || !fechas[0] || !fechas[1]) {
      this.Notificaciones.Warn("Debe seleccionar un rango de fechas completo (desde y hasta).");
      return;
    }

    const filtroExport = new FiltroCompras({
      idProveedor: this.filtros.get('proveedor')?.value?.id ?? 0,
      fechas,
      idTipoComprobante: this.filtros.get('tipoComprobante')?.value ?? 0,
    });

    this.filesService.DescargarComprasExcel(filtroExport).subscribe(blob => {
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');

      // Nombre con las fechas del PERIODO filtrado (no la de hoy, mismo criterio que
      // DescargarLibroIva en Ventas): el usuario va a regenerar el mismo período varias
      // veces y necesita distinguir el archivo por el rango que contiene, no por cuándo lo bajó.
      const formatear = (f: Date) => {
        const dd = String(f.getDate()).padStart(2, '0');
        const mm = String(f.getMonth() + 1).padStart(2, '0');
        const yy = String(f.getFullYear()).slice(-2);
        return `${dd}-${mm}-${yy}`;
      };

      a.href = url;
      a.download = `Compras_${formatear(fechas[0])}_a_${formatear(fechas[1])}.xlsx`;
      a.click();
      window.URL.revokeObjectURL(url);
    });
  }

  LimpiarFiltros() {
    this.filtros.reset({ proveedor: '', fechas: '', tipoComprobante: 0 });
    this.Buscar();
  }

  VerDetalle(id: number) {
    this.idCompraDetalle = id;
    this.detalleVisible = true;
  }

  GetSeverity(compra: Compra): 'danger' | 'success' {
    return compra.baja ? 'danger' : 'success';
  }

  //No existe Modificar: la única acción posible sobre una compra ya registrada es darla de baja.
  DarDeBaja(compra: Compra) {
    this.compraBaja = {
      id: compra.id!,
      comprobante: `${compra.tipoComprobante ?? ''} ${compra.nroComprobante ?? ''}`.trim(),
      total: compra.total ?? 0,
      metodoPago: compra.metodoPago,
    };
    this.bajaVisible = true;
  }

  OnBajaRealizada() {
    this.Buscar(undefined, true);
  }
}
