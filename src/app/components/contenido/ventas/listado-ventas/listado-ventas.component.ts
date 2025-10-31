import { Component } from '@angular/core';
import { Venta } from '../../../../models/Factura';
import { FiltroGral } from '../../../../models/filtros/FiltroGral';
import { VentasService } from '../../../../services/ventas.service';
import { TableLazyLoadEvent, TableModule } from 'primeng/table';
import { Button } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';
import { NavegacionComponent } from '../../../compartidos/navegacion/navegacion.component';
import { Router } from '@angular/router';
import { DecimalFormatPipe } from '../../../../pipes/decimal-format.pipe';
import { DatePipe } from '@angular/common';

@Component({
  selector: 'app-listado-ventas.component',
  standalone: true,
  imports: [
    TableModule,
    Button,
    TooltipModule,
    NavegacionComponent,
    DecimalFormatPipe,
    DatePipe
  ],
  templateUrl: './listado-ventas.component.html',
  styleUrl: './listado-ventas.component.scss',
})
export class ListadoVentasComponent {
  ventas: Venta[] = [];
  totalRecords: number = 0;
  loading: boolean = false;
  filtroActual!: FiltroGral;
  
  constructor(
    private ventasService:VentasService,
    private router:Router
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

    this.ventasService.ObtenerVentas(this.filtroActual).subscribe(response => {
      console.log(response)
      this.ventas = response.registros;
      this.totalRecords = response.total;
      this.loading = false;
    });
  }

  Editar(id:number){
    this.router.navigateByUrl(`/ventas/administrar/${id}`);
  }
}
