import { Component } from '@angular/core';
import { FORMS_IMPORTS } from '../../../../imports/forms.import';
import { NavegacionComponent } from '../../../compartidos/navegacion/navegacion.component';
import { AccordionModule } from 'primeng/accordion';
import { DatePickerModule } from 'primeng/datepicker';
import { FormControl, FormGroup } from '@angular/forms';
import { Cliente } from '../../../../models/Cliente';

@Component({
  selector: 'app-facturar',
  standalone: true,
  imports: [
    ...FORMS_IMPORTS,
    NavegacionComponent,
    AccordionModule,
    DatePickerModule
  ],
  templateUrl: './facturar.component.html',
  styleUrl: './facturar.component.scss',
})
export class FacturarComponent {
  formGenerales:FormGroup;
  procesos = [
    {id: 1, descripcion: 'FACTURA'},
    {id: 2, descripcion: 'COTIZACION'},
    {id: 3, descripcion: 'SHOWROOM'},
    {id: 4, descripcion: 'DIFUSION'},
    {id: 5, descripcion: 'CON NOTA EMPAQUE'},
  ];

  clienteSeleccionado:Cliente

  constructor(){
    this.formGenerales = new FormGroup({
      proceso: new FormControl(''),
      nroNota: new FormControl({ value: '', disabled: true }),
      fecha: new FormControl(''),
      cliente: new FormControl(''),
      lista: new FormControl(''),
    });
  }


  campoInvalido(campo: string): boolean {
    const control = this.formGenerales.get(campo);
    return !!(control && control.invalid && control.dirty);
  }
}
