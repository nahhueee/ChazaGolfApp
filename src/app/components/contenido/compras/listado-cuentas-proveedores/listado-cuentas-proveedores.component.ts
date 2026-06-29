import { Component } from '@angular/core';
import { Button } from 'primeng/button';
import { TableLazyLoadEvent, TableModule } from 'primeng/table';
import { TooltipModule } from 'primeng/tooltip';
import { TagModule } from 'primeng/tag';
import { FormControl, FormGroup } from '@angular/forms';
import { Router } from '@angular/router';

import { CuentaCorrienteProveedor } from '../../../../models/CuentaCorrienteProveedor';
import { FiltroCuentasProveedores } from '../../../../models/filtros/FiltroCuentasProveedores';
import { CuentasProveedoresService } from '../../../../services/cuentas-proveedores.service';
import { FORMS_IMPORTS } from '../../../../imports/forms.import';
import { EncabezadoSeccionComponent } from '../../../compartidos/encabezado-seccion/encabezado-seccion.component';

@Component({
  selector: 'app-listado-cuentas-proveedores',
  standalone: true,
  imports: [
    TableModule,
    Button,
    TooltipModule,
    TagModule,
    ...FORMS_IMPORTS,
    EncabezadoSeccionComponent,
  ],
  templateUrl: './listado-cuentas-proveedores.component.html',
  styleUrl: './listado-cuentas-proveedores.component.scss',
})
export class ListadoCuentasProveedoresComponent {
  cuentas: CuentaCorrienteProveedor[] = [];
  totalRecords: number = 0;
  loading: boolean = false;
  filtroActual!: FiltroCuentasProveedores;

  filtros: FormGroup;

  constructor(
    private cuentasService: CuentasProveedoresService,
    private router: Router,
  ) {
    this.filtros = new FormGroup({
      razonSocial: new FormControl(''),
    });
  }

  Buscar(event?: TableLazyLoadEvent, recargaConFiltro: boolean = false) {
    this.loading = true;

    const pageIndex = (event?.first ?? 0) / (event?.rows ?? 15);
    const pageSize = event?.rows ?? 15;

    if (!recargaConFiltro) {
      this.filtroActual = new FiltroCuentasProveedores({
        pagina: pageIndex + 1,
        tamanioPagina: pageSize,
        razonSocial: this.filtros.get('razonSocial')?.value ?? '',
      });
    }

    this.cuentasService.ObtenerCuentas(this.filtroActual).subscribe(response => {
      this.cuentas = response.registros;
      this.totalRecords = response.total;
      this.loading = false;
    });
  }

  LimpiarFiltros() {
    this.filtros.reset({ razonSocial: '' });
    this.Buscar();
  }

  VerCuenta(idProveedor: number, proveedor: string) {
    this.router.navigate(['/compras/cuentas/administrar', idProveedor, proveedor]);
  }

  GetSeverity(estado: string): 'info' | 'warn' | 'success' {
    const value = estado.toLowerCase();

    if (value === 'al día') return 'info';
    if (value === 'debemos') return 'warn';
    if (value === 'a favor') return 'success';

    return 'info';
  }
}
