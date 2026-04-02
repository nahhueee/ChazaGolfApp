import { Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges } from '@angular/core';
import { Button } from 'primeng/button';
import { Dialog } from 'primeng/dialog';
import { FORMS_IMPORTS } from '../../../../imports/forms.import';
import { OrdenIngreso } from '../../../../models/OrdenIngreso';
import { TableModule } from 'primeng/table';
import { NotificacionesService } from '../../../../services/notificaciones.service';
import { FormBuilder, FormGroup, FormArray, FormControl, AbstractControl, ValidatorFn, ValidationErrors, Validators } from '@angular/forms';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService } from 'primeng/api';
import { OrdenIngresoService } from '../../../../services/orden-ingreso.service';
import { DetalleRecepcion, Recepcion } from '../../../../models/Recepcion';
import { UsuariosService } from '../../../../services/usuarios.service';
import { ProductoOrden } from '../../../../models/ProductoOrden';
import { TooltipModule } from 'primeng/tooltip';

@Component({
  selector: 'app-add-ingreso',
  standalone: true,
  imports: [
    ...FORMS_IMPORTS,
    Button,
    Dialog,
    TableModule,
    TooltipModule,
    ConfirmDialogModule
  ],
  providers: [ConfirmationService],
  templateUrl: './add-ingreso.component.html',
  styleUrls: ['./add-ingreso.component.scss']
})
export class AddIngresoComponent {
  @Input() visible = false; 
  @Output() cerrar = new EventEmitter<boolean>(); 

  productos: ProductoOrden[] = [];
  idOrden:number = 0;

  @Input()
  set _productosRecepcionar(value: OrdenIngreso | null | undefined) {
    if (!value?.productos) return;
    this.idOrden = value.id!;
    
    const productosClon = JSON.parse(JSON.stringify(value.productos));

    this.productos = productosClon.filter(prod => {
      return this.talles.some((_, i) => {
        const key = this.getKeyByIndex(i);
        return (prod[key] || 0) > 0;
      });
    });

    this.productos.forEach(p => {
      p._original = {};

      this.talles.forEach((_, i) => {
        const key = this.getKeyByIndex(i);
        p._original![key] = p[key]!;
      });
    });

    this.inicializarForm();

  }
  talles = ["XS","S","M","L","XL","XXL","3XL","4XL","5XL","6XL"];
  form!: FormArray;

  constructor(
    private fb: FormBuilder,
    private Notificaciones:NotificacionesService,
    private confirmationService: ConfirmationService,
    private ordenIngresoService:OrdenIngresoService,
    private usuarioService:UsuariosService
  ) {}

  inicializarForm(){
    this.form = this.fb.array(
      this.productos.map(prod => {

        const grupo: any = {};

        this.talles.forEach((_, i) => {
          const key = this.getKeyByIndex(i);
          const valor = prod[key] ?? 0;

          grupo[key] = new FormControl(
            { value: valor, disabled: valor === null || valor === 0 }, 
            [this.maxValidator(valor)] 
          );
        });

        return this.fb.group(grupo);
      })
    );
  }
  
  maxValidator(max: number): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const value = control.value;

      if (value == null || value === '') return null;
      if (value > max) return { max: true };
      if (value < 0) return { min: true };

      return null;
    };
  }

  getKeyByIndex(i: number): string {
    return 't' + (i + 1);
  }
  getControl(rowIndex: number, i: number): FormControl {
    return this.form.at(rowIndex).get(this.getKeyByIndex(i)) as FormControl;
  }
  getTotal(rowIndex: number): number {
    const group = this.form?.at(rowIndex);

    if (!group) return 0;

    return this.talles.reduce((acc, _, i) => {
      const key = this.getKeyByIndex(i);
      return acc + (group.get(key)?.value || 0);
    }, 0);
  }
  getCantidadPendiente(prod: any): number {
    return this.talles.reduce((acc, _, i) => {
      const key = this.getKeyByIndex(i);
      return acc + (prod[key] || 0);
    }, 0);
  }

  selectAll(event: any) {
    event.target.select();
  }

  onBlur(rowIndex: number, i: number) {
    const prod = this.productos[rowIndex];
    const group = this.form.at(rowIndex);

    const key = this.getKeyByIndex(i);
    const control = group.get(key);

    const value = control?.value;
    const max = prod[key] ?? 0;

    if (value == null || value === '') {
      control?.setValue(0);
      return;
    }

    if (value > max) {
      control?.setValue(max);
      this.Notificaciones.Warn(
        `El talle ${this.talles[i]} no puede superar ${max}`
      );
    }
  }

  NoRecepcionar(prod){
    prod.noRecepcionar = !prod.noRecepcionar;
  }
  

  Guardar() {
    this.confirmationService.confirm({
      key: 'confirmarDialog',
      message: '¿Confirmas el ingreso de estos talles de producto?',
      header: 'Confirmación',
      closable: true,
      closeOnEscape: true,
      icon: 'pi pi-exclamation-triangle',
      rejectButtonProps: {
        label: 'Cancelar',
        severity: 'secondary',
        outlined: true,
      },
      acceptButtonProps: {
        label: 'Aceptar',
      },
      accept: () => {
        const recepcion = new Recepcion();
        recepcion.idOrden = this.idOrden;
        recepcion.fecha = new Date();
        recepcion.usuario = this.usuarioService.GetUsuarioSesion()!;
        recepcion.detalles = [];

        this.form.controls.forEach((group, rowIndex) => {
          const prod = this.productos[rowIndex];
          if (prod.noRecepcionar) return;

          this.talles.forEach((_, i) => {
            const key = this.getKeyByIndex(i);
            const ingreso = group.get(key)?.value;

            if (ingreso && ingreso > 0) {
              const detalle = new DetalleRecepcion({
                idProducto: prod.idProducto,
                idLineaTalle: prod.idLineaTalle,
                cantidad: ingreso,
                original: prod[key] ?? 0,
                talle: key, 
              });

              recepcion.detalles.push(detalle);
            }
          });
        });

        this.ordenIngresoService.AgregarRecepcion(recepcion)
        .subscribe(response => {
          if(response=='OK'){
            this.Notificaciones.Success("Recepción creada correctamente");
            this.cerrar.emit(true);
          }else{
            this.Notificaciones.Warn(response);
          }
        });
      },
      reject: () => {},
    });
  }

  Cerrar(){
    this.cerrar.emit(false);
  }
}
