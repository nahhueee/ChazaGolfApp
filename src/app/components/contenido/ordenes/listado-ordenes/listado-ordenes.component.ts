import { Component, OnInit } from '@angular/core';
import { Button } from 'primeng/button';
import { TableLazyLoadEvent, TableModule } from 'primeng/table';
import { TooltipModule } from 'primeng/tooltip';
import { OrdenIngreso } from '../../../../models/OrdenIngreso';
import { OrdenIngresoService } from '../../../../services/orden-ingreso.service';
import { FiltroOrdenes } from '../../../../models/filtros/FIltroOrdenes';
import { FormControl, FormGroup } from '@angular/forms';
import { Router } from '@angular/router';
import { TagModule } from 'primeng/tag';
import { ProductoOrden } from '../../../../models/ProductoOrden';
import { ProductoImprimir } from '../../../../models/ProductoImprimir';
import { EtiquetasService } from '../../../../services/etiquetas.service';
import { FORMS_IMPORTS } from '../../../../imports/forms.import';
import { AddIngresoComponent } from "../add-ingreso/add-ingreso.component";

@Component({
  selector: 'app-listado-ordenes',
  standalone: true,
  imports: [
    ...FORMS_IMPORTS,
    TableModule,
    Button,
    TooltipModule,
    TagModule,
    AddIngresoComponent
],
  templateUrl: './listado-ordenes.component.html',
  styleUrls: ['./listado-ordenes.component.scss']
})
export class ListadoOrdenesComponent implements OnInit {
  ordenes: OrdenIngreso[] = [];
  totalRecords: number = 0;
  loading: boolean = false;

  filtros:FormGroup;
  filtroActual: FiltroOrdenes = new FiltroOrdenes();

  ordenSeleccionada:OrdenIngreso;
  recepcionesVisible:boolean = false;

  estados = [
    "Nueva", "Pendiente", "Finalizada"
  ]

  constructor(
    private ordenIngresoService:OrdenIngresoService,
    private etiquetasService:EtiquetasService,
    private router:Router
  ) { 
    this.filtros = new FormGroup({
      nroCorte: new FormControl(''),
      estado: new FormControl('')
    });
  }

  ngOnInit() {
  }

  GetSeverity(estado: string): 'info' | 'warn' | 'success' {
    if (!estado) return 'info';

    const value = estado.toLowerCase();

    if (value === 'nueva') {
      return 'info';
    }

    if (value === 'pendiente') {
      return 'warn';
    }

    if (value === 'finalizada') {
      return 'success';
    }

    return 'info';
  }

  Buscar(event?: TableLazyLoadEvent, busqueda?: string) {
    this.loading = true;

    const pageIndex = (event?.first ?? 0) / (event?.rows ?? 10); 
    const pageSize = event?.rows ?? 10;

    this.filtroActual = new FiltroOrdenes({
      pagina: pageIndex + 1,  
      tamanioPagina: pageSize,
      busqueda: busqueda,
      nroCorte: this.filtros.get('nroCorte')?.value ?? 0,
      estado: this.filtros.get('estado')?.value ?? ''
    });

    this.ordenIngresoService.Obtener(this.filtroActual).subscribe(response => {
      this.ordenes = response.registros;
      this.totalRecords = response.total;
      this.loading = false;
    });
  }

  LimpiarFiltros(){
    this.filtros.reset();
    this.Buscar();
  }

  Editar(id:number){
    this.router.navigateByUrl(`/ordenes-ingreso/adm/${id}`)
  }

  NuevaRecepcion(orden:OrdenIngreso){
    this.ordenSeleccionada = orden;
    this.recepcionesVisible = true;
  }

  Actualizar(actualiza){
    this.recepcionesVisible = false;
    if(actualiza)
      this.Buscar();
  }

  Etiquetas(productos:ProductoOrden[]){
    const resultado: ProductoImprimir[] = [];
    productos.forEach((prod) => {
      const cantidadesValidas = Array.from({ length: 10 }, (_, i) =>
        prod[`t${i + 1}` as keyof ProductoOrden] as number | null
      ).filter(v => v != null);

      prod.codigosBarra.forEach((item: any, index: number) => {
        const cantidad = cantidadesValidas[index];

        if (!cantidad || cantidad <= 0) return;

        resultado.push(
          ...Array.from({ length: cantidad }, () => ({
            codigo: item.codigo_barra,
            nombre: prod.nomProducto,
            color: prod.color,
            talle: item.talle
          }))
        );
      });
    });

    this.etiquetasService.GenerarEtiquetas(resultado);
  }
}
