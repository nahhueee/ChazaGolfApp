import { Component, OnInit } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { AutoCompleteCompleteEvent } from 'primeng/autocomplete';
import { TableLazyLoadEvent, TableModule } from 'primeng/table';
import { TooltipModule } from 'primeng/tooltip';
import { InputNumberModule } from 'primeng/inputnumber';
import { TextareaModule } from 'primeng/textarea';
import { DatePickerModule } from 'primeng/datepicker';
import { ConfirmationService } from 'primeng/api';
import { ConfirmPopupModule } from 'primeng/confirmpopup';
import { FORMS_IMPORTS } from '../../../../imports/forms.import';
import { EncabezadoSeccionComponent } from '../../../compartidos/encabezado-seccion/encabezado-seccion.component';
import { ProductosService } from '../../../../services/productos.service';
import { StockService } from '../../../../services/stock.service';
import { UsuariosService } from '../../../../services/usuarios.service';
import { NotificacionesService } from '../../../../services/notificaciones.service';
import { Producto, TallesProducto } from '../../../../models/Producto';
import { StockMovimiento } from '../../../../models/StockMovimiento';
import { FiltroStock } from '../../../../models/filtros/FiltroStock';

@Component({
  selector: 'app-ajuste-stock',
  standalone: true,
  imports: [
    ...FORMS_IMPORTS,
    TableModule,
    TooltipModule,
    InputNumberModule,
    TextareaModule,
    DatePickerModule,
    ConfirmPopupModule,
    EncabezadoSeccionComponent
  ],
  templateUrl: './ajuste-stock.component.html',
  styleUrl: './ajuste-stock.component.scss',
  providers: [ConfirmationService],
})
export class AjusteStockComponent implements OnInit {
  // Selector de producto
  sugerencias: Producto[] = [];
  productoSeleccionado: Producto | null = null;

  // Panel de ajuste (split): talle elegido de la lista de la izquierda + form de la derecha.
  // Siempre se sabe qué talle se está tocando por talleSeleccionado (título del panel + botón).
  talleSeleccionado: TallesProducto | null = null;
  formAjuste: FormGroup;
  guardando = false;

  // Historial
  movimientos: StockMovimiento[] = [];
  totalRecords = 0;
  loading = false;
  filtros: FormGroup;
  filtroActual: FiltroStock = new FiltroStock();

  puedeAjustar = false;

  constructor(
    private productosService: ProductosService,
    private stockService: StockService,
    private usuariosService: UsuariosService,
    private confirmationService: ConfirmationService,
    private Notificaciones: NotificacionesService,
  ) {
    this.formAjuste = new FormGroup({
      cantidadNueva: new FormControl(null, [Validators.required, Validators.min(0)]),
      motivo: new FormControl('', [Validators.required, Validators.maxLength(255)]),
    });

    this.filtros = new FormGroup({
      usuario: new FormControl(''),
      fechas: new FormControl(''),
    });
  }

  ngOnInit(): void {
    this.puedeAjustar = this.usuariosService.PuedeAjustarStock();
    this.Buscar();
  }

  //#region Selector de producto
  // Cada tecleo dispara un request nuevo sin cancelar el anterior (ApiService/BuscarProductos no
  // usa switchMap). Si el request de un texto viejo (ej: "150") tarda más en responder que el del
  // texto actual ("1502"), llega después y termina pisando sugerencias con las de la búsqueda
  // vieja - es lo que se ve en la captura (resultados de otro código completamente distinto).
  // Se corrige con un id incremental: se descarta cualquier respuesta que no sea la del último
  // request emitido, sin tocar ApiService (que usan todos los servicios del proyecto).
  private ultimaBusquedaId = 0;

  BuscarProductos(event: AutoCompleteCompleteEvent) {
    const idBusqueda = ++this.ultimaBusquedaId;

    this.productosService.BuscarProductos(event.query).subscribe({
      next: (productos) => {
        if (idBusqueda !== this.ultimaBusquedaId) return;
        this.sugerencias = productos ?? [];
      },
      error: () => {
        if (idBusqueda !== this.ultimaBusquedaId) return;
        this.sugerencias = [];
      }
    });
  }

