import { Component, OnInit } from '@angular/core';
import { DatePickerModule } from 'primeng/datepicker';
import { SelectButtonModule } from 'primeng/selectbutton';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';

import { EncabezadoSeccionComponent } from '../../../compartidos/encabezado-seccion/encabezado-seccion.component';
import { FORMS_IMPORTS } from '../../../../imports/forms.import';
import { ChequeEmitido, EstadoChequeEmitido } from '../../../../models/ChequeEmitido';
import { ChequeTercero, EstadoChequeTercero } from '../../../../models/ChequeTercero';
import { Empresa } from '../../../../models/Empresa';
import { ChequesEmitidosService } from '../../../../services/cheques-emitidos.service';
import { FondosService } from '../../../../services/fondos.service';
import { MiscService } from '../../../../services/misc.service';
import { NotificacionesService } from '../../../../services/notificaciones.service';

type Vista = 'PROPIOS' | 'TERCEROS';

const LIMITE_FILAS = 1000;

// Pantalla informativa (solo lectura): estado de TODOS los cheques. Las acciones (Debitar, Acreditar, Rechazar)
// siguen en Fondos, donde ya mueven la plata.
@Component({
  selector: 'app-cheques',
  standalone: true,
  imports: [
    ...FORMS_IMPORTS,
    TableModule,
    TagModule,
    SelectButtonModule,
    DatePickerModule,
    EncabezadoSeccionComponent,
  ],
  templateUrl: './cheques.component.html',
  styleUrl: './cheques.component.css',
})
export class ChequesComponent implements OnInit {

  readonly vistas = [
    { label: 'Cheques propios', value: 'PROPIOS' },
    { label: 'Cheques de terceros', value: 'TERCEROS' },
  ];

  readonly estadosPropios: { value: EstadoChequeEmitido; label: string; severity: string }[] = [
    { value: 'EMITIDO', label: 'Emitido', severity: 'warn' },
    { value: 'DEBITADO', label: 'Debitado', severity: 'success' },
    { value: 'ANULADO', label: 'Anulado', severity: 'secondary' },
  ];
  readonly estadosTerceros: { value: EstadoChequeTercero; label: string; severity: string }[] = [
    { value: 'PENDIENTE', label: 'Pendiente', severity: 'warn' },
    { value: 'ENDOSADO', label: 'Endosado', severity: 'info' },
    { value: 'ACREDITADO', label: 'Acreditado', severity: 'success' },
    { value: 'RECHAZADO', label: 'Rechazado', severity: 'danger' },
  ];
  readonly DIAS_ALERTA = 7;
  readonly LIMITE_FILAS = LIMITE_FILAS;

  vista: Vista = 'PROPIOS';
  empresas: Empresa[] = [];
  idEmpresa: number | null = null;
  rango: Date[] | null = null;
  estadoFiltro: string | null = null;

  propios: ChequeEmitido[] = [];
  terceros: ChequeTercero[] = [];
  cargando = false;

  constructor(
    private chequesService: ChequesEmitidosService,
    private fondosService: FondosService,
    private miscService: MiscService,
    private notificaciones: NotificacionesService,
  ) {}

  ngOnInit(): void {
    this.miscService.ObtenerEmpresas().subscribe(empresas => this.empresas = empresas ?? []);
    this.Buscar();
  }

  get estadosVista() {
    return this.vista === 'PROPIOS' ? this.estadosPropios : this.estadosTerceros;
  }

  CambioVista(): void {
    this.estadoFiltro = null;
    this.Buscar();
  }

  // Estado se filtra en el front (los totales por estado salen de todas las filas cargadas);
  // empresa y fechas se filtran en el backend.
  Buscar(): void {
    this.cargando = true;
    const desde = this.rango?.[0] ? this.AIso(this.rango[0]) : undefined;
    const hasta = this.rango?.[1] ? this.AIso(this.rango[1]) : undefined;
    const idEmpresa = this.idEmpresa ?? undefined;

    if (this.vista === 'PROPIOS') {
      this.chequesService.Obtener({ idEmpresa, fechaPagoDesde: desde, fechaPagoHasta: hasta, limite: LIMITE_FILAS }).subscribe({
        next: filas => { this.propios = filas; this.cargando = false; },
        error: () => this.ErrorCarga(),
      });
    } else {
      this.fondosService.ObtenerChequesTerceros({ idEmpresa, fechaCobroDesde: desde, fechaCobroHasta: hasta, limite: LIMITE_FILAS }).subscribe({
        next: filas => { this.terceros = filas; this.cargando = false; },
        error: () => this.ErrorCarga(),
      });
    }
  }

  // El datepicker de rango dispara onSelect con la primera fecha sola: se busca recién con el rango completo.
  RangoSeleccionado(): void {
    if (this.rango?.[0] && this.rango?.[1]) this.Buscar();
  }

  RangoLimpio(): void {
    this.rango = null;
    this.Buscar();
  }

  private ErrorCarga(): void {
    this.cargando = false;
    this.notificaciones.Error('No se pudieron cargar los cheques.');
  }

  get filasPropias(): ChequeEmitido[] {
    return this.estadoFiltro ? this.propios.filter(c => c.estado === this.estadoFiltro) : this.propios;
  }

  get filasTerceros(): ChequeTercero[] {
    return this.estadoFiltro ? this.terceros.filter(c => c.estado === this.estadoFiltro) : this.terceros;
  }

  get truncado(): boolean {
    return (this.vista === 'PROPIOS' ? this.propios.length : this.terceros.length) >= LIMITE_FILAS;
  }

  // Cantidad e importe por estado, sobre todas las filas cargadas (no solo las del filtro de estado).
  get totales(): { label: string; severity: string; cantidad: number; importe: number }[] {
    return this.estadosVista.map(e => {
      const filas: { estado: string; importe: number }[] = this.vista === 'PROPIOS'
        ? this.propios.map(c => ({ estado: c.estado, importe: c.importe }))
        : this.terceros.map(c => ({ estado: c.estado, importe: c.monto }));
      const delEstado = filas.filter(f => f.estado === e.value);
      return {
        label: e.label,
        severity: e.severity,
        cantidad: delEstado.length,
        importe: delEstado.reduce((acc, f) => acc + f.importe, 0),
      };
    });
  }

  Severity(estado: string): string {
    return [...this.estadosPropios, ...this.estadosTerceros].find(e => e.value === estado)?.severity ?? 'secondary';
  }

  Etiqueta(estado: string): string {
    return [...this.estadosPropios, ...this.estadosTerceros].find(e => e.value === estado)?.label ?? estado;
  }

  NombreEmpresa(idEmpresa: number): string {
    return this.empresas.find(e => e.id === idEmpresa)?.razonSocial ?? `#${idEmpresa}`;
  }

  // Fecha local -> 'YYYY-MM-DD'. No usar toISOString(): pasa a UTC y puede correr el día.
  private AIso(fecha: Date): string {
    const dos = (n: number) => String(n).padStart(2, '0');
    return `${fecha.getFullYear()}-${dos(fecha.getMonth() + 1)}-${dos(fecha.getDate())}`;
  }
}
