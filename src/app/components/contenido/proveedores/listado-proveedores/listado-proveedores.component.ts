import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Button } from 'primeng/button';
import { Dialog } from 'primeng/dialog';
import { AddModProveedoresComponent } from '../addmod-proveedores/addmod-proveedores.component';
import { EncabezadoSeccionComponent } from '../../../compartidos/encabezado-seccion/encabezado-seccion.component';
import { TooltipModule } from 'primeng/tooltip';
import { TableLazyLoadEvent, TableModule } from 'primeng/table';
import { Proveedor } from '../../../../models/Proveedor';
import { ProveedoresService } from '../../../../services/proveedores.service';
import { AutoCompleteModule } from 'primeng/autocomplete';
import { FormControl, FormGroup } from '@angular/forms';
import { FiltroProveedores } from '../../../../models/filtros/FiltroProveedores';
import { MiscService } from '../../../../services/misc.service';
import { CondicionesIva } from '../../../../models/CondicionesIva';
import { FORMS_IMPORTS } from '../../../../imports/forms.import';
import { FilesService } from '../../../../services/files.service';

@Component({
  selector: 'app-listado-proveedores',
  standalone: true,
  imports: [
    TableModule,
    Button,
    Dialog,
    RouterLink,
    AddModProveedoresComponent,
    EncabezadoSeccionComponent,
    TooltipModule,
    AutoCompleteModule,
    ...FORMS_IMPORTS,
  ],
  templateUrl: './listado-proveedores.component.html',
  styleUrl: './listado-proveedores.component.scss',
})
export class ListadoProveedoresComponent {
  totalRecords: number = 0;
  loading: boolean = false;
  filtroActual!: FiltroProveedores;

  proveedores: Proveedor[] = [];
  condicionesIva: CondicionesIva[] = [];

  proveedorSeleccionado!: Proveedor | undefined;
  mostrarmodalAddMod: boolean = false;

  filtros:FormGroup;

  constructor(
    private proveedoresService:ProveedoresService,
    private miscService:MiscService,
    private filesService:FilesService,
  ){
    this.filtros = new FormGroup({
      razonSocial: new FormControl(''),
      condicionIva: new FormControl(''),
      documento: new FormControl('')
    });
  }

  ngOnInit(){
    this.ObtenerCondicionesIva();
  }

  ObtenerCondicionesIva(){
    this.miscService.ObtenerCondicionesIva()
      .subscribe(response => {
        this.condicionesIva = response;
      });
  }

  Buscar(event?: TableLazyLoadEvent, recargaConFiltro: boolean = false) {
    this.loading = true;

    const pageIndex = (event?.first ?? 0) / (event?.rows ?? 10);
    const pageSize = event?.rows ?? 10;

    if (!recargaConFiltro) {
      this.filtroActual = new FiltroProveedores({
        pagina: pageIndex + 1,
        tamanioPagina: pageSize,
        razonSocial: this.filtros.get('razonSocial')?.value ?? '',
        condicionIva: this.filtros.get('condicionIva')?.value ?? '',
        documento: this.filtros.get('documento')?.value ?? ''
      });
    }

    this.proveedoresService.ObtenerProveedores(this.filtroActual).subscribe(response => {
      this.proveedores = response.registros;
      this.totalRecords = response.total;
      this.loading = false;
    });
  }

  Editar(id:number){
    this.proveedorSeleccionado = this.proveedores.find(p => p.id == id);
    this.mostrarmodalAddMod = true;
  }

  Actualizar(valor:boolean){
    if(valor)
      this.Buscar(undefined, true);

    this.mostrarmodalAddMod = false;
  }

  LimpiarFiltros(){
    this.filtros.reset();
    this.Buscar();
  }

  //Descarga los resultados en excel
  DescargarResultados(){
    if(this.proveedores.length == 0) return;

    this.filesService.DescargarProveedoresExcel(this.filtroActual).subscribe(blob => {
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');

      // Fecha en formato DD-MM-YY
      const fecha = new Date();
      const dd = String(fecha.getDate()).padStart(2, '0');
      const mm = String(fecha.getMonth() + 1).padStart(2, '0'); // Meses empiezan en 0
      const yy = String(fecha.getFullYear()).slice(-2); // últimos 2 dígitos del año

      const nombreArchivo = `Proveedores_${dd}-${mm}-${yy}.xlsx`;

      a.href = url;
      a.download = nombreArchivo;
      a.click();
      window.URL.revokeObjectURL(url);
    });
  }
}
