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

  // true cuando el cierre del dialog ya fue manejado explícitamente por
  // onConfirmar()/onCancelar() (que llaman a cerrar() y por lo tanto disparan
  // el (onHide) del p-dialog como efecto colateral). Sin este flag, onHide
  // volvía a emitir "cancelar" incluso después de confirmar, pisando los
  // datos que el padre ya había guardado.
  private cierreManejado = false;

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
          importe:        this.redondearImporte(this.datosCheque.importe),
          fechaCobro:     new Date(this.datosCheque.fechaCobro),
          libradorNombre: this.datosCheque.libradorNombre,
          libradorCuit:   this.datosCheque.libradorCuit,
        });
      } else if (this.importeDefault > 0) {
        this.form.get('importe')?.setValue(this.redondearImporte(this.importeDefault));
      }
    }
  }

  // El importe que llega de afuera (importeDefault/datosCheque.importe) suele
  // salir de una resta de floats (ej. montoRestante = total - entregado) y
  // puede traer arrastre de coma flotante (36602.500000000004). El input es
  // type="number" nativo, sin pipe de formato de por medio, así que sin este
  // redondeo se ve tal cual en pantalla. Se redondea acá, en el único punto de
  // entrada de datos al form, en vez de en cada lugar que calcula un monto
  // (addmod-ventas, entrega-dinero, futuros llamadores).
  private redondearImporte(valor: number): number {
    return Math.round(valor * 100) / 100;
  }

  onConfirmar(): void {
    if (this.form.invalid) {
      this.markFormTouched(this.form);
      return;
    }
    const v = this.form.value;
    this.cierreManejado = true;
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
    this.cierreManejado = true;
    this.cancelar.emit();
    this.cerrar();
  }

  // Único destino de (onHide) del p-dialog. Se dispara SIEMPRE que el dialog
  // se cierra (botones de abajo, ESC, click afuera). Si el cierre ya fue
  // manejado por onConfirmar()/onCancelar() no hacemos nada más (evita
  // duplicar/pisar el evento). Si se cerró "solo" (ESC/afuera) lo tratamos
  // como una cancelación implícita.
  onDialogHide(): void {
    if (this.cierreManejado) {
      this.cierreManejado = false;
      return;
    }
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
