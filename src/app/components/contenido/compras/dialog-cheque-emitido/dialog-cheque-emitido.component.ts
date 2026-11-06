import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { AbstractControl, FormArray, FormControl, FormGroup, Validators } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { DatePickerModule } from 'primeng/datepicker';

import { FORMS_IMPORTS } from '../../../../imports/forms.import';
import { ChequePropioDTO } from '../../../../models/ChequeEmitido';
import { MetodoPago } from '../../../../models/MetodoPago';
import { TIPO_METODO_PAGO_COMPRA } from '../models/compra.constants';

// Cuenta (banco) de la que se libra el cheque propio.
export interface CuentaCheque {
  idFondoBanco: number;
  nombre: string;
}

export interface DatosChequeEmitido {
  importe: number;
  cuentaNombre: string; // solo para mostrar en la mini-tabla de pagos
  cheque: ChequePropioDTO;
}

// Las cuentas disponibles salen de los métodos TRANSFERENCIA de la empresa: el idFondo de cada uno es su banco.
// (Decisión 3-nov-2026: así el combo y la validación del backend usan la misma fuente.)
export function ArmarCuentasCheque(metodos: MetodoPago[]): CuentaCheque[] {
  const cuentas = new Map<number, CuentaCheque>();
  for (const m of metodos) {
    if (m.tipo === TIPO_METODO_PAGO_COMPRA.TRANSFERENCIA && m.idFondo && !cuentas.has(m.idFondo)) {
      cuentas.set(m.idFondo, { idFondoBanco: m.idFondo, nombre: m.fondo ?? `Cuenta ${m.idFondo}` });
    }
  }
  return [...cuentas.values()];
}

@Component({
  selector: 'app-dialog-cheque-emitido',
  standalone: true,
  imports: [
    FORMS_IMPORTS,
    DialogModule,
    DatePickerModule,
  ],
  templateUrl: './dialog-cheque-emitido.component.html',
  styleUrl: './dialog-cheque-emitido.component.css',
})
export class DialogChequeEmitidoComponent implements OnChanges {

  @Input() visible: boolean = false;
  @Input() importeDefault: number = 0;
  @Input() cuentas: CuentaCheque[] = [];
  @Output() visibleChange = new EventEmitter<boolean>();
  @Output() confirmar = new EventEmitter<DatosChequeEmitido>();
  @Output() cancelar = new EventEmitter<void>();

  tipos = [
    { label: 'Cheque físico', value: 'FISICO' },
    { label: 'eCheq', value: 'ECHEQ' },
  ];

  // true cuando el cierre ya lo manejó onConfirmar()/onCancelar() (que llaman a cerrar() y por lo tanto
  // disparan el (onHide) del p-dialog como efecto colateral). Sin este flag, onHide volvía a emitir
  // "cancelar" después de confirmar, pisando lo que el padre ya había guardado (mismo bug que
  // DialogChequeComponent, ver fix-cheque-entrega-dinero-cc).
  private cierreManejado = false;

  form = new FormGroup({
    cuenta: new FormControl<CuentaCheque | null>(null, [Validators.required]),
    tipo: new FormControl<'FISICO' | 'ECHEQ'>('FISICO', [Validators.required]),
    numero: new FormControl('', [Validators.required, Validators.maxLength(30)]),
    importe: new FormControl<number | null>(null, [Validators.required, Validators.min(0.01)]),
    fechaEmision: new FormControl<Date | null>(new Date(), [Validators.required]),
    fechaPago: new FormControl<Date | null>(null, [Validators.required]),
    observaciones: new FormControl('', [Validators.maxLength(255)]),
  });

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['visible']?.currentValue === true) {
      this.form.reset({ tipo: 'FISICO', fechaEmision: new Date() });
      if (this.cuentas.length === 1) this.form.get('cuenta')?.setValue(this.cuentas[0]);
      if (this.importeDefault > 0) this.form.get('importe')?.setValue(this.redondear(this.importeDefault));
    }
  }

  // El importe que llega de afuera suele salir de una resta de floats (total - pagado) y puede traer
  // arrastre de coma flotante; el input es type="number" sin pipe de formato, se ve tal cual.
  private redondear(valor: number): number {
    return Math.round(valor * 100) / 100;
  }

  // Fecha local -> 'YYYY-MM-DD'. No usar toISOString(): pasa a UTC y puede correr el día.
  private aIso(fecha: Date): string {
    const dos = (n: number) => String(n).padStart(2, '0');
    return `${fecha.getFullYear()}-${dos(fecha.getMonth() + 1)}-${dos(fecha.getDate())}`;
  }

  get fechaPagoAnteriorAEmision(): boolean {
    const emision = this.form.get('fechaEmision')?.value;
    const pago = this.form.get('fechaPago')?.value;
    if (!emision || !pago) return false;
    return this.aIso(pago) < this.aIso(emision);
  }

  onConfirmar(): void {
    if (this.form.invalid || this.fechaPagoAnteriorAEmision) {
      this.markFormTouched(this.form);
      return;
    }
    const v = this.form.value;
    const cheque = new ChequePropioDTO();
    cheque.idFondoBanco = v.cuenta!.idFondoBanco;
    cheque.tipo = v.tipo!;
    cheque.numero = (v.numero ?? '').trim();
    cheque.fechaEmision = this.aIso(v.fechaEmision!);
    cheque.fechaPago = this.aIso(v.fechaPago!);
    cheque.observaciones = v.observaciones?.trim() || undefined;

    this.cierreManejado = true;
    this.confirmar.emit({ importe: this.redondear(v.importe!), cuentaNombre: v.cuenta!.nombre, cheque });
    this.cerrar();
  }

  onCancelar(): void {
    this.cierreManejado = true;
    this.cancelar.emit();
    this.cerrar();
  }

  // Único destino de (onHide). Si el cierre ya lo manejó onConfirmar()/onCancelar() no hace nada; si se
  // cerró "solo" (ESC / click afuera) se trata como una cancelación implícita.
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
