import { Component } from '@angular/core';
import { Venta } from '../../../../models/Factura';
import { FiltroGral } from '../../../../models/filtros/FiltroGral';
import { VentasService } from '../../../../services/ventas.service';
import { TableLazyLoadEvent, TableModule } from 'primeng/table';
import { Button } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';
import { ActivatedRoute, Router } from '@angular/router';
import { DecimalFormatPipe } from '../../../../pipes/decimal-format.pipe';
import { DatePipe } from '@angular/common';
import { TagModule } from 'primeng/tag';
import { FiltroVenta } from '../../../../models/filtros/FiltroVenta';

@Component({
  selector: 'app-listado-ventas.component',
  standalone: true,
  imports: [
    TableModule,
    Button,
    TooltipModule,
    DecimalFormatPipe,
    DatePipe,
    TagModule
  ],
  templateUrl: './listado-ventas.component.html',
  styleUrl: './listado-ventas.component.scss',
})
export class ListadoVentasComponent {
  ventas: Venta[] = [];
  totalRecords: number = 0;
  loading: boolean = false;
  filtroActual!: FiltroGral;
  tipo: 'factura' | 'pre' = 'factura';
  primeraCarga = true;
  
  constructor(
    private ventasService:VentasService,
    private router:Router,
    private rutaActiva: ActivatedRoute
  ){}

  ngOnInit() {
    this.rutaActiva.queryParams.subscribe(params => {
      this.tipo = params['tipo'] ?? 'factura';

      this.Buscar();
    });
  }

  Buscar(event?: TableLazyLoadEvent, busqueda?: string, recargaConFiltro: boolean = false) {
    if (this.primeraCarga) {
      this.primeraCarga = false;
      return; // ignora la carga automática
   }
   
    this.loading = true;

    const pageIndex = (event?.first ?? 0) / (event?.rows ?? 10); 
    const pageSize = event?.rows ?? 10;

    if (!recargaConFiltro) {
      this.filtroActual = new FiltroVenta({
        pagina: pageIndex + 1,  
        tamanioPagina: pageSize,
        busqueda: busqueda,
        tipo: this.tipo
      });
    }

    this.ventasService.ObtenerVentas(this.filtroActual).subscribe(response => {
      this.ventas = response.registros;
      this.totalRecords = response.total;
      this.loading = false;
    });
  }

  Editar(id:number){
    this.router.navigate(
      ['/ventas/administrar', id],
      { queryParams: { tipo: this.tipo} }
    );
  }
}
