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
import { OrdenIngresoReporteService } from '../../../../services/orden-ingreso-reporte.service';
import { ConfirmationService } from 'primeng/api';
import { NotificacionesService } from '../../../../services/notificaciones.service';
import { ConfirmPopupModule } from 'primeng/confirmpopup';

@Component({
  selector: 'app-listado-ordenes',
  standalone: true,
  imports: [
    ...FORMS_IMPORTS,
    TableModule,
    Button,
    TooltipModule,
    TagModule,
    ConfirmPopupModule,
    AddIngresoComponent
],
  templateUrl: './listado-ordenes.component.html',
  styleUrls: ['./listado-ordenes.component.scss'],
  providers: [ConfirmationService],
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
    "Nueva", "Pendiente", "Finalizada", "Incompleta"
  ]

  constructor(
    private ordenIngresoService:OrdenIngresoService,
    private etiquetasService:EtiquetasService,
    private ordenesIngresoReporteService:OrdenIngresoReporteService,
    private confirmationService: ConfirmationService,
    private Notificaciones: NotificacionesService,
    private router:Router
  ) { 
    this.filtros = new FormGroup({
      nroOrden: new FormControl(''),
      nroCorte: new FormControl(''),
      estado: new FormControl('')
    });
  }

  ngOnInit() {
  }

  GetSeverity(estado: string): 'info' | 'warn' | 'success' | 'danger' {
    if (!estado) return 'info';

    const value = estado.toLowerCase();

    if (value === 'nueva') {
      return 'info';
    }

    if (value === 'pendiente') {
      return 'warn';
    }

    if (value === 'finalizada' || value === 'incompleta') {
      return 'success';
    }

    if (value === 'anulada') {
      return 'danger';
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
      nroOrden: this.filtros.get('nroOrden')?.value ?? 0,
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

  Visualizar(id:number){
    this.router.navigateByUrl(`/ordenes-ingreso/adm/${id}`)
  }

  NuevaRecepcion(orden:OrdenIngreso){
    this.ordenSeleccionada = orden;
    this.recepcionesVisible = true;
  }

  AnularRecepcion(event: Event, idOrden:number){
    this.confirmationService.confirm({
      target: event.target as EventTarget, 
      message: '¿Anular esta orden de ingreso?',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Sí',
      rejectLabel: 'No',
      rejectButtonProps: {
          severity: 'secondary',
          outlined: true
      },
      accept: () => {
        this.ordenIngresoService.Eliminar(idOrden).subscribe(response => {
          if(response == "OK"){
            this.Notificaciones.Success("Orden de ingreso anulada correctamente");
            this.Buscar();
          }else{
            this.Notificaciones.Error("No se pudo anular la orden de ingreso");
          }
        });
      }
    });
  }

  Actualizar(actualiza){
    this.recepcionesVisible = false;
    if(actualiza)
      this.Buscar();
  }

  Imprimir(orden:OrdenIngreso){
    this.ordenesIngresoReporteService.VerReporte(orden);
  }

  Etiquetas(productos:ProductoOrden[]){
    const resultado: ProductoImprimir[] = [];

    productos.forEach((prod) => {
      prod.codigosBarra.forEach((item: any) => {
        const cantidad = prod[`t${item.posicion}` as keyof ProductoOrden] as number;
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
