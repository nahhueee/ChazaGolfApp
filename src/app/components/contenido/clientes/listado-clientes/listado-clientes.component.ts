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
import { CategoriaCliente } from '../../../../models/CategoriaCliente';
import { FORMS_IMPORTS } from '../../../../imports/forms.import';
import { FilesService } from '../../../../services/files.service';
import { TextareaModule } from 'primeng/textarea';
import { NotificacionesService } from '../../../../services/notificaciones.service';
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
    TextareaModule,
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

  categorias: CategoriaCliente[] = [];

  // Mismos ids que listasPrecio en addmod-clientes.component.ts (no hay tabla en BD).
  listasPrecio = [
    {id: 1, descripcion: 'CONSUMIDOR FINAL'},
    {id: 2, descripcion: 'LISTA 3'},
    {id: 4, descripcion: 'LISTA 4'},
    {id: 5, descripcion: 'LISTA 4.5'},
    {id: 6, descripcion: 'LISTA 5'},
  ];

  clienteSeleccionado!: Cliente | undefined;
  mostrarmodalAddMod: boolean = false;

  bajaVisible: boolean = false;
  clienteBaja!: Cliente;
  motivoBaja: string = '';

  filtros:FormGroup;

  constructor(
    private clientesService:ClientesService,
    private miscService:MiscService,
    private filesService:FilesService,
    private notificaciones:NotificacionesService,
    private router:Router
  ){
    this.filtros = new FormGroup({
      nombre: new FormControl(''),
      condicionIva: new FormControl(''),
      categoria: new FormControl(''),
      listaPrecio: new FormControl(''),
      documento: new FormControl('')
    });
  }

  ngOnInit(){
    this.ObtenerCondicionesIva();
    this.ObtenerCategorias();
  }

  ObtenerCondicionesIva(){
    this.miscService.ObtenerCondicionesIva()
      .subscribe(response => {
        this.condicionesIva = response;
      });
  }

  ObtenerCategorias(){
    this.miscService.ObtenerCategoriasCliente()
      .subscribe(response => {
        this.categorias = response;
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
        categoria: this.filtros.get('categoria')?.value ?? '',
        listaPrecio: this.filtros.get('listaPrecio')?.value ?? '',
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

  AbrirDarBaja(cliente:Cliente){
    this.clienteBaja = cliente;
    this.motivoBaja = '';
    this.bajaVisible = true;
  }

  ConfirmarDarBaja(){
    if (!this.motivoBaja?.trim()) return;

    this.clientesService.DarBaja(this.clienteBaja.id, this.motivoBaja.trim())
      .subscribe({
        next: () => {
          this.notificaciones.Success(`Cliente ${this.clienteBaja.nombre} dado de baja correctamente`);
          this.bajaVisible = false;
          this.Buscar(undefined, true);
        },
        // El interceptor global ya muestra un toast genérico para el 400; este agrega
        // el motivo específico del bloqueo que devuelve DarBajaCliente.
        error: (e) => this.notificaciones.Error(e?.error ?? 'No se pudo dar de baja el cliente.')
      });
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
