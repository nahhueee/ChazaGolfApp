import { Component } from '@angular/core';
import { CardModule } from 'primeng/card';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { DialogModule } from 'primeng/dialog';
import { DatePicker } from 'primeng/datepicker';
import { ButtonModule } from 'primeng/button';
import { FormsModule } from '@angular/forms';
import { EncabezadoSeccionComponent } from '../../../compartidos/encabezado-seccion/encabezado-seccion.component';
import { FilesService } from '../../../../services/files.service';
import { MiscService } from '../../../../services/misc.service';
import { NotificacionesService } from '../../../../services/notificaciones.service';

@Component({
  selector: 'app-main-administracion',
  standalone: true,
  imports: [
    CardModule,
    TagModule,
    TooltipModule,
    DialogModule,
    DatePicker,
    ButtonModule,
    FormsModule,
    EncabezadoSeccionComponent,
  ],
  templateUrl: './main-administracion.component.html',
  styleUrl: './main-administracion.component.scss',
})
export class MainAdministracionComponent {

  // Dialog de selección de período para el Libro IVA. Se pide mes+año (no
  // rango libre, a diferencia del botón que existía antes en Listado de
  // Ventas): acá el caso de uso es "generar el libro de tal mes", punto.
  libroIvaVisible: boolean = false;
  mesSeleccionado: Date = new Date();
  descargando: boolean = false;

  constructor(
    private filesService: FilesService,
    private miscService: MiscService,
    private notificaciones: NotificacionesService,
  ) {}

  AbrirLibroIva() {
    this.mesSeleccionado = new Date();
    this.libroIvaVisible = true;
  }

  DescargarLibroIva() {
    if (!this.mesSeleccionado) {
      this.notificaciones.Warn("Debe seleccionar un mes.");
      return;
    }

    const anio = this.mesSeleccionado.getFullYear();
    const mes = this.mesSeleccionado.getMonth();
    const desde = new Date(anio, mes, 1);
    const hasta = new Date(anio, mes + 1, 0);

    this.descargando = true;

    this.miscService.ResolverEmpresaResponsableInscripto().subscribe(empresaRI => {
      if (!empresaRI) {
        // Ya se avisó adentro de ResolverEmpresaResponsableInscripto().
        this.descargando = false;
        return;
      }

      this.filesService.DescargarLibroIvaVentasExcel({
        idEmpresa: empresaRI.id,
        fechas: [desde, hasta]
      }).subscribe({
        next: blob => {
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');

          const mm = String(mes + 1).padStart(2, '0');
          a.href = url;
          a.download = `Libro_IVA_Ventas_${mm}-${anio}.xlsx`;
          a.click();
          window.URL.revokeObjectURL(url);

          this.descargando = false;
          this.libroIvaVisible = false;
        },
        error: () => {
          this.descargando = false;
        }
      });
    });
  }
}
