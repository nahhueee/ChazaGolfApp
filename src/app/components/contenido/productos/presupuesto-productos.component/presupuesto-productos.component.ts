import { Component } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { FORMS_IMPORTS } from '../../../../imports/forms.import';
import { ProductoPresupuesto } from '../../../../models/ProductoPresupuesto';
import { TableLazyLoadEvent, TableModule } from 'primeng/table';
import { FiltroGral } from '../../../../models/filtros/FiltroGral';
import { ProductosService } from '../../../../services/productos.service';
import { TooltipModule } from 'primeng/tooltip';
import { NotificacionesService } from '../../../../services/notificaciones.service';
import { ConfirmationService } from 'primeng/api';
import { GlobalesService } from '../../../../services/globales.service';
import { ConfirmPopupModule } from 'primeng/confirmpopup';
import { DecimalFormatPipe } from '../../../../pipes/decimal-format.pipe';

@Component({
  selector: 'app-presupuesto-productos.component',
  standalone: true,
  imports: [
    ...FORMS_IMPORTS,
    TableModule,
    TooltipModule,
    ConfirmPopupModule,
    DecimalFormatPipe
  ],
  providers: [ConfirmationService],
  templateUrl: './presupuesto-productos.component.html',
  styleUrl: './presupuesto-productos.component.scss',
})
export class PresupuestoProductosComponent {
  formulario:FormGroup;
  productosPresupuesto:ProductoPresupuesto[] = [];

  totalRecords: number = 0;
  loading: boolean = false;
  filtroActual!: FiltroGral;

  editando: boolean = false;
  idEditando: number = 0;
  decimal_mask: any;

  constructor(
    private productosService:ProductosService,
    private Notificaciones:NotificacionesService,
    private confirmationService: ConfirmationService,
    private globalesService:GlobalesService
  ) { 
    this.formulario = new FormGroup({
      codigo: new FormControl(''),
      nombre: new FormControl('', [Validators.required]),
      sugerido: new FormControl(''),
    });
  }

  SelectContent(event: FocusEvent) {
    const input = event.target as HTMLInputElement;
    input.select();
  }

  campoInvalido(campo: string): boolean {
    const control = this.formulario.get(campo);
    return !!(control && control.invalid && control.dirty);
  }

  ngAfterViewInit() {
    setTimeout(() => {
      //Configuracion para la mascara decimal Imask
      this.decimal_mask = {
        mask: Number,
        scale: 2,
        thousandsSeparator: '.',
        radix: ',',
        normalizeZeros: true,
        padFractionalZeros: true,
        lazy: false,
        signed: true
      }
    },0);
  }

  Buscar(event?: TableLazyLoadEvent) {
    this.loading = true;

    const pageIndex = (event?.first ?? 0) / (event?.rows ?? 10); 
    const pageSize = event?.rows ?? 10;

    this.filtroActual = new FiltroGral({
      pagina: pageIndex + 1,  
      tamanioPagina: pageSize,
      busqueda: ''
    });

    this.productosService.ObtenerProductosPresupuesto(this.filtroActual).subscribe(response => {
      this.productosPresupuesto = response.registros;
      this.totalRecords = response.total;
      this.loading = false;
    });
  }

  Editar(seleccionado:ProductoPresupuesto){
    this.editando = true;
    this.idEditando = seleccionado.id!;
    this.formulario.patchValue({
      codigo: seleccionado.codigo,
      nombre: seleccionado.nombre,
      sugerido: seleccionado.sugerido!.toString().replace('.', ','),
    });
  }

  CancelarEdicion(){
    this.editando = false;
    this.formulario.reset();
  }

  EliminarProducto(event: Event, idProducto:number){
    this.confirmationService.confirm({
      target: event.target as EventTarget, 
      message: '¿Borrar el registro?',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Sí',
      rejectLabel: 'No',
      rejectButtonProps: {
          severity: 'secondary',
          outlined: true
      },
      accept: () => {
        this.productosService.EliminarProdPresupuesto(idProducto)
        .subscribe(response => {
          if(response=='OK'){
            this.Notificaciones.Success("Producto eliminado correctamente");
            this.Buscar();
          }else{
            this.Notificaciones.Warn(response);
          }
        });
      }
    });
  }

  Guardar(){
    if(this.formulario.invalid) return;

    const productoPresupuesto = new ProductoPresupuesto({
      codigo: this.formulario.value.codigo,
      nombre: this.formulario.value.nombre,
      sugerido: this.globalesService.EstandarizarDecimal(this.formulario.value.sugerido),
    });

    if(this.editando){
      this.Modificar(productoPresupuesto);
    }else{
      this.Agregar(productoPresupuesto);
    }
  }

  Agregar(producto:ProductoPresupuesto){
    this.productosService.AgregarProdPresupuesto(producto)
      .subscribe(response => {
        if(response=='OK'){
          this.Notificaciones.Success("Producto creado correctamente");
          this.Buscar();
          this.formulario.reset();
        }else{
          this.Notificaciones.Warn(response);
        }
      });
  }

  Modificar(producto:ProductoPresupuesto){
    producto.id = this.idEditando;
    this.productosService.ModificarProdPresupuesto(producto)
      .subscribe(response => {
        if(response=='OK'){
          this.editando = false;
          this.Notificaciones.Success("Producto modificado correctamente");
          this.Buscar();
          this.formulario.reset();
        }else{
          this.Notificaciones.Warn(response);
        }
      });
  }
}
