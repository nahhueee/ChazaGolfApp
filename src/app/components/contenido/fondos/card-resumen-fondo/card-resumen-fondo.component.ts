import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { CardModule } from 'primeng/card';
import { DecimalFormatPipe } from '../../../../pipes/decimal-format.pipe';

@Component({
  selector: 'app-card-resumen-fondo',
  standalone: true,
  imports: [
    CommonModule,
    CardModule,
    DecimalFormatPipe
  ],
  templateUrl: './card-resumen-fondo.component.html',
  styleUrls: ['./card-resumen-fondo.component.scss']
})
export class CardResumenFondoComponent implements OnInit {
  @Input() nombre:          string = '';
  @Input() icono:           string = '';
  @Input() saldoTotal:      number = 0;   
  @Input() ingresosPeriodo: number = 0;   
  @Input() egresosPeriodo:  number = 0;   
  @Input() netoPeriodo:     number = 0;   
  @Input() movimientos:     number = 0;
  @Input() seleccionado:    boolean = false;
  @Output() seleccionar = new EventEmitter<void>();

  constructor() { }

  ngOnInit() {
  }

  formatearMonto(valor: number): string {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      notation: 'compact',
      maximumFractionDigits: 1
    }).format(valor);
  }

}
