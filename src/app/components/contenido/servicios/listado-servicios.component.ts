import { Component } from '@angular/core';
import { DecimalFormatPipe } from '../../../pipes/decimal-format.pipe';
import { ConfirmPopupModule } from 'primeng/confirmpopup';
import { TooltipModule } from 'primeng/tooltip';
import { TableLazyLoadEvent, TableModule } from 'primeng/table';
import { FORMS_IMPORTS } from '../../../imports/forms.import';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { Servicio } from '../../../models/Servicio';
import { FiltroGral } from '../../../models/filtros/FiltroGral';
import { ServiciosService } from '../../../services/servicios.service';
import { NotificacionesService } from '../../../services/notificaciones.service';
import { ConfirmationService } from 'primeng/api';
import { GlobalesService } from '../../../services/globales.service';

@Component({
  selector: 'app-servicios',
  standalone: true,
  imports: [
     ...FORMS_IMPORTS,
    TableModule,
    TooltipModule,
    ConfirmPopupModule,
    DecimalFormatPipe
  ],
  providers: [ConfirmationService],
  templateUrl: './listado-servicios.component.html',
  styleUrl: './listado-servicios.component.scss',
})
export class ServiciosComponent {
  formulario:FormGroup;
  servicios:Servicio[] = [];

  totalRecords: number = 0;
  loading: boolean = false;
  filtroActual!: FiltroGral;

  editando: boolean = false;
  idEditando: number = 0;
  decimal_mask: any;

  constructor(
    private serviciosService:ServiciosService,
    private Notificaciones:NotificacionesService,
    private confirmationService: ConfirmationService,
    private globalesService:GlobalesService
  ) { 
    this.formulario = new FormGroup({
      codigo: new FormControl(''),
      descripcion: new FormControl('', [Validators.required]),
      sugerido: new FormControl(''),
      topeDescuento: new FormControl(''),
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

    this.serviciosService.Obtener(this.filtroActual).subscribe(response => {
      this.servicios = response.registros;
      this.totalRecords = response.total;
      this.loading = false;
    });
  }

  Editar(seleccionado:Servicio){
    this.editando = true;
    this.idEditando = seleccionado.id!;
    this.formulario.patchValue({
      codigo: seleccionado.codigo,
      descripcion: seleccionado.descripcion,
      sugerido: seleccionado.sugerido!.toString().replace('.', ','),
      topeDescuento: seleccionado.topeDescuento!.toString().replace('.', ','),
    });
  }

  CancelarEdicion(){
    this.editando = false;
    this.formulario.reset();
  }

  EliminarServicio(event: Event, idProducto:number){
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
        this.serviciosService.Eliminar(idProducto)
        .subscribe(response => {
          if(response=='OK'){
            this.Notificaciones.Success("Servicio eliminado correctamente");
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
    const servicio = new Servicio();
    servicio.id = this.idEditando;
    servicio.codigo = this.formulario.value.codigo;
    servicio.descripcion = this.formulario.value.descripcion;
    servicio.sugerido = this.globalesService.EstandarizarDecimal(this.formulario.value.sugerido);

    let topeDescuento = this.formulario.value.topeDescuento == "" ? 100 : this.globalesService.EstandarizarDecimal(this.formulario.value.topeDescuento);;
    servicio.topeDescuento = topeDescuento;

    if(this.editando){
      this.Modificar(servicio);
    }else{
      this.Agregar(servicio);
    }
  }

  Agregar(serv:Servicio){
    this.serviciosService.Agregar(serv)
      .subscribe(response => {
        if(response=='OK'){
          this.Notificaciones.Success("Servicio creado correctamente");
          this.Buscar();
          this.formulario.reset();
        }else{
          this.Notificaciones.Warn(response);
        }
      });
  }

  Modificar(serv:Servicio){
    this.serviciosService.Modificar(serv)
      .subscribe(response => {
        if(response=='OK'){
          this.editando = false;
          this.Notificaciones.Success("Servicio modificado correctamente");
          this.Buscar();
          this.formulario.reset();
        }else{
          this.Notificaciones.Warn(response);
        }
      });
  }
}
