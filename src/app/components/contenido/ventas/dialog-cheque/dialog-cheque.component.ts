import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { FORMS_IMPORTS } from '../../../../imports/forms.import';
import { DialogModule } from 'primeng/dialog';
import { DatePickerModule } from 'primeng/datepicker';
import { DividerModule } from 'primeng/divider';
import { AbstractControl, FormArray, FormControl, FormGroup, Validators } from '@angular/forms';

export interface DatosCheque {
  numero:         string;
  banco:          string;
  importe:        number;
  fechaCobro:     Date;
  libradorNombre: string;
  libradorCuit:   string;
}

@Component({
  selector: 'app-dialog-cheque',
  standalone: true,
  imports: [
    FORMS_IMPORTS,
    DialogModule,
    DatePickerModule,
    DividerModule,
  ],
  templateUrl: './dialog-cheque.component.html',
  styleUrl: './dialog-cheque.component.scss',
})
export class DialogChequeComponent implements OnChanges {

  @Input()  visible: boolean = false;
  @Input()  importeDefault: number = 0;
  /** Cuando se pasa, el dialog abre en modo edición con los datos precargados */
  @Input()  datosCheque: DatosCheque | null = null;
  @Output() visibleChange = new EventEmitter<boolean>();
  @Output() confirmar     = new EventEmitter<DatosCheque>();
  @Output() cancelar      = new EventEmitter<void>();

  modoEdicion = false;

  form = new FormGroup({
    numero:         new FormControl('',     [Validators.required]),
    banco:          new FormControl('',     [Validators.required]),
    importe:        new FormControl<number | null>(null, [Validators.required, Validators.min(0.01)]),
    fechaCobro:     new FormControl<Date | null>(null, [Validators.required]),
    libradorNombre: new FormControl(''),
    libradorCuit:   new FormControl('', [Validators.pattern(/^[2037][0-9]{9}[0-9]$/)]),
  });

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['visible']?.currentValue === true) {
      this.modoEdicion = !!this.datosCheque;
      this.form.reset();

      if (this.datosCheque) {
        // Modo edición: precargar datos existentes
        this.form.patchValue({
          numero:         this.datosCheque.numero,
          banco:          this.datosCheque.banco,
          importe:        this.datosCheque.importe,
          fechaCobro:     new Date(this.datosCheque.fechaCobro),
          libradorNombre: this.datosCheque.libradorNombre,
          libradorCuit:   this.datosCheque.libradorCuit,
        });
      } else if (this.importeDefault > 0) {
        this.form.get('importe')?.setValue(this.importeDefault);
      }
    }
  }

  onConfirmar(): void {
    if (this.form.invalid) {
      this.markFormTouched(this.form);
      return;
    }
    const v = this.form.value;
    this.confirmar.emit({
      numero:         v.numero!,
      banco:          v.banco!,
      importe:        v.importe!,
      fechaCobro:     v.fechaCobro!,
      libradorNombre: v.libradorNombre ?? '',
      libradorCuit:   v.libradorCuit   ?? '',
    });
    this.cerrar();
  }

  onCancelar(): void {
    this.cancelar.emit();
    this.cerrar();
  }

  private cerrar(): void {
    this.visible = false;
    this.visibleChange.emit(false);
  }

  // Marca todos los campos touched + dirty para que PrimeNG pinte ng-invalid
  markFormTouched(control: AbstractControl): void {
    if (control instanceof FormGroup || control instanceof FormArray) {
      Object.values(control.controls).forEach(c => this.markFormTouched(c));
    } else {
      control.markAsTouched();
      control.markAsDirty();
    }
  }

  campoInvalido(name: string): boolean {
    const c = this.form.get(name);
    return !!(c && c.invalid && c.dirty);
  }

  campo(name: string): AbstractControl {
    return this.form.get(name)!;
  }
}
