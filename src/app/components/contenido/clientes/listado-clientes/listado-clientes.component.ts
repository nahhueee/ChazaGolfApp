import { Component } from '@angular/core';
import { Button } from 'primeng/button';
import { Dialog } from 'primeng/dialog';
import { AddModClientesComponent } from '../add-mod-clientes/add-mod-clientes.component';
import { TooltipModule } from 'primeng/tooltip';
import { TableLazyLoadEvent, TableModule } from 'primeng/table';
import { Cliente } from '../../../../models/Cliente';
import { FiltroGral } from '../../../../models/filtros/FiltroGral';
import { ClientesService } from '../../../../services/clientes.service';
import { NavegacionComponent } from '../../../compartidos/navegacion/navegacion.component';

@Component({
  selector: 'app-listado-clientes',
  standalone: true,
  imports: [
    TableModule,
    Button,
    Dialog,
    AddModClientesComponent,
    TooltipModule,
    NavegacionComponent
  ],
  templateUrl: './listado-clientes.component.html',
  styleUrl: './listado-clientes.component.scss',
})
export class ListadoClientesComponent {
  clientes: Cliente[] = [];
  totalRecords: number = 0;
  loading: boolean = false;
  filtroActual!: FiltroGral;
  
  clienteSeleccionado!: Cliente | undefined;
  mostrarmodalAddMod: boolean = false;

  constructor(
    private clientesService:ClientesService
  ){}

  Buscar(event?: TableLazyLoadEvent, busqueda?: string, recargaConFiltro: boolean = false) {
    this.loading = true;

    const pageIndex = (event?.first ?? 0) / (event?.rows ?? 10); 
    const pageSize = event?.rows ?? 10;

    if (!recargaConFiltro) {
      this.filtroActual = new FiltroGral({
        pagina: pageIndex + 1,  
        tamanioPagina: pageSize,
        busqueda: busqueda
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
      this.Buscar(undefined, undefined, true);

    this.mostrarmodalAddMod = false;
  }
}
