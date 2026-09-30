import { Component, OnInit } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { DialogModule } from 'primeng/dialog';
import { TooltipModule } from 'primeng/tooltip';
import { TextareaModule } from 'primeng/textarea';
import { EncabezadoSeccionComponent } from '../../../compartidos/encabezado-seccion/encabezado-seccion.component';
import { FeEmisionesService } from '../../../../services/fe-emisiones.service';
import { NotificacionesService } from '../../../../services/notificaciones.service';
import { FORMS_IMPORTS } from '../../../../imports/forms.import';

// F4.3 - HANDOFF blindaje facturacion y logs. Fila de fe_emisiones tal como la
// devuelve el backend (SELECT * - ver feEmisionesRepository.ObtenerPendientes/
// ObtenerHistorialRegularizados). No se modela un tipo completo: esta pantalla solo
// lee y muestra, y arma las acciones a partir de columnas puntuales.
interface FilaFeEmision {
  id: number;
  idEmpresa: number;
  cuitEmisor: number;
  ptoVenta: number;
  tipoCbte: number;
  nro: number;
  estado: 'PENDIENTE' | 'APROBADO' | 'RECHAZADO' | 'INCIERTO' | 'APROBADO_SIN_REGISTRAR' | 'REGULARIZADO';
  cae: string | null;
  caeVto: string | null;
  idVenta: number | null;
  usuario: string | null;
  requestId: string | null;
  usuarioRegulariza: string | null;
  fechaRegulariza: string | null;
  motivoRegulariza: string | null;
  fechaAlta: string;
}

// Texto de referencia de la sección 2 del handoff, para el tooltip de cada estado.
const DESCRIPCION_ESTADO: Record<string, string> = {
  INCIERTO: 'Se mandó a ARCA y no hubo respuesta (timeout o corte). No se sabe si el comprobante existe - "Verificar en ARCA" lo resuelve.',
  APROBADO_SIN_REGISTRAR: 'ARCA dio CAE pero falló el guardado de la venta. El comprobante es real y válido - "Regularizar" lo persiste con el mismo CAE, sin volver a llamar a ARCA.',
  APROBADO: 'ARCA dio CAE pero la venta quedó sin vincular (idVenta NULL) - mismo caso que APROBADO_SIN_REGISTRAR, a resolver con "Regularizar".',
  REGULARIZADO: 'Era APROBADO_SIN_REGISTRAR o INCIERTO y se registró después. El stock puede haber quedado negativo, con aviso.',
};

@Component({
  selector: 'app-pendientes-fiscales',
  standalone: true,
  imports: [
    ...FORMS_IMPORTS,
    TableModule,
    TagModule,
    DialogModule,
    TooltipModule,
    TextareaModule,
    EncabezadoSeccionComponent,
  ],
  templateUrl: './pendientes-fiscales.component.html',
  styleUrl: './pendientes-fiscales.component.scss',
})
export class PendientesFiscalesComponent implements OnInit {

  pendientes: FilaFeEmision[] = [];
  historial: FilaFeEmision[] = [];
  loading = false;
  loadingHistorial = false;
  mostrarHistorial = false;

  // id de la fila cuyo "Verificar en ARCA" está en curso (deshabilita solo ese botón).
  verificando: number | null = null;

  regularizarVisible = false;
  filaRegularizando: FilaFeEmision | null = null;
  formRegularizar: FormGroup;
  regularizando = false;

  DESCRIPCION_ESTADO = DESCRIPCION_ESTADO;

  constructor(
    private feEmisionesService: FeEmisionesService,
    private notificaciones: NotificacionesService,
  ) {
    this.formRegularizar = new FormGroup({
      motivo: new FormControl('', [Validators.required, Validators.maxLength(250)]),
    });
  }

  ngOnInit(): void {
    this.Buscar();
  }

  Buscar(): void {
    this.loading = true;
    this.feEmisionesService.ObtenerPendientes().subscribe({
      next: (respuesta: FilaFeEmision[]) => {
        this.pendientes = respuesta;
        this.loading = false;
      },
      error: () => {
        this.notificaciones.Error('No se pudieron cargar los pendientes fiscales.');
        this.loading = false;
      }
    });
  }

  ToggleHistorial(): void {
    this.mostrarHistorial = !this.mostrarHistorial;
    if (this.mostrarHistorial && this.historial.length === 0) {
      this.loadingHistorial = true;
      this.feEmisionesService.ObtenerHistorial().subscribe({
        next: (respuesta: FilaFeEmision[]) => {
          this.historial = respuesta;
          this.loadingHistorial = false;
        },
        error: () => {
          this.notificaciones.Error('No se pudo cargar el historial de regularizaciones.');
          this.loadingHistorial = false;
        }
      });
    }
  }

  VerificarEnArca(fila: FilaFeEmision): void {
    this.verificando = fila.id;
    this.feEmisionesService.VerificarEnArca(fila.id).subscribe({
      next: (respuesta: { estado: string }) => {
        this.verificando = null;
        const mensajes: Record<string, string> = {
          APROBADO: 'El comprobante existe en ARCA: quedó en APROBADO, pendiente de "Regularizar".',
          RECHAZADO: 'ARCA confirmó que el comprobante no se emitió. Se liberó el número para un próximo intento.',
          INCIERTO: 'ARCA sigue sin confirmar. Se puede reintentar más tarde.',
        };
        this.notificaciones.Success(mensajes[respuesta.estado] ?? 'Verificación realizada.');
        this.Buscar();
      },
      error: (err) => {
        this.verificando = null;
        this.notificaciones.Error(err?.error?.message || 'No se pudo verificar el comprobante en ARCA.');
      }
    });
  }

  AbrirRegularizar(fila: FilaFeEmision): void {
    this.filaRegularizando = fila;
    this.formRegularizar.reset({ motivo: '' });
    this.regularizarVisible = true;
  }

  ConfirmarRegularizar(): void {
    this.formRegularizar.get('motivo')?.markAsTouched();
    if (this.formRegularizar.invalid || !this.filaRegularizando) return;

    this.regularizando = true;
    const motivo = this.formRegularizar.get('motivo')?.value;

    this.feEmisionesService.Regularizar(this.filaRegularizando.id, motivo).subscribe({
      next: () => {
        this.notificaciones.Success('Comprobante regularizado: la venta quedó registrada con el CAE ya emitido.');
        this.regularizando = false;
        this.regularizarVisible = false;
        this.historial = []; // fuerza recarga la próxima vez que se abra el historial
        this.Buscar();
      },
      error: (err) => {
        this.regularizando = false;
        this.notificaciones.Error(err?.error?.message || 'No se pudo regularizar el comprobante.');
      }
    });
  }

  TagSeverity(estado: string): 'success' | 'info' | 'warn' | 'danger' | 'secondary' {
    switch (estado) {
      case 'INCIERTO': return 'warn';
      case 'APROBADO_SIN_REGISTRAR':
      case 'APROBADO': return 'danger';
      case 'REGULARIZADO': return 'success';
      default: return 'secondary';
    }
  }
}
