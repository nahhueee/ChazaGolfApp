import { Component, OnInit } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
import { TableLazyLoadEvent, TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ConfirmationService } from 'primeng/api';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { EncabezadoSeccionComponent } from '../../../compartidos/encabezado-seccion/encabezado-seccion.component';
import { GlobalesService } from '../../../../services/globales.service';
import { NotificacionesService } from '../../../../services/notificaciones.service';
import { UsuariosService } from '../../../../services/usuarios.service';
import { FORMS_IMPORTS } from '../../../../imports/forms.import';

// F2 - HANDOFF blindaje facturacion y logs.
type Severidad = 'CRITICA' | 'ALTA' | 'MEDIA' | 'BAJA' | 'SIN_CODIGO';

interface EntradaLog {
  timestamp: string;
  level: string;
  code?: string;
  message: string;
  severity?: string;
  type?: string;
  route?: string;
  method?: string;
  status?: number;
  requestId?: string;
  context?: Record<string, any>;
  cause?: string;
  stack?: string;
  // Clave sintética para dataKey/expandedRowKeys de p-table: el log no trae id
  // propio. Se arma al recibir la respuesta (ver Buscar()).
  _key?: string;
}

const SEVERIDADES: Severidad[] = ['CRITICA', 'ALTA', 'MEDIA', 'BAJA', 'SIN_CODIGO'];

// Mapeo a los severity de PrimeNG (p-tag), para reusar la misma paleta que ya
// usa el resto de la app en vez de definir colores propios.
type TagSeverity = 'success' | 'info' | 'warn' | 'danger' | 'secondary' | 'contrast';
const SEVERITY_TAG: Record<Severidad, TagSeverity> = {
  CRITICA: 'danger',
  ALTA: 'warn',
  MEDIA: 'info',
  BAJA: 'secondary',
  SIN_CODIGO: 'contrast',
};

@Component({
  selector: 'app-errores',
  standalone: true,
  imports: [
    ...FORMS_IMPORTS,
    TableModule,
    TagModule,
    ConfirmDialogModule,
    EncabezadoSeccionComponent,
  ],
  providers: [ConfirmationService],
  templateUrl: './errores.component.html',
  styleUrl: './errores.component.scss',
})
export class ErroresComponent implements OnInit {

  entradas: EntradaLog[] = [];
  totalRecords: number = 0;
  loading: boolean = false;

  // rowExpansion de PrimeNG necesita una clave estable por fila; el log no
  // trae id, así que se arma con timestamp+message (suficiente para esta
  // pantalla: no hay edición ni persistencia de estado entre cargas).
  expandedRows: Record<string, boolean> = {};

  // Filtros activos de severidad — Set vacío = mostrar todas
  severidadesActivas = new Set<Severidad>();
  severidades = SEVERIDADES;

  filtros: FormGroup;

  esAdministrador = false;
  limpiando = false;

  // No-private: el template lo usa para reintentar la última página/orden
  // vigente al aplicar un filtro (Buscar(ultimoEvent, true)).
  ultimoEvent?: TableLazyLoadEvent;

  constructor(
    private globalesService: GlobalesService,
    private notificaciones: NotificacionesService,
    private usuariosService: UsuariosService,
    private confirmationService: ConfirmationService,
  ) {
    this.filtros = new FormGroup({
      code: new FormControl(''),
      requestId: new FormControl(''),
    });
  }

  ngOnInit(): void {
    this.esAdministrador = this.usuariosService.GetCargoSesion() === 'ADMINISTRADOR';
  }

  SeverityTag(sev?: string): TagSeverity {
    return SEVERITY_TAG[(sev?.toUpperCase() as Severidad) ?? 'SIN_CODIGO'] ?? 'contrast';
  }

  ToggleSeveridad(sev: Severidad): void {
    if (this.severidadesActivas.has(sev)) {
      this.severidadesActivas.delete(sev);
    } else {
      this.severidadesActivas.add(sev);
    }
    this.Buscar(this.ultimoEvent, true);
  }

  Buscar(event?: TableLazyLoadEvent, recargaConFiltro: boolean = false): void {
    if (event) this.ultimoEvent = event;
    this.loading = true;

    const rows = event?.rows ?? 10;
    const offset = event?.first ?? 0;

    const severityFiltro = this.severidadesActivas.size > 0
      ? [...this.severidadesActivas].join(',')
      : undefined;

    this.globalesService.ObtenerLogs({
      limit: rows,
      offset,
      severity: severityFiltro,
      code: this.filtros.get('code')?.value || undefined,
      requestId: this.filtros.get('requestId')?.value || undefined,
    }).subscribe({
      next: (respuesta: { total: number; datos: EntradaLog[] }) => {
        this.totalRecords = respuesta.total;
        this.entradas = respuesta.datos.map((e, i) => ({ ...e, _key: `${e.timestamp}|${i}` }));
        this.loading = false;
      },
      error: () => {
        this.notificaciones.Error('No se pudo cargar el log de errores.');
        this.loading = false;
      }
    });
  }

  LimpiarFiltros(): void {
    this.filtros.reset();
    this.severidadesActivas = new Set<Severidad>();
    this.Buscar(this.ultimoEvent, true);
  }

  FormatearContexto(context: Record<string, any> | undefined): string {
    if (!context) return '';
    return JSON.stringify(context, null, 2);
  }

  DetallesAfip(entrada: EntradaLog): string[] {
    return entrada.context?.['detallesAfip'] ?? [];
  }

  LimpiarLog(event: Event): void {
    this.confirmationService.confirm({
      target: event.target as EventTarget,
      message: 'Se va a limpiar el log de errores. Esta acción no se puede deshacer.',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Sí',
      rejectLabel: 'No',
      rejectButtonProps: {
        severity: 'secondary',
        outlined: true,
      },
      accept: () => {
        this.limpiando = true;
        this.globalesService.LimpiarLogs().subscribe({
          next: () => {
            this.notificaciones.Success('Log de errores limpiado correctamente.');
            this.limpiando = false;
            this.expandedRows = {};
            this.Buscar(this.ultimoEvent, true);
          },
          error: () => {
            this.notificaciones.Error('No se pudo limpiar el log de errores.');
            this.limpiando = false;
          }
        });
      }
    });
  }
}
