import { CommonModule } from '@angular/common';
import { Component, Input, OnInit } from '@angular/core';
import { CardModule } from 'primeng/card';

@Component({
  selector: 'app-card-resumen',
  templateUrl: './card-resumen.component.html',
  styleUrls: ['./card-resumen.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    CardModule
  ]
})
export class CardResumenComponent implements OnInit {
  @Input() titulo!: string;
  @Input() valor!: number;
  @Input() subtitulo!: string;
  @Input() tipo: 'success' | 'danger' | 'warning' | 'info' | 'neutral';
  
  constructor() { }

  ngOnInit() {
  }

  formatearMonto(valor: number): string {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(valor);
  }
}