  SeleccionarProducto(producto: Producto) {
    this.productoSeleccionado = producto;
    this.talleSeleccionado = null;
  }

  QuitarProducto() {
    this.productoSeleccionado = null;
    this.talleSeleccionado = null;
  }
  //#endregion

  //#region Panel de ajuste
  SeleccionarTalle(talle: TallesProducto) {
    this.talleSeleccionado = talle;
    this.formAjuste.reset({ cantidadNueva: talle.cantidad, motivo: '' });
  }

  get diferencia(): number {
    const nueva = this.formAjuste.get('cantidadNueva')?.value;
    if (nueva == null || !this.talleSeleccionado) return 0;
    return Number(nueva) - Number(this.talleSeleccionado.cantidad);
  }

  CancelarAjuste() {
    this.talleSeleccionado = null;
  }

  GuardarAjuste() {
    this.formAjuste.markAllAsTouched();
    if (this.formAjuste.invalid || !this.productoSeleccionado || !this.talleSeleccionado) return;

    const cantidadNueva = this.formAjuste.get('cantidadNueva')?.value;
    const motivo = (this.formAjuste.get('motivo')?.value ?? '').trim();

    if (Number(cantidadNueva) === Number(this.talleSeleccionado.cantidad)) {
      this.Notificaciones.Warn('La cantidad nueva es igual a la actual, no hay ajuste que registrar.');
      return;
    }

    const talle = this.talleSeleccionado;
    this.guardando = true;

    this.stockService.Ajustar({
      idProducto: this.productoSeleccionado.id,
      talle: talle.talle!,
      cantidadNueva,
      motivo
    }).subscribe({
      next: () => {
        this.Notificaciones.Success(`Ajuste registrado: talle ${talle.talle} de ${talle.cantidad} a ${cantidadNueva}.`);
        talle.cantidad = cantidadNueva;
        this.guardando = false;
        this.talleSeleccionado = null;
        this.Buscar();
      },
      error: (err) => {
        this.guardando = false;
        this.Notificaciones.Error(err?.error || 'No se pudo registrar el ajuste de stock.');
      }
    });
  }

  CampoInvalido(campo: string): boolean {
    const control = this.formAjuste.get(campo);
    return !!(control && control.invalid && (control.dirty || control.touched));
  }
  //#endregion

  //#region Historial
  Buscar(event?: TableLazyLoadEvent) {
    this.loading = true;

    const pageIndex = (event?.first ?? 0) / (event?.rows ?? 15);
    const pageSize = event?.rows ?? 15;

    this.filtroActual = new FiltroStock({
      pagina: pageIndex + 1,
      tamanioPagina: pageSize,
      idProducto: 0,
      usuario: this.filtros.get('usuario')?.value || '',
      fechas: this.filtros.get('fechas')?.value || '',
    });

    this.stockService.Obtener(this.filtroActual).subscribe(response => {
      this.movimientos = response.registros;
      this.totalRecords = response.total;
      this.loading = false;
    });
  }

  LimpiarFiltros() {
    this.filtros.reset({ usuario: '', fechas: '' });
    this.Buscar();
  }

  ConfirmarRevertir(event: Event, movimiento: StockMovimiento) {
    this.confirmationService.confirm({
      target: event.target as EventTarget,
      message: '¿Revertir este ajuste de stock?',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Sí',
      rejectLabel: 'No',
      rejectButtonProps: { severity: 'secondary', outlined: true },
      accept: () => this.Revertir(movimiento)
    });
  }

  private Revertir(movimiento: StockMovimiento) {
    // El backend valida que sea el último ajuste vigente de ese producto+talle - si no lo es,
    // responde 400 y el mensaje se muestra tal cual (no se duplica esa regla acá).
    this.stockService.Revertir(movimiento.id!, 'Reversión manual desde listado').subscribe({
      next: () => {
        this.Notificaciones.Success('Ajuste revertido correctamente.');
        this.Buscar();
      },
      error: (err) => this.Notificaciones.Error(err?.error || 'No se pudo revertir el ajuste.')
    });
  }
  //#endregion
}
