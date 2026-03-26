import { Component } from '@angular/core';
import { Button } from 'primeng/button';
import { Dialog } from 'primeng/dialog';
import { AddModClientesComponent } from '../addmod-clientes/addmod-clientes.component';
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
@Component({
  selector: 'app-listado-clientes',
  standalone: true,
  imports: [
    TableModule,
    Button,
    Dialog,
    AddModClientesComponent,
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

  clienteSeleccionado!: Cliente | undefined;
  mostrarmodalAddMod: boolean = false;

  filtros:FormGroup;

  constructor(
    private clientesService:ClientesService,
    private miscService:MiscService,
    private router:Router
  ){
    this.filtros = new FormGroup({
      nombre: new FormControl(''),
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
      this.filtroActual = new FiltroClientes({
        pagina: pageIndex + 1,  
        tamanioPagina: pageSize,
        nombre: this.filtros.get('nombre')?.value ?? '',
        condicionIva: this.filtros.get('condicionIva')?.value ?? '',
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

  LimpiarFiltros(){
    this.filtros.reset();
    this.Buscar();
  }
}
