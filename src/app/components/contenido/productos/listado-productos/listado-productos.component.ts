import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { NotificacionesService } from '../../../../services/notificaciones.service';
import { ParametrosService } from '../../../../services/parametros.service';
import { ProductosService } from '../../../../services/productos.service';
import { MiscService } from '../../../../services/misc.service';
import { NavegacionComponent } from '../../../compartidos/navegacion/navegacion.component';
import { TooltipModule } from 'primeng/tooltip';
import { AddModClientesComponent } from '../../clientes/addmod-clientes/addmod-clientes.component';
import { Dialog } from 'primeng/dialog';
import { Button } from 'primeng/button';
import { TableLazyLoadEvent, TableModule } from 'primeng/table';
import { LineasTalle, Producto } from '../../../../models/Producto';
import { FiltroProducto } from '../../../../models/filtros/FiltroProducto';
import { FormControl } from '@angular/forms';
import { crearFiltros, PropKey } from '../../../../models/filtros/FiltroProducto.config';
import { Observable, Subscription } from 'rxjs';
import { FilesService } from '../../../../services/files.service';
import { AddmodProductosComponent } from '../addmod-productos.component/addmod-productos.component';
import { CommonModule } from '@angular/common';
import { TemaService } from '../../../../services/tema.service';
import { InputTextModule } from 'primeng/inputtext';
import { FormsModule } from '@angular/forms';
import { FloatLabel } from 'primeng/floatlabel';
import { ReactiveFormsModule } from '@angular/forms';
import { SelectModule } from 'primeng/select';


@Component({
  selector: 'app-listado-productos',
  imports: [
    CommonModule,
    TableModule,
    Button,
    Dialog,
    AddmodProductosComponent,
    TooltipModule,
    NavegacionComponent,
    InputTextModule,
    FormsModule,
    ReactiveFormsModule,
    FloatLabel,
    SelectModule
  ],
  templateUrl: './listado-productos.component.html',
  styleUrl: './listado-productos.component.scss',
})
export class ListadoProductosComponent {
  productos: Producto[] = [];
  totalRecords: number = 0;
  loading: boolean = false;
  filtroActual!: FiltroProducto;
  lineasTalles: LineasTalle[] = [];

  productoSeleccionado: number;
  mostrarmodalAddMod: boolean = false;
  esDark:boolean = false;
  sub!: Subscription;
  primeraCarga:boolean = true;

  //Filtros
  filtros = crearFiltros();
  filtroKeys: PropKey[] = ['procesos', 'temporadas', 'codigo', 'tipos', 'subtipos', 'generos', 'materiales', 'colores']; // para recorrer
  busquedaControl: FormControl = new FormControl('');

  constructor(
    private router:Router,
    private Notificaciones:NotificacionesService, //Servicio de Notificaciones
    private productosService:ProductosService,
    private miscService:MiscService,
    private filesService:FilesService,
    private temaService: TemaService
  ){
    this.esDark = localStorage.getItem('theme') === 'dark';
  }

  ngOnInit(): void {
    this.sub = this.temaService.theme$.subscribe(theme => {
      this.esDark = theme === 'dark';
    });

    //Reacciona al input de busqueda
    this.busquedaControl.valueChanges.subscribe(valor => {
      this.Buscar(valor);
    });

    this.ObtenerLineasTalle();
    
    this.cargarDatos('tipos', this.miscService.ObtenerTiposProducto.bind(this.miscService));
    this.cargarDatos('subtipos', this.miscService.ObtenerSubtiposProducto.bind(this.miscService));
    this.cargarDatos('procesos', this.miscService.ObtenerProcesos.bind(this.miscService));
    this.cargarDatos('generos', this.miscService.ObtenerGeneros.bind(this.miscService));
    this.cargarDatos('materiales', this.miscService.ObtenerMateriales.bind(this.miscService));
    this.cargarDatos('colores', this.miscService.ObtenerColores.bind(this.miscService));
    this.cargarDatos('temporadas', this.miscService.ObtenerTemporadas.bind(this.miscService));
  }

  ngOnDestroy(): void {
    this.sub.unsubscribe();
  }

  ObtenerLineasTalle(){
    this.miscService.ObtenerLineasTalle()
      .subscribe(response => {
        this.lineasTalles = response;
      });
  }

  Buscar(event?: TableLazyLoadEvent, recargaConFiltro = false){
    if (this.primeraCarga) {
      this.primeraCarga = false;
      return;
    }

    this.loading = true;
    
    const pageIndex = (event?.first ?? 0) / (event?.rows ?? 10); 
    const pageSize = event?.rows ?? 10;

    if (!recargaConFiltro) {
      this.filtroActual = new FiltroProducto({
        pagina: pageIndex + 1,  
        tamanioPagina: pageSize,
        busqueda: this.busquedaControl.value,
        proceso: this.filtros.procesos.seleccionado,
        tipo: this.filtros.tipos.seleccionado,
        subtipo: this.filtros.subtipos.seleccionado,
        genero: this.filtros.generos.seleccionado,
        material: this.filtros.materiales.seleccionado,
        color: this.filtros.colores.seleccionado,
        temporada: this.filtros.temporadas.seleccionado
      });
    }

    this.productosService.ObtenerProductos(this.filtroActual).subscribe(response => {
      this.productos = response.registros;
      this.totalRecords = response.total;
      this.loading = false;
    });
  }
  
  Editar(id:number){
    this.productoSeleccionado = id;
    this.mostrarmodalAddMod = true;
  }

  Actualizar(valor:boolean){
    if(valor)
      this.Buscar(undefined, true);

    this.mostrarmodalAddMod = false;
  }

  GetTotal(campo: string): number {
    return this.productos.reduce((acc, obj) => acc + (obj[campo] || 0), 0);
  }

  //Descarga los resultados en excel
  DescargarResultados(){
    if(this.productos.length == 0) return;

    this.filesService.DescargarResultadosExcel(this.filtroActual).subscribe(blob => {
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');

      // Fecha en formato DD-MM-YY
      const fecha = new Date();
      const dd = String(fecha.getDate()).padStart(2, '0');
      const mm = String(fecha.getMonth() + 1).padStart(2, '0'); // Meses empiezan en 0
      const yy = String(fecha.getFullYear()).slice(-2); // últimos 2 dígitos del año

      const nombreArchivo = `Resultados_${dd}-${mm}-${yy}.xlsx`;

      a.href = url;
      a.download = nombreArchivo; 
      a.click();
      window.URL.revokeObjectURL(url);
    });
  }

  //#region FILTROS
   /** Cargar datos los arrays */
  cargarDatos(prop: PropKey, serviceFn: () => Observable<any[]>) {
    serviceFn().subscribe(response => {
      this.filtros[prop].data = response;
      this.filtros[prop].filtrado = response;
    });
  }

  /** Selección de un valor */
  onChange(prop: PropKey, event: any) {
    this.filtros[prop].seleccionado = event.value;
    this.Buscar();
  }
  //#endregion
}
