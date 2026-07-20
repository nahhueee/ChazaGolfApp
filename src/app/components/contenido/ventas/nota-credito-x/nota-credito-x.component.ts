import { Component, ElementRef, EventEmitter, Input, Output, SimpleChanges, ViewChild } from '@angular/core';
import { FormGroup, FormControl, Validators } from '@angular/forms';
import { FORMS_IMPORTS } from '../../../../imports/forms.import';
import { Table, TableModule } from 'primeng/table';
import { Dialog } from 'primeng/dialog';
import { TooltipModule } from 'primeng/tooltip';
import { BadgeModule } from 'primeng/badge';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService } from 'primeng/api';
import { firstValueFrom, Subject, takeUntil } from 'rxjs';

import { Cliente } from '../../../../models/Cliente';
import { ClientesService } from '../../../../services/clientes.service';
import { ColorDisponible, LineasTalle, Producto, ProductoBusqueda } from '../../../../models/Producto';
import { ProductosService } from '../../../../services/productos.service';
import { MiscService } from '../../../../services/misc.service';
import { UsuariosService } from '../../../../services/usuarios.service';
import { GlobalesService } from '../../../../services/globales.service';
import { ProductosFactura, Venta } from '../../../../models/Factura';
import { VentasService } from '../../../../services/ventas.service';
import { NotificacionesService } from '../../../../services/notificaciones.service';
import { Empresa } from '../../../../models/Empresa';
import { calcularPrecioCliente } from '../services/precio-cliente.utils';
import { ID_PROCESO, TIPO_COMPROBANTE, ESTADO_VENTA, MAX_TALLES, LISTA_PRECIO } from '../models/venta.constants';

// Motivos fijos para una NC "sin productos" (ver checkbox homónimo): un importe
// que se acredita como saldo a favor sin devolución de mercadería real. Pedido
// del cliente (jul-2026) - no hay tabla maestra atrás, son solo estas dos
// opciones por ahora.
const MOTIVOS_SIN_PRODUCTOS = ['Adelanto de producción', 'Saldo orden de compra'];

// Nota de Crédito "X": nota de crédito interna, no fiscal (no pasa por AFIP/ARCA),
// cargada libremente (sin partir de una venta existente) desde el listado de
// Facturación. A diferencia de addmod-ventas, acá NO hay servicios, forma de pago,
// ni selección de comprobante/empresa: solo cliente + productos, y el propio
// guardado ya implica devolución de stock + saldo a favor (ver
// ventasRepository.Agregar/RegistrarMovimientoNotaCredito en el backend).
//
// La carga de productos (búsqueda, talles, colores, línea de talle) es una copia
// deliberada y recortada de la misma lógica de addmod-ventas.component.ts (sin
// las ramas de Presupuesto/Pedido/Nota de Empaque, que no aplican acá). Se copia
// en vez de extraerse a un componente compartido porque hoy es el único otro lugar
// que necesita esta UI - si aparece un tercer caso, ahí sí se justifica extraer.
@Component({
  selector: 'app-nota-credito-x',
  standalone: true,
  imports: [
    ...FORMS_IMPORTS,
    TableModule,
    Dialog,
    TooltipModule,
    BadgeModule,
    ConfirmDialogModule,
  ],
  providers: [ConfirmationService],
  templateUrl: './nota-credito-x.component.html',
  styleUrl: './nota-credito-x.component.scss',
})
export class NotaCreditoXComponent {
  @ViewChild('inputCodigo') inputCodigo!: ElementRef;
  @ViewChild('tablaProductos') tablaProductos?: Table;

  @Input() visible = false;
  @Output() cerrar = new EventEmitter<boolean>();

  private destroy$ = new Subject<void>();
  sesion: any;
  guardando = false;

  // Mismo mask decimal (miles con punto, decimales con coma) que usa addmod-ventas
  // para el input Total en modo "Sin productos".
  decimal_mask = {
    mask: Number,
    scale: 2,
    thousandsSeparator: '.',
    radix: ',',
    normalizeZeros: true,
    padFractionalZeros: true,
    lazy: false,
    signed: false,
  };

