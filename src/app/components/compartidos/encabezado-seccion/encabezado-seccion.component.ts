import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-encabezado-seccion',
  standalone: true,
  imports: [],
  templateUrl: './encabezado-seccion.component.html',
  styleUrl: './encabezado-seccion.component.scss',
})
export class EncabezadoSeccionComponent {
  @Input() titulo: string = '';
  @Input() subtitulo?: string;
  @Input() icono?: string; // clase de PrimeIcons, ej: 'pi pi-truck'
}
