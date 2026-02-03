import { Component } from '@angular/core';
import { Button } from 'primeng/button';
import { TableLazyLoadEvent, TableModule } from 'primeng/table';
import { TooltipModule } from 'primeng/tooltip';
import { CuentaCorriente } from '../../../../models/CuentaCorriente';
import { FiltroGral } from '../../../../models/filtros/FiltroGral';
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { DecimalFormatPipe } from '../../../../pipes/decimal-format.pipe';
import { InputTextModule } from 'primeng/inputtext';
import { AutoCompleteModule } from 'primeng/autocomplete';
import { FloatLabel } from 'primeng/floatlabel';
import { Cliente } from '../../../../models/Cliente';
import { CuentasCorrientesService } from '../../../../services/cuentas-corriente.service';
import { DatePipe, DecimalPipe } from '@angular/common';
import { Router } from '@angular/router';
import { ClientesService } from '../../../../services/clientes.service';

@Component({
  selector: 'app-listado-cuentas',
  standalone: true,
  imports: [
    TableModule,
    Button,
    TooltipModule,
    FormsModule,
    ReactiveFormsModule,
    DatePipe,
    InputTextModule,
    AutoCompleteModule,
    FloatLabel,
    DecimalFormatPipe
],
  templateUrl: './listado-cuentas.component.html',
  styleUrl: './listado-cuentas.component.scss',
})
export class ListadoCuentasComponent {
  cuentas: CuentaCorriente[] = [];
  totalRecords: number = 0;
  loading: boolean = false;
  filtroActual!: FiltroGral;

  clientes: Cliente[] = [];
  clientesFiltrado: Cliente[] = [];
  cliente: FormControl = new FormControl();

  constructor(
    private cuentasService:CuentasCorrientesService,
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
        //busqueda: busqueda,
        // orden:
        // direccion:
      });
    }

    this.cuentasService.ObtenerCuentas(this.filtroActual).subscribe(response => {
      this.cuentas = response.registros;
      this.totalRecords = response.total;
      this.loading = false;
    });
  }

  VerCuenta(idCliente:number, cliente:string, totalDeuda:number){
    this.router.navigate(['/cuentas/administrar', idCliente, cliente]);
  }

  ObtenerClientes(){
    this.clientesService.SelectorClientes(true)
      .subscribe(response => {
        this.clientes = response;
      });
  }

  FiltrarClientes(event: any) {
    const query = event.query.toLowerCase();
    this.clientesFiltrado = this.clientes.filter(c => {
      const nombre = c.nombre!.toLowerCase();
      const dni = c.documento!.toString(); 
      const razon = c.razonSocial!.toString(); 
      return nombre.includes(query) || dni.includes(query) || razon.includes(query);
    });
  }
}