  // CLIENTE
  formCliente: FormGroup;
  clientes: Cliente[] = [];
  clientesFiltrados: Cliente[] = [];
  clienteSeleccionado?: Cliente;

  // SIN PRODUCTOS (adelanto de producción / saldo orden de compra)
  sinProductos = false;
  motivos = MOTIVOS_SIN_PRODUCTOS;
  formSinProductos: FormGroup;

  // PRODUCTOS
  formProductos: FormGroup;
  productosFiltrados: ProductoBusqueda[] = [];
  resultadoBusqueda: Producto[] = [];
  variantesDisponibles: Producto[] = [];
  coloresDisponibles: ColorDisponible[] = [];
  productoSeleccionado: Producto = new Producto();
  tallesProducto: string[] = [];
  lineasTalles: LineasTalle[] = [];
  productosFactura: ProductosFactura[] = [];

  empresas: Empresa[] = [];

  get total(): number {
    if (this.sinProductos) {
      // El input usa el mismo mask decimal que addmod-ventas (punto de miles,
      // coma decimal) - el valor crudo del FormControl queda como ese string
      // formateado, no como number, hay que reparsearlo.
      return this.globalesService.EstandarizarDecimal(this.formSinProductos?.get('total')?.value ?? '');
    }
    return this.productosFactura.reduce((acc, p) => acc + (p.total ?? 0), 0);
  }

  // Mismo formato es-AR que usa decimalFormat.pipe.ts, para que el mensaje de
  // confirmación coincida con lo que se ve en pantalla (punto de miles, coma
  // decimal), en vez de un toFixed(2) crudo.
  private formatoMoneda(valor: number): string {
    return valor.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  get totalUnidades(): number {
    return this.productosFactura.reduce((acc, p) => acc + (p.cantidad ?? 0), 0);
  }

  constructor(
    private clientesService: ClientesService,
    private productosService: ProductosService,
    private miscService: MiscService,
    private usuariosService: UsuariosService,
    private ventasService: VentasService,
    private Notificaciones: NotificacionesService,
    private confirmationService: ConfirmationService,
    private globalesService: GlobalesService,
  ) {
    this.ArmarFormularios();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['visible']?.currentValue === true) {
      this.Inicializar();
    }
  }

  private ArmarFormularios(): void {
    this.formCliente = new FormGroup({
      cliente: new FormControl('', [Validators.required]),
    });

    this.formProductos = new FormGroup({
      codigoBarras: new FormControl(''),
      producto: new FormControl(''),
      colorSeleccionado: new FormControl(''),
    });

    this.formSinProductos = new FormGroup({
      motivo: new FormControl(''),
      total: new FormControl(''),
    });
  }

  // Al tildar/destildar "Sin productos" se limpia lo cargado en la sección que
  // se oculta, para no arrastrar datos de un modo al otro por accidente.
  ToggleSinProductos(): void {
    if (this.sinProductos) {
      this.productosFactura = [];
      this.productoSeleccionado = new Producto();
      this.formProductos.reset();
    } else {
      this.formSinProductos.reset();
    }
  }

  private Inicializar(): void {
    this.sesion = this.usuariosService.GetSesion()?.data;
    this.ReiniciarTodo();

    this.miscService.ObtenerLineasTalle(true)
      .pipe(takeUntil(this.destroy$))
      .subscribe(response => this.lineasTalles = response);

    this.clientesService.SelectorClientes()
      .pipe(takeUntil(this.destroy$))
      .subscribe(response => this.clientes = response);

    this.miscService.ObtenerEmpresas()
      .pipe(takeUntil(this.destroy$))
      .subscribe(response => this.empresas = response);
  }

  private ReiniciarTodo(): void {
    this.clienteSeleccionado = undefined;
    this.productosFactura = [];
    this.productoSeleccionado = new Producto();
    this.sinProductos = false;
    this.formCliente.reset();
    this.formProductos.reset();
    this.formSinProductos.reset();
  }

