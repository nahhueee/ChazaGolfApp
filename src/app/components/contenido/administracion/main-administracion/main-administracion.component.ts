import { Component } from '@angular/core';
import { CardModule } from 'primeng/card';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { DialogModule } from 'primeng/dialog';
import { DatePicker } from 'primeng/datepicker';
import { EncabezadoSeccionComponent } from '../../../compartidos/encabezado-seccion/encabezado-seccion.component';
import { FilesService } from '../../../../services/files.service';
import { MiscService } from '../../../../services/misc.service';
import { ClientesService } from '../../../../services/clientes.service';
import { UsuariosService } from '../../../../services/usuarios.service';
import { NotificacionesService } from '../../../../services/notificaciones.service';
import { FORMS_IMPORTS } from '../../../../imports/forms.import';
import { ProcesoVenta } from '../../../../models/ProcesoVenta';
import { Cliente } from '../../../../models/Cliente';

@Component({
  selector: 'app-main-administracion',
  standalone: true,
  imports: [
    ...FORMS_IMPORTS,
    CardModule,
    TagModule,
    TooltipModule,
    DialogModule,
    DatePicker,
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

  // Dialog de filtros de "Ventas para Conciliación" (R1 - ver
  // HANDOFF-informes-administracion-R1.md). A diferencia del Libro IVA (por
  // CUIT/mes), acá el caso de uso es más parecido al Exportar() de
  // listado-ventas: rango de fechas libre + proceso/cliente opcionales.
  conciliacionVisible: boolean = false;
  rangoFechasConciliacion: Date[] | null = null;
  procesoConciliacion: ProcesoVenta | null = null;
  clienteConciliacion: Cliente | null = null;
  incluirAnuladas: boolean = false;
  // Checkbox "Exportar talles en formato largo" (R2, B4-212 - ver
  // HANDOFF-informes-administracion-R2.md §7). Default false: 1 fila por línea
  // de ventas_productos, que es el grano que garantiza que el control de la
  // hoja "Detalle valorizado" cierre exacto.
  formatoLargoConciliacion: boolean = false;
  descargandoConciliacion: boolean = false;

  procesos: ProcesoVenta[] = [];
  clientes: Cliente[] = [];
  clientesFiltrados: Cliente[] = [];

  constructor(
    private filesService: FilesService,
    private miscService: MiscService,
    private clientesService: ClientesService,
    private usuariosService: UsuariosService,
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

  AbrirConciliacion() {
    this.rangoFechasConciliacion = null;
    this.procesoConciliacion = null;
    this.clienteConciliacion = null;
    this.incluirAnuladas = false;
    this.formatoLargoConciliacion = false;

    // Solo procesos "facturables" (Factura/Cotización/NC/ND) - es el mismo
    // universo que ya cubre ConciliacionRepo.ObtenerVentasConciliacion en el
    // backend (no incluye Presupuesto/Pedido/Nota de Empaque).
    if (!this.procesos.length) {
      this.miscService.ObtenerProcesosVenta('factura').subscribe(response => {
        this.procesos = response;
      });
    }
    if (!this.clientes.length) {
      this.clientesService.SelectorClientes().subscribe(response => {
        this.clientes = response;
      });
    }

    this.conciliacionVisible = true;
  }

  FiltrarClientesConciliacion(event: any) {
    const query = event.query.toLowerCase();
    this.clientesFiltrados = this.clientes.filter(c => {
      const nombre = (c.nombre ?? '').toLowerCase();
      const dni = (c.documento ?? '').toString();
      return nombre.includes(query) || dni.includes(query);
    });
  }

  DescargarConciliacion() {
    const fechas = this.rangoFechasConciliacion;
    if (!fechas || fechas.length !== 2 || !fechas[0] || !fechas[1]) {
      this.notificaciones.Warn("Debe seleccionar un rango de fechas completo (desde y hasta).");
      return;
    }

    this.descargandoConciliacion = true;

    const filtros = {
      fechas: fechas as [Date, Date],
      idProceso: this.procesoConciliacion?.id ?? 0,
      cliente: this.clienteConciliacion?.id ?? 0,
      nroProceso: 0,
      incluirAnuladas: this.incluirAnuladas,
    };

    this.filesService.DescargarConciliacionExcel(
      filtros,
      this.procesoConciliacion?.descripcion ?? 'Todos',
      this.clienteConciliacion?.nombre ?? 'Todos',
      this.usuariosService.GetUsuarioSesion(),
      this.formatoLargoConciliacion,
    ).subscribe({
      next: blob => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');

        const dd = String(new Date().getDate()).padStart(2, '0');
        const mm = String(new Date().getMonth() + 1).padStart(2, '0');
        const yy = String(new Date().getFullYear()).slice(-2);

        a.href = url;
        a.download = `Ventas_Conciliacion_${dd}-${mm}-${yy}.xlsx`;
        a.click();
        window.URL.revokeObjectURL(url);

        this.descargandoConciliacion = false;
        this.conciliacionVisible = false;
      },
      error: () => {
        this.descargandoConciliacion = false;
      }
    });
  }
}
