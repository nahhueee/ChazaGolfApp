import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import {
  AbstractControl,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { Dialog } from 'primeng/dialog';
import { FloatLabel } from 'primeng/floatlabel';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { SelectModule } from 'primeng/select';
import { TextareaModule } from 'primeng/textarea';
import { MovimientoFondo } from '../../../../models/Movimiento';

export type TipoMovimientoManual = 'INGRESO' | 'EGRESO' | 'AJUSTE';
export type TipoMovimientoPayload = 'INGRESO' | 'EGRESO';

export interface Fondo {
  id: number;
  nombre: string;
}

interface OpcionTipoAjuste {
  label: string;
  value: TipoMovimientoPayload;
}

type MovimientoManualForm = {
  tipoAjuste: FormControl<TipoMovimientoPayload>;
  fondo: FormControl<Fondo | null>;
  monto: FormControl<number | null>;
  descripcion: FormControl<string>;
  observaciones: FormControl<string>;
  usuario: FormControl<string>;
};

@Component({
  selector: 'app-addmod-movimiento-manual',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    ButtonModule,
    FloatLabel,
    InputNumberModule,
    InputTextModule,
    MessageModule,
    SelectModule,
    TextareaModule,
    Dialog
  ],
  templateUrl: './movimiento-manual-dialog.component.html',
  styleUrl: './movimiento-manual-dialog.component.scss'
})
export class AddmodMovimientoManualComponent implements OnChanges {
  @Input() tipoMovimiento: TipoMovimientoManual = 'INGRESO';
  @Input() fondos: Fondo[] = [];

  @Input() visible = false;
  @Output() visibleChange = new EventEmitter<boolean>();
  @Output() guardar = new EventEmitter<MovimientoFondo>();

  guardando = false;

  readonly tiposAjuste: OpcionTipoAjuste[] = [
    { label: 'Aumentar saldo', value: 'INGRESO' },
    { label: 'Disminuir saldo', value: 'EGRESO' }
  ];

  readonly formulario = new FormGroup<MovimientoManualForm>({
    tipoAjuste: new FormControl<TipoMovimientoPayload>('INGRESO', {
      nonNullable: true,
      validators: [Validators.required]
    }),
    fondo: new FormControl<Fondo | null>(null, [Validators.required]),
    monto: new FormControl<number | null>(null, [Validators.required, Validators.min(0.01)]),
    descripcion: new FormControl<string>('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(160)]
    }),
    observaciones: new FormControl<string>('', {
      nonNullable: true,
      validators: [Validators.maxLength(250)]
    }),
    usuario: new FormControl<string>('', { nonNullable: true })
  });

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['tipoMovimiento']) {
      this.formulario.controls.tipoAjuste.setValue(this.tipoPorDefecto, { emitEvent: false });
      this.formulario.controls.descripcion.setValue('', { emitEvent: false });
      this.formulario.controls.observaciones.setValue('', { emitEvent: false });
      this.formulario.controls.monto.setValue(null, { emitEvent: false });
      this.guardando = false;
    }
  }

  get titulo(): string {
    const titulos: Record<TipoMovimientoManual, string> = {
      INGRESO: 'Registrar Ingreso Manual',
      EGRESO: 'Registrar Egreso Manual',
      AJUSTE: 'Ajuste de Saldo'
    };

    return titulos[this.tipoMovimiento];
  }

  get accionPrincipal(): string {
    const acciones: Record<TipoMovimientoManual, string> = {
      INGRESO: 'Registrar ingreso',
      EGRESO: 'Registrar egreso',
      AJUSTE: 'Aplicar ajuste'
    };

    return acciones[this.tipoMovimiento];
  }

  get descripcionPlaceholder(): string {
    const placeholders: Record<TipoMovimientoManual, string> = {
      INGRESO: 'Ingresos varios',
      EGRESO: 'Retiro para gastos menores',
      AJUSTE: 'Ajuste por diferencia de caja'
    };

    return placeholders[this.tipoMovimiento];
  }

  get mostrarTipoAjuste(): boolean {
    return this.tipoMovimiento === 'AJUSTE';
  }

  get formularioBloqueado(): boolean {
    return this.guardando;
  }

  get puedeGuardar(): boolean {
    return !this.guardando;
  }

  guardarMovimiento(): void {
    this.marcarFormulario(this.formulario);

    if (this.formulario.invalid) {
      return;
    }

    const fondo = this.formulario.controls.fondo.value;
    const monto = this.formulario.controls.monto.value;

    if (!fondo || monto === null) {
      return;
    }

    this.guardando = true;

    const observaciones = this.formulario.controls.observaciones.value.trim();
    const movimiento: MovimientoFondo = new MovimientoFondo();
    movimiento.tipo = this.tipoPayload;
    movimiento.idFondo = fondo.id;
    movimiento.monto = monto;
    movimiento.descripcion = this.formulario.controls.descripcion.value.trim();
    movimiento.observaciones = observaciones;
    
    if(this.tipoMovimiento === 'EGRESO')
      movimiento.origen = 'EGRESO_MANUAL';
    else if(this.tipoMovimiento === 'INGRESO')
      movimiento.origen = 'INGRESO_MANUAL';
    else
      movimiento.origen = 'AJUSTE';

    this.guardar.emit(movimiento);
  }

  campoInvalido(campo: keyof MovimientoManualForm): boolean {
    const control = this.formulario.controls[campo];
    return control.invalid && (control.dirty || control.touched);
  }

  mensajeError(campo: keyof MovimientoManualForm): string {
    const control = this.formulario.controls[campo];

    if (control.hasError('required')) {
      return 'Campo obligatorio';
    }

    if (control.hasError('min')) {
      return 'El monto debe ser mayor a cero';
    }

    if (control.hasError('maxlength')) {
      return 'El texto supera el largo permitido';
    }

    return 'Valor inválido';
  }

  private get tipoPorDefecto(): TipoMovimientoPayload {
    return this.tipoMovimiento === 'EGRESO' ? 'EGRESO' : 'INGRESO';
  }

  private get tipoPayload(): TipoMovimientoPayload {
    if (this.tipoMovimiento === 'AJUSTE') {
      return this.formulario.controls.tipoAjuste.value;
    }

    return this.tipoPorDefecto;
  }

  private marcarFormulario(control: AbstractControl): void {
    control.markAsDirty();
    control.markAsTouched();

    if (control instanceof FormGroup) {
      Object.values(control.controls).forEach(campo => this.marcarFormulario(campo));
    }
  }

  onHide() {
    this.guardando = false;
    this.visible = false;
    this.visibleChange.emit(false);
  }
}
