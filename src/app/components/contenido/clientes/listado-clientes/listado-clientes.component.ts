import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Button } from 'primeng/button';
import { Dialog } from 'primeng/dialog';
import { AddModClientesComponent } from '../addmod-clientes/addmod-clientes.component';
import { EncabezadoSeccionComponent } from '../../../compartidos/encabezado-seccion/encabezado-seccion.component';
import { TooltipModule } from 'primeng/tooltip';
import { TableLazyLoadEvent, TableModule } from 'primeng/table';
import { Cliente } from '../../../../models/Cliente';
import { ClientesService } from '../../../../services/clientes.service';
import { Router } from '@angular/router';
import { AutoCompleteModule } from 'primeng/autocomplete';
import { FormControl, FormGroup } from '@angular/forms';
import { FiltroClientes } from '../../../../models/filtros/FiltroClientes';
import { MiscService } from '../../../../services/misc.service';
import { CondicionesIva } from '../../../../models/CondicionesIva';
import { FORMS_IMPORTS } from '../../../../imports/forms.import';
import { FilesService } from '../../../../services/files.service';
@Component({
  selector: 'app-listado-clientes',
  standalone: true,
  imports: [
    TableModule,
    Button,
    Dialog,
    RouterLink,
    AddModClientesComponent,
    EncabezadoSeccionComponent,
    TooltipModule,
    AutoCompleteModule,
    ...FORMS_IMPORTS,
  ],
  templateUrl: './listado-clientes.component.html',
  styleUrl: './listado-clientes.component.scss',
})
export class ListadoClientesComponent {
  totalRecords: number = 0;
  loading: boolean = false;
  filtroActual!: FiltroClientes;
  
  clientes: Cliente[] = [];
  condicionesIva: CondicionesIva[] = [];

  // Misma lista fija usada en listado-cuentas.component.ts (no surge de una tabla en BD,
  // son los IDs de ID_CONDICION_PAGO en venta.constants.ts).
  condicionesPago = [
    {id: 1, descripcion: 'CONTADO'},
    {id: 2, descripcion: 'CUENTA CORRIENTE'},
    {id: 3, descripcion: 'PAGO DIGITAL'},
    {id: 4, descripcion: 'OTRO'},
  ];

  clienteSeleccionado!: Cliente | undefined;
  mostrarmodalAddMod: boolean = false;

  filtros:FormGroup;

  constructor(
    private clientesService:ClientesService,
    private miscService:MiscService,
    private filesService:FilesService,
    private router:Router
  ){
    this.filtros = new FormGroup({
      nombre: new FormControl(''),
      condicionIva: new FormControl(''),
      condicionPago: new FormControl(''),
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
      this.filtroActual = new FiltroClientes({
        pagina: pageIndex + 1,  
        tamanioPagina: pageSize,
        nombre: this.filtros.get('nombre')?.value ?? '',
        condicionIva: this.filtros.get('condicionIva')?.value ?? '',
        condicionPago: this.filtros.get('condicionPago')?.value ?? '',
        documento: this.filtros.get('documento')?.value ?? ''
      });
    }

    this.clientesService.ObtenerClientes(this.filtroActual).subscribe(response => {
      this.clientes = response.registros;
      this.totalRecords = response.total;
      this.loading = false;
    });
  }

  Editar(id:number){
    this.clienteSeleccionado = this.clientes.find(c => c.id == id);
    this.mostrarmodalAddMod = true;
  }

  Actualizar(valor:boolean){
    if(valor)
      this.Buscar(undefined, true);

    this.mostrarmodalAddMod = false;
  }

  VerEstadistica(id:number, cliente:string){
    this.router.navigate(['/clientes/estadisticas', id, cliente]);
  }

  //Descarga los resultados en excel
  DescargarResultados(){
    if(this.clientes.length == 0) return;

    this.filesService.DescargarClientesExcel(this.filtroActual).subscribe(blob => {
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');

      // Fecha en formato DD-MM-YY
      const fecha = new Date();
      const dd = String(fecha.getDate()).padStart(2, '0');
      const mm = String(fecha.getMonth() + 1).padStart(2, '0'); // Meses empiezan en 0
      const yy = String(fecha.getFullYear()).slice(-2); // últimos 2 dígitos del año

      const nombreArchivo = `Clientes_${dd}-${mm}-${yy}.xlsx`;

      a.href = url;
      a.download = nombreArchivo;
      a.click();
      window.URL.revokeObjectURL(url);
    });
  }

  LimpiarFiltros(){
    this.filtros.reset();
    this.Buscar();
  }
}
