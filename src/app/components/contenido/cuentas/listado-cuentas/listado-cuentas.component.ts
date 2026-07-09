import { Component } from '@angular/core';
import { Button } from 'primeng/button';
import { TableLazyLoadEvent, TableModule } from 'primeng/table';
import { TooltipModule } from 'primeng/tooltip';
import { CuentaCorriente } from '../../../../models/CuentaCorriente';
import { FormControl, FormGroup } from '@angular/forms';
import { Cliente } from '../../../../models/Cliente';
import { CuentasCorrientesService } from '../../../../services/cuentas-corriente.service';
import { Router } from '@angular/router';
import { ClientesService } from '../../../../services/clientes.service';
import { CondicionesIva } from '../../../../models/CondicionesIva';
import { FiltroClientes } from '../../../../models/filtros/FiltroClientes';
import { MiscService } from '../../../../services/misc.service';
import { FORMS_IMPORTS } from '../../../../imports/forms.import';
import { TagModule } from 'primeng/tag';
import { EncabezadoSeccionComponent } from '../../../compartidos/encabezado-seccion/encabezado-seccion.component';
import { FilesService } from '../../../../services/files.service';

@Component({
  selector: 'app-listado-cuentas',
  standalone: true,
  imports: [
    TableModule,
    Button,
    TooltipModule,
    TagModule,
    ...FORMS_IMPORTS,
    EncabezadoSeccionComponent,
],
  templateUrl: './listado-cuentas.component.html',
  styleUrl: './listado-cuentas.component.scss',
})
export class ListadoCuentasComponent {
  cuentas: CuentaCorriente[] = [];
  totalRecords: number = 0;
  loading: boolean = false;
  filtroActual!: FiltroClientes;

  clientes: Cliente[] = [];
  filtros:FormGroup;
  condicionesIva: CondicionesIva[] = [];

  condicionesPago = [
    {id: 1, descripcion: 'CONTADO'},
    {id: 2, descripcion: 'CUENTA CORRIENTE'},
    {id: 3, descripcion: 'PAGO DIGITAL'},
    {id: 4, descripcion: 'OTRO'},
  ];

  constructor(
    private cuentasService:CuentasCorrientesService,
    private clientesService:ClientesService,
    private router:Router,
    private miscService:MiscService,
    private filesService:FilesService
  ){
    this.filtros = new FormGroup({
        nombre: new FormControl(''),
        condicionIva: new FormControl(''),
        condicionPago: new FormControl(''),
        documento: new FormControl('')
    });
  }
  
  ngOnInit(){
    this.ObtenerClientes();
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

    this.filtroActual = new FiltroClientes({
      pagina: pageIndex + 1,  
      tamanioPagina: pageSize,
      nombre: this.filtros.get('nombre')?.value ?? '',
      condicionIva: this.filtros.get('condicionIva')?.value ?? '',
      condicionPago: this.filtros.get('condicionPago')?.value ?? '',
      documento: this.filtros.get('documento')?.value ?? ''
    });

    this.cuentasService.ObtenerCuentas(this.filtroActual).subscribe(response => {
      this.cuentas = response.registros;
      this.totalRecords = response.total;
      this.loading = false;
    });
  }

  VerCuenta(idCliente:number, cliente:string, totalDeuda:number){
    this.router.navigate(['/cuentas/administrar', idCliente, cliente]);
  }
  VerEstadistica(id:number, cliente:string){
    this.router.navigate(['/clientes/estadisticas', id, cliente]);
  }

  ObtenerClientes(){
    this.clientesService.SelectorClientes(true)
      .subscribe(response => {
        this.clientes = response;
      });
  }

  LimpiarFiltros(){
    this.filtros.reset();
    this.Buscar();
  }

  // Exporta a Excel solo las cuentas que NO están al día (Debe / A Favor),
  // respetando los mismos filtros de la grilla. El filtrado por "no al día" es
  // fijo en el backend (ver ObtenerQueryParaExcel en cuentasRepository.ts).
  DescargarResultados(){
    if(this.cuentas.length == 0) return;

    this.filesService.DescargarCuentasExcel(this.filtroActual).subscribe(blob => {
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');

      // Fecha en formato DD-MM-YY
      const fecha = new Date();
      const dd = String(fecha.getDate()).padStart(2, '0');
      const mm = String(fecha.getMonth() + 1).padStart(2, '0'); // Meses empiezan en 0
      const yy = String(fecha.getFullYear()).slice(-2); // últimos 2 dígitos del año

      const nombreArchivo = `CuentasCorrientes_${dd}-${mm}-${yy}.xlsx`;

      a.href = url;
      a.download = nombreArchivo;
      a.click();
      window.URL.revokeObjectURL(url);
    });
  }

  GetSeverity(estado: string): 'info' | 'warn' | 'success' {
    const value = estado.toLowerCase();

    if (value === 'al día') {
      return 'info';
    }

    if (value === 'debe') {
      return 'warn';
    }

    if (value === 'a favor') {return 'success';}

    return 'info';
  }
}
