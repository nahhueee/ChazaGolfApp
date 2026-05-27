import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges, inject } from '@angular/core';
import { FormControl, FormGroup, Validators, ReactiveFormsModule, AbstractControl } from '@angular/forms';
import { CommonModule } from '@angular/common';

// PrimeNG
import { DialogModule } from 'primeng/dialog';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { MessageModule } from 'primeng/message';

import { FondosService } from '../../../../services/fondos.service';
import { Caja } from '../../../../models/Caja';
import { SeleccionFondo } from '../../../../models/Caja';
import { FondoConSaldo } from '../../../../models/Caja';
import { DecimalFormatPipe } from '../../../../pipes/decimal-format.pipe';
import { NotificacionesService } from '../../../../services/notificaciones.service';

type Paso = 'cajas' | 'fondos';

@Component({
  selector: 'app-add-transferencia',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule,
    DialogModule, InputNumberModule,
    InputTextModule, ButtonModule, MessageModule,
    DecimalFormatPipe
  ],
  templateUrl: './add-transferencia.component.html',
  styleUrl: './add-transferencia.component.scss',
})
export class AddTransferencia {
  @Input()  visible = false;
  @Input()  usuario = '';
  @Output() visibleChange = new EventEmitter<boolean>();
  @Output() transferido   = new EventEmitter<void>();

  private fondosService = inject(FondosService);
  private notificaciones = inject(NotificacionesService);


  // ── estado general ────────────────────────────────────────────────────────
  paso: Paso = 'cajas';
  cajas: Caja[] = [];
  guardando = false;
  errorMsg  = '';

  // ── selecciones ───────────────────────────────────────────────────────────
  cajaOrigen:  Caja | null = null;
  cajaDestino: Caja | null = null;
  origen:      SeleccionFondo | null = null;
  destino:     SeleccionFondo | null = null;

  readonly formulario = new FormGroup({
    monto:       new FormControl(null, [Validators.required, Validators.min(0.01)]),
    descripcion: new FormControl('', { nonNullable: true, validators: Validators.maxLength(255) })
  });

  // ── lifecycle ─────────────────────────────────────────────────────────────
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['visible']?.currentValue === true) {
      this.fondosService.ObtenerCajasConFondos().subscribe((c: Caja[]) => {
        this.cajas = c;
      });
    }
  }

  // ── paso 1: cajas ─────────────────────────────────────────────────────────
  seleccionarCajaOrigen(caja: Caja): void {
    this.cajaOrigen = caja;
    // si origen y destino quedaron iguales, limpiamos selección de fondo origen
    if (this.origen?.idCaja !== caja.id) {
      this.origen = null;
    }
  }

  seleccionarCajaDestino(caja: Caja): void {
    this.cajaDestino = caja;
    if (this.destino?.idCaja !== caja.id) {
      this.destino = null;
    }
  }

  get puedeContinuar(): boolean {
    return !!this.cajaOrigen && !!this.cajaDestino;
  }

  irAFondos(): void {
    if (!this.puedeContinuar) return;
    this.paso = 'fondos';
  }

  volverACajas(): void {
    this.paso    = 'cajas';
    this.origen  = null;
    this.destino = null;
  }

  // ── paso 2: fondos ────────────────────────────────────────────────────────
  seleccionarOrigen(fondo: FondoConSaldo): void {
    if (this.cajaOrigen?.id === this.cajaDestino?.id && this.esDestino(fondo.idFondo)) return;
    this.origen = {
      idCaja:      this.cajaOrigen!.id,
      idFondo:     fondo.idFondo,
      cajaNombre:  this.cajaOrigen!.nombre,
      fondoNombre: fondo.nombre,
      tipo:        fondo.tipo,
      icono:       fondo.icono,
      saldo:       fondo.saldo
    };
  }

  seleccionarDestino(fondo: FondoConSaldo): void {
    if (this.cajaOrigen?.id === this.cajaDestino?.id && this.esOrigen(fondo.idFondo)) return;
    this.destino = {
      idCaja:      this.cajaDestino!.id,
      idFondo:     fondo.idFondo,
      cajaNombre:  this.cajaDestino!.nombre,
      fondoNombre: fondo.nombre,
      saldo:       fondo.saldo,
      tipo:        fondo.tipo,
      icono:       fondo.icono
    };
  }

  esOrigen(idFondo: number): boolean {
    return this.origen?.idFondo === idFondo && this.origen?.idCaja === this.cajaOrigen?.id;
  }

  esDestino(idFondo: number): boolean {
    return this.destino?.idFondo === idFondo && this.destino?.idCaja === this.cajaDestino?.id;
  }

  // fondo bloqueado: misma caja + mismo fondo en el otro lado
  esBloqueadoEnOrigen(idFondo: number): boolean {
    if (this.cajaOrigen?.id !== this.cajaDestino?.id) return false;
    return this.destino?.idFondo === idFondo;
  }

  esBloqueadoEnDestino(idFondo: number): boolean {
    if (this.cajaOrigen?.id !== this.cajaDestino?.id) return false;
    return this.origen?.idFondo === idFondo;
  }

  // ── validaciones ──────────────────────────────────────────────────────────
  get saldoInsuficiente(): boolean {
    const monto = this.formulario.controls.monto.value;
    if (!this.origen || !monto) return false;
    return monto > this.origen.saldo;
  }

  get puedeGuardar(): boolean {
    return !this.guardando
      && !!this.origen
      && !!this.destino
      && !this.saldoInsuficiente
      && this.formulario.valid;
  }

  // ── submit ────────────────────────────────────────────────────────────────
  guardarTransferencia(): void {
    this.marcarFormulario(this.formulario);
    if (!this.puedeGuardar || !this.origen || !this.destino) return;

    this.guardando = true;

    const payload = {
      idCajaOrigen:   this.origen.idCaja,
      idFondoOrigen:  this.origen.idFondo,
      idCajaDestino:  this.destino.idCaja,
      idFondoDestino: this.destino.idFondo,
      monto:          this.formulario.controls.monto.value!,
      descripcion:    this.formulario.controls.descripcion.value || undefined,
      usuario:        this.usuario
    };

    this.fondosService.RegistrarTransferencia(payload).subscribe({
      next: () => {
        this.transferido.emit();
        this.onHide();
      },
      error: (err: any) => {
        this.notificaciones.Error("Ocurrió un error al intentar realizar la transferencia.")
        this.guardando = false;
      }
    });
  }

  // ── reset ─────────────────────────────────────────────────────────────────
  onHide(): void {
    this.paso        = 'cajas';
    this.cajas       = [];
    this.cajaOrigen  = null;
    this.cajaDestino = null;
    this.origen      = null;
    this.destino     = null;
    this.guardando   = false;
    this.errorMsg    = '';
    this.formulario.reset();
    this.visible = false;
    this.visibleChange.emit(false);
  }

  private marcarFormulario(control: AbstractControl): void {
    control.markAsDirty();
    control.markAsTouched();
    if (control instanceof FormGroup) {
      Object.values(control.controls).forEach(c => this.marcarFormulario(c));
    }
  }
}
