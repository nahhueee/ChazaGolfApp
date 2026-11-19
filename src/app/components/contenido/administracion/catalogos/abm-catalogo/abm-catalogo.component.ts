import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { ConfirmationService } from 'primeng/api';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DialogModule } from 'primeng/dialog';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';

import { FORMS_IMPORTS } from '../../../../../imports/forms.import';
import { CatalogoConfig, CatalogoItem } from '../../../../../models/Catalogo';
import { CatalogosService } from '../../../../../services/catalogos.service';
import { NotificacionesService } from '../../../../../services/notificaciones.service';

// ABM genérico de un catálogo: se configura con CatalogoConfig (clave de la API + campos a mostrar/editar).
// Nunca borra: "Baja" es lógica y se puede reactivar. Los errores de negocio del backend (duplicado,
// descripción bloqueada, etc.) ya los muestra el interceptor HTTP; acá solo se destraba la pantalla.
@Component({
  selector: 'app-abm-catalogo',
  standalone: true,
  imports: [
    ...FORMS_IMPORTS,
    TableModule,
    TagModule,
    DialogModule,
    TooltipModule,
    ConfirmDialogModule,
  ],
  providers: [ConfirmationService],
  templateUrl: './abm-catalogo.component.html',
  styleUrl: './abm-catalogo.component.css',
})
export class AbmCatalogoComponent implements OnChanges {
  @Input({ required: true }) config!: CatalogoConfig;

  items: CatalogoItem[] = [];
  verBajas = false;
  cargando = false;

  dialogVisible = false;
  guardando = false;
  editando: CatalogoItem | null = null;
  form: Record<string, any> = {};

  constructor(
    private catalogosService: CatalogosService,
    private confirmationService: ConfirmationService,
    private notificaciones: NotificacionesService,
  ) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['config']) {
      this.verBajas = false;
      this.Cargar();
    }
  }

  get filas(): CatalogoItem[] {
    return this.verBajas ? this.items : this.items.filter(i => !i.fechaBaja);
  }

  get cantidadBajas(): number {
    return this.items.filter(i => i.fechaBaja).length;
  }

  Cargar(): void {
    this.cargando = true;
    this.catalogosService.Listar(this.config.clave, false).subscribe({
      next: items => {
        this.items = items ?? [];
        this.cargando = false;
      },
      error: () => { this.cargando = false; },
    });
  }

  Nuevo(): void {
    this.editando = null;
    this.form = {};
    this.dialogVisible = true;
  }

  Editar(item: CatalogoItem): void {
    this.editando = item;
    this.form = {};
    this.config.campos.forEach(c => this.form[c.key] = (item as any)[c.key]);
    this.dialogVisible = true;
  }

  // Un campo no se puede editar si es la descripción de un valor ya usado (lo bloquea también el backend).
  CampoBloqueado(key: string): boolean {
    return key === 'descripcion' && !!this.editando?.descripcionBloqueada;
  }

  FormValido(): boolean {
    return this.config.campos
      .filter(c => c.requerido)
      .every(c => String(this.form[c.key] ?? '').trim() !== '');
  }

  Guardar(): void {
    if (!this.FormValido()) return;

    // Solo viajan los campos del catálogo; un número vacío no se manda (el backend asigna el siguiente orden).
    const datos: Record<string, any> = {};
    for (const c of this.config.campos) {
      const valor = this.form[c.key];
      if (c.tipo === 'numero') {
        if (valor !== null && valor !== undefined && valor !== '') datos[c.key] = Number(valor);
      } else {
        datos[c.key] = String(valor ?? '').trim();
      }
    }

    this.guardando = true;
    const peticion = this.editando
      ? this.catalogosService.Modificar(this.config.clave, this.editando.id, datos)
      : this.catalogosService.Agregar(this.config.clave, datos);

    peticion.subscribe({
      next: respuesta => {
        this.guardando = false;
        if (respuesta == null) return; // en la app de escritorio un error HTTP llega como null (ya se avisó)
        this.notificaciones.Success(this.editando ? 'Cambios guardados.' : 'Registro creado.');
        this.dialogVisible = false;
        this.Cargar();
      },
      error: () => { this.guardando = false; },
    });
  }

  DarBaja(item: CatalogoItem): void {
    this.confirmationService.confirm({
      message: `Se va a dar de baja "${item.descripcion}". Deja de aparecer en los selectores, pero los comprobantes que ya lo usan no se modifican. Se puede reactivar.`,
      header: 'Dar de baja',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Dar de baja',
      rejectLabel: 'Cancelar',
      rejectButtonProps: { severity: 'secondary', outlined: true },
      accept: () => {
        this.catalogosService.DarBaja(this.config.clave, item.id).subscribe({
          next: () => {
            this.notificaciones.Success('Registro dado de baja.');
            this.Cargar();
          },
        });
      },
    });
  }

  Reactivar(item: CatalogoItem): void {
    this.confirmationService.confirm({
      message: `Se va a reactivar "${item.descripcion}" y vuelve a aparecer en los selectores.`,
      header: 'Reactivar',
      icon: 'pi pi-question-circle',
      acceptLabel: 'Reactivar',
      rejectLabel: 'Cancelar',
      rejectButtonProps: { severity: 'secondary', outlined: true },
      accept: () => {
        this.catalogosService.Reactivar(this.config.clave, item.id).subscribe({
          next: () => {
            this.notificaciones.Success('Registro reactivado.');
            this.Cargar();
          },
        });
      },
    });
  }
}
