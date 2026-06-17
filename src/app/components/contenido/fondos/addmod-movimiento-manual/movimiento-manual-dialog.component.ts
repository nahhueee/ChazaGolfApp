import { CommonModule } from '@angular/common';
import { Component, DestroyRef, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
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
import { FondosService } from '../../../../services/fondos.service';

export type TipoMovimientoManual = 'INGRESO' | 'EGRESO' | 'AJUSTE';
export type TipoMovimientoPayload = 'INGRESO' | 'EGRESO';

export interface Fondo {
  id: number;
  nombre: string;
  tipo: string;
}

export interface Empresa {
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
  empresa: FormControl<Empresa | null>;
  monto: FormControl<number | null>;
  descripcion: FormControl<string>;
  observaciones: FormControl<string>;
  usuario: FormControl<string>;
};

const FONDOS_CON_EMPRESA: string[] = ['BANCARIO', 'DIGITAL'];

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
export class AddmodMovimientoManualComponent implements OnChanges, OnInit {
  @Input() tipoMovimiento: TipoMovimientoManual = 'INGRESO';
  @Input() fondos: Fondo[] = [];

  @Input() visible = false;
  @Output() visibleChange = new EventEmitter<boolean>();
  @Output() guardar = new EventEmitter<MovimientoFondo>();

  guardando = false;
  empresas: Empresa[] = [];
  sinEmpresasDisponibles = false;

  private fondosService = inject(FondosService);
  private destroyRef = inject(DestroyRef);

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
    empresa: new FormControl<Empresa | null>(null),
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

  ngOnInit(): void {
    this.formulario.controls.fondo.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(fondo => this.onFondoChange(fondo));
  }

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

  get mostrarEmpresa(): boolean {
    const fondo = this.formulario.controls.fondo.value;
    return !!fondo && FONDOS_CON_EMPRESA.includes(fondo.tipo);
  }

  get formularioBloqueado(): boolean {
    return this.guardando;
  }

  get puedeGuardar(): boolean {
    return !this.guardando && !this.sinEmpresasDisponibles;
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
    movimiento.idEmpresa = this.formulario.controls.empresa.value?.id ?? null;
    movimiento.monto = monto;
    movimiento.descripcion = this.formulario.controls.descripcion.value.trim();
    movimiento.observaciones = observaciones;

    if (this.tipoMovimiento === 'EGRESO')
      movimiento.origen = 'EGRESO_MANUAL';
    else if (this.tipoMovimiento === 'INGRESO')
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

  private onFondoChange(fondo: Fondo | null): void {
    const empresaCtrl = this.formulario.controls.empresa;

    // Siempre resetear empresa al cambiar de fondo
    empresaCtrl.setValue(null, { emitEvent: false });
    this.empresas = [];
    this.sinEmpresasDisponibles = false;

    if (fondo && FONDOS_CON_EMPRESA.includes(fondo.tipo)) {
      empresaCtrl.setValidators([Validators.required]);
      empresaCtrl.updateValueAndValidity({ emitEvent: false });

      this.fondosService.ObtenerEmpresasPorFondo(fondo.id)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (lista) => {
            this.empresas = lista ?? [];
            this.sinEmpresasDisponibles = this.empresas.length === 0;
          },
          error: () => {
            this.empresas = [];
            this.sinEmpresasDisponibles = true;
          }
        });
    } else {
      empresaCtrl.setValidators([]);
      empresaCtrl.updateValueAndValidity({ emitEvent: false });
    }
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