  //#region CLIENTE
  FiltrarClientes(event: any) {
    const query = (event.query ?? '').toLowerCase();
    this.clientesFiltrados = this.clientes.filter(c => {
      const nombre = (c.nombre ?? '').toLowerCase();
      const dni = (c.documento ?? '').toString();
      const razon = (c.razonSocial ?? '').toLowerCase();
      return nombre.includes(query) || dni.includes(query) || razon.includes(query);
    });
  }

  SeleccionarCliente() {
    const seleccionado = this.formCliente.get('cliente')?.value;
    if (!seleccionado?.id) return;

    this.clientesService.ObtenerCliente(seleccionado.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe(response => {
        this.clienteSeleccionado = response;

        // Recalcular precios de lo ya cargado según la lista del cliente recién
        // elegido - mismo criterio que SeleccionarCliente en addmod-ventas.
        if (this.productosFactura.length > 0) {
          this.productosFactura.forEach(p => {
            p.unitario = calcularPrecioCliente(p.precio!, this.clienteSeleccionado?.idListaPrecio!);
            p.total = p.unitario! * p.cantidad!;
          });
        }
      });
  }
  //#endregion

  //#region PRODUCTOS
  SelectContent(event: FocusEvent) {
    const input = event.target as HTMLInputElement;
    input.select();
  }

  FiltrarProductos(event: any) {
    const query = (event.query ?? '').toLowerCase();
    if (query.length === 0) {
      this.productosFiltrados = [];
      this.productoSeleccionado = new Producto();
      return;
    }

    this.productosService.BuscarProductos(query)
      .pipe(takeUntil(this.destroy$))
      .subscribe(response => {
        this.resultadoBusqueda = response;
        this.productosFiltrados = this.AgruparProductos(this.resultadoBusqueda);
      });
  }

  private AgruparProductos(productos: Producto[]) {
    const mapa = new Map<string, { codigo: string, nombre: string }>();
    for (const p of productos) {
      const key = `${p.codigo}|${p.nombre}`;
      if (!mapa.has(key)) {
        mapa.set(key, { codigo: p.codigo ?? "", nombre: p.nombre ?? "" });
      }
    }
    return Array.from(mapa.values());
  }

  SeleccionarProducto() {
    const seleccionado = this.formProductos.get('producto')?.value;

    this.variantesDisponibles = this.resultadoBusqueda.filter(p => p.codigo == seleccionado.codigo);
    this.coloresDisponibles = this.variantesDisponibles.map(p => {
      const cd = new ColorDisponible();
      cd.idProducto = p.id;
      cd.color = p.color?.descripcion ?? 'Sin color';
      cd.hexa = p.color?.hexa ?? '#000000';
      return cd;
    }).sort((a, b) => a.color.localeCompare(b.color));

    if (this.coloresDisponibles.length == 1) {
      this.productoSeleccionado = this.variantesDisponibles.find(v => v.id === this.coloresDisponibles[0].idProducto)!;
      this.formProductos.get('colorSeleccionado')?.setValue(this.coloresDisponibles[0]);
      this.SeleccionarVariante(this.productoSeleccionado.id!);
    }
  }

  SeleccionarVariante(idProducto: number) {
    this.productoSeleccionado = this.variantesDisponibles.find(v => v.id === idProducto)!;
    const linea = this.lineasTalles.find(l => l.id === this.productoSeleccionado.talles![0].idLineaTalle);
    if (!linea) return;
    this.tallesProducto = linea.talles!;
  }

  ObtenerCantidad(talle: string, proceso: string) {
    if (!this.productoSeleccionado?.talles) return 0;
    const encontrado = this.productoSeleccionado.talles.find((t: any) => t.talle === talle);
    if (proceso == "stock") return encontrado ? encontrado.cantidad : 0;
    if (proceso == "agregar") return encontrado && encontrado.cantAgregar! > 0 ? encontrado.cantAgregar : 0;
    return 0;
  }

  // A diferencia de addmod-ventas, acá NO se topea contra el stock: una NC
  // devuelve stock, así que tiene que poder cargarse un producto aunque su
  // stock actual sea 0 o negativo (pedido explícito del cliente - la cantidad
  // a devolver no depende de cuánto stock quede, sino de lo que efectivamente
  // se está devolviendo).
  DefinirCantidadAgregarTalle(talle: string) {
    if (!this.productoSeleccionado?.talles) return;
    const encontrado = this.productoSeleccionado.talles.find((t: any) => t.talle === talle);
    if (encontrado) {
      encontrado.cantAgregar = (encontrado.cantAgregar || 0) + 1;
    }
  }

  async AgregarProducto() {
    if (this.tablaProductos) this.tablaProductos.editingCell = null;

    const codigo = this.formProductos.get('codigoBarras')?.value ?? "";
    if (!codigo.trim() && !this.productoSeleccionado?.talles) return;

    let idTalle = 0;
    if (codigo != "") {
      const response = await firstValueFrom(this.productosService.ValidarCodigo(codigo));
      if (response) {
        idTalle = parseInt(codigo.slice(6, 9));
        this.productoSeleccionado = response;
      } else {
        this.Notificaciones.Warn("No se encontraron productos con este código");
        this.inputCodigo?.nativeElement.select();
        return;
      }
    }

    let tallesSeleccionados: any[] = [];
    if (idTalle === 0) {
      tallesSeleccionados = this.productoSeleccionado.talles!.filter((t: any) => t.cantAgregar > 0);
      if (tallesSeleccionados.length === 0) {
        this.Notificaciones.Warn("Asegurate de seleccionar al menos un talle.");
        return;
      }
    } else {
      tallesSeleccionados.push(this.productoSeleccionado.talles!.find((t: any) => t.idTalle === idTalle));
      tallesSeleccionados[0].cantAgregar = 1;
    }

    tallesSeleccionados.forEach((talleSel: any) => {
      const cantidad = talleSel.cantAgregar ?? 0;
      let precio = talleSel.precio;

      if (this.clienteSeleccionado) {
        precio = calcularPrecioCliente(precio, this.clienteSeleccionado.idListaPrecio!);
      }

      let existente = this.productosFactura.find(
        (p: ProductosFactura) => p.idProducto === this.productoSeleccionado.id && p.unitario === precio
      );

      if (existente) {
        existente.cantidad = (existente.cantidad ?? 0) + cantidad;
        existente.total = (existente.unitario ?? 0) * (existente.cantidad ?? 0);
        existente.totalMostrar = existente.total;
        this.AsignarTalle(existente, talleSel.talle, cantidad, talleSel.idLineaTalle);

        const tallesExistentes = existente.tallesSeleccionados ? existente.tallesSeleccionados.split(",").map(t => t.trim()) : [];
        if (!tallesExistentes.includes(talleSel.talle)) {
          tallesExistentes.push(talleSel.talle);
          existente.tallesSeleccionados = tallesExistentes.join(", ");
        }
      } else {
        const nuevo = new ProductosFactura({
          idProducto: this.productoSeleccionado.id,
          codProducto: this.productoSeleccionado.codigo,
          nomProducto: this.productoSeleccionado.nombre,
          talles: this.productoSeleccionado.talles,
          idColor: this.productoSeleccionado.color!.id,
          color: this.productoSeleccionado.color!.descripcion,
          hexa: this.productoSeleccionado.color!.hexa,
          idLineaTalle: talleSel.idLineaTalle,
          cantidad: cantidad,
          precio: talleSel.precio,
          unitario: precio,
          total: precio * cantidad,
          precioMostrar: precio,
          totalMostrar: precio * cantidad,
          tallesSeleccionados: talleSel.talle,
        });
        this.AsignarTalle(nuevo, talleSel.talle, cantidad, talleSel.idLineaTalle);
        this.productosFactura.push(nuevo);
      }
    });

    this.OrdenarProductosPorLineaTalle();
    this.productoSeleccionado = new Producto();
    this.formProductos.reset();
    setTimeout(() => {
      if (this.tablaProductos) this.tablaProductos.editingCell = null;
      this.inputCodigo?.nativeElement.focus();
    }, 0);
  }

  private AsignarTalle(productoFactura: ProductosFactura, talle: string, cantidad: number, idLineaTalle: number) {
    const linea = this.lineasTalles.find(l => l.id === idLineaTalle);
    if (!linea) return;
    const index = linea.talles!.indexOf(talle);
    if (index === -1) return;
    const campo = `t${index + 1}` as keyof ProductosFactura;
    (productoFactura as any)[campo] = ((productoFactura as any)[campo] ?? 0) + cantidad;
  }

  ObtenerTallesDeLinea(idLineaTalle?: number): string[] {
    return this.lineasTalles.find(l => l.id === idLineaTalle)?.talles ?? [];
  }

  private OrdenarProductosPorLineaTalle() {
    this.productosFactura = [...this.productosFactura].sort((a, b) => (a.idLineaTalle ?? 0) - (b.idLineaTalle ?? 0));
  }

  EsContinuacionMismoProducto(rowIndex: number): boolean {
    if (rowIndex <= 0) return false;
    const anterior = this.productosFactura[rowIndex - 1];
    const actual = this.productosFactura[rowIndex];
    return !!anterior && !!actual && anterior.idProducto === actual.idProducto && anterior.idColor === actual.idColor;
  }

  PrecedeContinuacion(rowIndex: number): boolean {
    const actual = this.productosFactura[rowIndex];
    const siguiente = this.productosFactura[rowIndex + 1];
    return !!actual && !!siguiente && actual.idProducto === siguiente.idProducto && actual.idColor === siguiente.idColor;
  }

  ActualizarCantidad(producto: any, field: string, event: any) {
    const input = event.target as HTMLInputElement;
    const value = Number(input.value) || 0;

    const linea = this.lineasTalles.find(l => l.id === producto.idLineaTalle);
    const index = parseInt(field.replace('t', '')) - 1;
    const talleReal = linea?.talles?.[index];
    if (!talleReal) return;

    const talleEncontrado = producto.talles.find((t: any) => t.talle === talleReal);
    if (!talleEncontrado) {
      this.Notificaciones.Warn(`No está habilitado el talle ${talleReal} para el producto ${producto.nomProducto}.`);
      return;
    }

    // Sin tope de stock acá tampoco (ver DefinirCantidadAgregarTalle): la cantidad
    // a devolver en una NC no está limitada por el stock actual del talle.
    producto[field] = value;

    const talles = producto.tallesSeleccionados ? producto.tallesSeleccionados.split(',').map((t: string) => t.trim()) : [];
    if (!talles.includes(talleReal)) {
      talles.push(talleReal);
      producto.tallesSeleccionados = talles.join(', ');
    }

    producto.cantidad = Array.from({ length: MAX_TALLES }, (_, i) => producto[`t${i + 1}`] || 0).reduce((a: number, b: number) => a + b, 0);
    producto.total = producto.cantidad * producto.unitario;
    producto.totalMostrar = producto.total;
  }

  EliminarProducto(event: Event, indice: number): void {
    this.confirmationService.confirm({
      key: 'confirmarNC',
      header: 'Confirmación',
      message: '¿Quitar el producto?',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Sí',
      rejectLabel: 'No',
      rejectButtonProps: { severity: 'secondary', outlined: true },
      accept: () => {
        this.productosFactura = this.productosFactura.filter((_, i) => i !== indice);
      },
    });
  }
  //#endregion

  //#region GUARDAR
  Guardar(): void {
    if (!this.clienteSeleccionado) {
      this.formCliente.get('cliente')?.markAsTouched();
      this.Notificaciones.Warn("Seleccioná un cliente antes de guardar.");
      return;
    }

    if (this.sinProductos) {
      if (!this.formSinProductos.get('motivo')?.value) {
        this.formSinProductos.get('motivo')?.markAsTouched();
        this.Notificaciones.Warn("Seleccioná un motivo.");
        return;
      }
    } else if (this.productosFactura.length === 0) {
      this.Notificaciones.Warn("Cargá al menos un producto.");
      return;
    }

    if (this.total <= 0) {
      this.Notificaciones.Warn("No se permite realizar una nota de crédito por $0.");
      return;
    }

    const mensaje = this.sinProductos
      ? `Se va a generar un saldo a favor de $${this.formatoMoneda(this.total)} para ${this.clienteSeleccionado!.nombre} (${this.formSinProductos.get('motivo')?.value}). No se mueve stock. ¿Confirmar?`
      : `Se va a revertir el stock de los ${this.totalUnidades} producto(s) cargados y se va a generar un saldo a favor de $${this.formatoMoneda(this.total)} para ${this.clienteSeleccionado!.nombre}. ¿Confirmar?`;

    this.confirmationService.confirm({
      key: 'confirmarNC',
      header: 'Confirmar Nota de Crédito',
      message: mensaje,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Confirmar',
      rejectLabel: 'Cancelar',
      rejectButtonProps: { severity: 'secondary', outlined: true },
      accept: () => this.ConfirmarGuardado(),
    });
  }

  private ConfirmarGuardado(): void {
    const nuevaVenta = new Venta();
    nuevaVenta.idProceso = ID_PROCESO.NOTA_CREDITO;
    nuevaVenta.proceso = "Nota de Crédito";
    nuevaVenta.idTipoComprobante = TIPO_COMPROBANTE.NC_X;
    nuevaVenta.idPunto = 7; // Otros - mismo criterio que notas-venta.component (NC no usa un punto de venta real)
    nuevaVenta.idCaja = this.sesion?.idCaja;
    nuevaVenta.idEmpresa = this.empresas[0]?.id;
    nuevaVenta.fecha = new Date();
    nuevaVenta.estado = ESTADO_VENTA.FINALIZADA;
    // nroRelacionado/tipoRelacionado son NOT NULL en la tabla ventas (aunque el
    // script.sql base los marca nullable - hay drift con el schema productivo).
    // 0/"" son los valores "sin relación" que ya usa addmod-ventas (ver
    // ArmarObjetoVenta) para toda venta que no está atada a un Presupuesto/Pedido/
    // Nota de Empaque. Esta NC libre nunca lo está.
    nuevaVenta.nroRelacionado = 0;
    nuevaVenta.tipoRelacionado = "";
    // idTipoDescuento/codPromocion: mismos valores "sin descuento/sin promo" que usa
    // addmod-ventas por defecto (ArmarObjetoVenta) - esta NC no aplica descuento.
    nuevaVenta.idTipoDescuento = 1;
    nuevaVenta.codPromocion = 0;
    nuevaVenta.cliente = this.clienteSeleccionado;
    // Mismo fallback que addmod-ventas: si el cliente no tiene lista propia, cae a
    // Consumidor Final (idLista es NOT NULL en la tabla ventas).
    nuevaVenta.idListaPrecio = this.clienteSeleccionado?.idListaPrecio ?? LISTA_PRECIO.CONSUMIDOR_FINAL;
    nuevaVenta.total = this.total;

    if (this.sinProductos) {
      // Sin productos reales: no hay nada que devolver a stock (por eso
      // productos=[] - Agregar() en el backend simplemente no itera nada), y el
      // motivo elegido queda como observación de la venta (ver migración
      // 20260719120000_add_observacion_ventas).
      nuevaVenta.productos = [];
      nuevaVenta.observacion = this.formSinProductos.get('motivo')?.value;
    } else {
      nuevaVenta.productos = this.productosFactura;
    }

    // Sin pagos: no hay venta de origen de la que prorratear (ver
    // RegistrarMovimientoNotaCredito en el backend, rama pagosOriginales vacío).
    nuevaVenta.pagos = [];

    this.guardando = true;
    this.ventasService.Agregar(nuevaVenta)
      .subscribe({
        next: (response) => {
          this.guardando = false;
          if (response) {
            this.Notificaciones.Success("Nota de crédito generada correctamente.");
            this.CerrarModal(true);
          }
        },
        error: () => {
          this.guardando = false;
        }
      });
  }
  //#endregion

  CerrarModal(actualizar: boolean) {
    this.cerrar.emit(actualizar);
  }
}
