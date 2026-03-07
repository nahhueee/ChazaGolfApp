import { Component } from '@angular/core';
import { Button } from 'primeng/button';
import { Dialog } from 'primeng/dialog';
import { AddModClientesComponent } from '../addmod-clientes/addmod-clientes.component';
import { TooltipModule } from 'primeng/tooltip';
import { TableLazyLoadEvent, TableModule } from 'primeng/table';
import { Cliente } from '../../../../models/Cliente';
import { FiltroGral } from '../../../../models/filtros/FiltroGral';
import { ClientesService } from '../../../../services/clientes.service';
import { Router } from '@angular/router';
import { AutoCompleteModule } from 'primeng/autocomplete';
import { FloatLabel } from 'primeng/floatlabel';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
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
    FloatLabel,
    FormsModule,
    ReactiveFormsModule,
  ],
  templateUrl: './listado-clientes.component.html',
  styleUrl: './listado-clientes.component.scss',
})
export class ListadoClientesComponent {
  totalRecords: number = 0;
  loading: boolean = false;
  filtroActual!: FiltroGral;
  
  clientes: Cliente[] = [];
  clientesTodos: Cliente[] = [];
  clientesFiltrados:Cliente[]=[];
  cliente: FormControl = new FormControl();

  clienteSeleccionado!: Cliente | undefined;
  mostrarmodalAddMod: boolean = false;

  constructor(
    private clientesService:ClientesService,
    private router:Router
  ){}

  ngOnInit(){
    this.ObtenerClientes();
  }

  Buscar(event?: TableLazyLoadEvent, recargaConFiltro: boolean = false) {
    this.loading = true;

    const pageIndex = (event?.first ?? 0) / (event?.rows ?? 10); 
    const pageSize = event?.rows ?? 10;

    if (!recargaConFiltro) {
      this.filtroActual = new FiltroGral({
        pagina: pageIndex + 1,  
        tamanioPagina: pageSize,
        busqueda: this.cliente.value
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

  ObtenerClientes(){
    this.clientesService.SelectorClientes()
      .subscribe(response => {
        this.clientesTodos = response;
      });
  }
  
  FiltrarClientes(event: any) {
    const query = event.query.toLowerCase();
    this.clientesFiltrados = this.clientesTodos.filter(c => {
      const nombre = c.nombre!.toLowerCase();
      const dni = c.documento!.toString(); 
      const razon = c.razonSocial!.toLowerCase();
      return nombre.includes(query) || dni.includes(query) || razon.includes(query);
    });
  }

  LimpiarFiltro(){
    this.cliente.reset();
    this.Buscar();
  }
}
