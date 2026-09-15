import { Component, EventEmitter, Input, Output, SimpleChanges } from '@angular/core';
import { ProductosFactura, ServiciosFactura, Venta } from '../../../../models/Factura';
import { Dialog } from 'primeng/dialog';
import { DividerModule } from 'primeng/divider';
import { DecimalFormatPipe } from '../../../../pipes/decimal-format.pipe';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { SelectModule } from 'primeng/select';
import { SelectButtonModule } from 'primeng/selectbutton';
import { TooltipModule } from 'primeng/tooltip';
import { NotificacionesService } from '../../../../services/notificaciones.service';
import { VentasService } from '../../../../services/ventas.service';
import { MiscService } from '../../../../services/misc.service';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService } from 'primeng/api';
import { Subject, takeUntil } from 'rxjs';
import { Cliente } from '../../../../models/Cliente';
import { ObjFacturar, TipoComprobante } from '../../../../models/ObjFacturar';
import { FacturarVentaComponent } from '../facturar-venta/facturar-venta.component';
import { FacturaVenta } from '../../../../models/FacturaVenta';
import { PuntoVenta } from '../../../../models/PuntoVenta';
import { esItemNoCatalogado, saldoDisponibleNotaFiscal, saldoDisponibleNotaInterna, TipoNotaCredito, TALLES_ESTANDAR } from '../models/venta.constants';

@Component({
  selector: 'app-notas-venta',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    Dialog,
    DividerModule,
    DecimalFormatPipe,
    DatePipe,
    TableModule,
    ButtonModule,
    SelectModule,
    SelectButtonModule,
    TooltipModule,
    ConfirmDialogModule,
    FacturarVentaComponent
  ],
  templateUrl: './notas-venta.component.html',
  styleUrl: './notas-venta.component.scss',
})
export class NotasVentaComponent {
  @Input() visible = false;
  @Input() tipo:string = "";
  @Input() venta: Venta = new Venta();
  // Elegido desde el popover de listado-ventas (ver ElegirTipoNotaCredito ahí).
  // Se usa como valor inicial de tipoNotaElegida; si no llega nada, sigue
  // arrancando en Fiscal como antes.
  @Input() tipoNotaPreseleccionada: TipoNotaCredito = 'FISCAL';
  @Output() cerrar = new EventEmitter<boolean>();

  objFacturar:ObjFacturar = new ObjFacturar();
  talles = TALLES_ESTANDAR;

  subTotal:number = 0;
  totalItems:number = 0;
  totalDescuento:number = 0;
  totalGeneral:number = 0;
  totalAPagar:number = 0;
  totalIva:number = 0;

  mostrarIva:boolean = false;

  // Copia local editable de venta.productos/venta.servicios (sep-2026). NO son
  // los mismos objetos que venta.productos/venta.servicios: esos son referencias
  // compartidas con el resto de la app (VerFactura/VerResumen los usan para
  // mostrar la factura ORIGINAL sobre el mismo objeto - ver PrepararPreciosVenta).
  // Editar acá encima de esas referencias corrompía la vista de la factura real
  // en otras pantallas y además dejaba mutado el objeto si se cancelaba sin
  // guardar (riesgo ya señalado en el proyecto). Ver ClonarProductos/ClonarServicios.
  productos: ProductosFactura[] = [];
  servicios: ServiciosFactura[] = [];

  productosSeleccionados: ProductosFactura[] = [];
  serviciosSeleccionados: ServiciosFactura[] = [];
  modalFacturarVisible: boolean = false;

  nuevaVenta:Venta = new Venta();
  proximoNroProceso: number = 0;

  private destroy$ = new Subject<void>();

  // Punto de Venta: canal de venta interno (tabla puntos_venta), sin relación con
  // el punto de venta fiscal de AFIP (ese lo determina la empresa, no esta
  // pantalla - ver comprobanteAsociado en armarObjetoFactura). Pedido del cliente
  // (jul-2026): antes quedaba fijo en "Otros" sin mostrarse en pantalla, mismo
  // criterio que nota-credito-x/nota-debito-x.
  puntos: PuntoVenta[] = [];
  puntoSeleccionado?: PuntoVenta;

  // Fiscal (pide CAE de NC A/B a ARCA) vs Interna/NC X (no pasa por ARCA, no
  // anula ni modifica la venta original - mismo comportamiento que ya usaba
  // esta pantalla cuando la venta origen era una Cotización, ver
  // armarObjetoVenta). Las dos se pueden repetir mientras quede saldo sin
  // acreditar de su propio tipo (devoluciones parciales sucesivas) - fiscal desde
  // sep-2026, interna desde este mismo cambio (antes bloqueaba tras la primera,
  // ver yaTieneNotaFiscal/saldoDisponibleFiscal, yaTieneNotaInterna/
  // saldoDisponibleInterna, y el guard en Confirmar()).
  tipoNotaElegida: TipoNotaCredito = 'FISCAL';

  // Opciones del selector con el disable ya resuelto por tipo (optionDisabled
  // en el template) - evita ofrecer una opción que Confirmar() va a rechazar.
  get opcionesTipoNota() {
    return [
      { label: 'Fiscal', value: 'FISCAL', disabled: this.yaTieneNotaFiscal },
      { label: 'Interna (NC X)', value: 'INTERNA', disabled: this.yaTieneNotaInterna },
    ];
  }

  // Solo se puede pedir CAE de NC A/B/C si la venta origen tiene un comprobante
  // fiscal real que asociar (Factura A, B o C). Si no (Cotización, Ticket X,
  // etc.), la única opción es la interna - no se muestra el selector.
  get puedeElegirFiscal(): boolean {
    return this.venta.idTipoComprobante == 1 || this.venta.idTipoComprobante == 6 || this.venta.idTipoComprobante == 11;
  }

  get emiteFiscal(): boolean {
    return this.puedeElegirFiscal && this.tipoNotaElegida === 'FISCAL';
  }

  // Saldo ($) de la factura todavía disponible para una nueva NC fiscal -
  // descuenta lo ya acreditado por NC fiscales previas (venta.cantidadesAcreditadas,
  // ver ObtenerCantidadesAcreditadas en el backend). Sep-2026: reemplaza al viejo
  // bloqueo "ya existe una NC fiscal" por uno real de saldo, para permitir
  // devoluciones parciales sucesivas.
  get saldoDisponibleFiscal(): number {
    return saldoDisponibleNotaFiscal(this.venta);
  }

  // true cuando no queda saldo de la factura para emitir OTRA NC fiscal (saldo
  // agotado). El chequeo de que el IMPORTE de esta NC en particular no supere el
  // saldo restante se hace en Confirmar(), no acá.
  get yaTieneNotaFiscal(): boolean {
    return this.saldoDisponibleFiscal <= 0;
  }

  // Análogo a saldoDisponibleFiscal/yaTieneNotaFiscal, para NC internas (X) -
  // bucket independiente (venta.cantidadesAcreditadasInterna). Reemplaza al viejo
  // bloqueo "ya existe una NC interna" por uno real de saldo, mismo mecanismo ya
  // aprobado para la fiscal.
  get saldoDisponibleInterna(): number {
    return saldoDisponibleNotaInterna(this.venta);
  }

  get yaTieneNotaInterna(): boolean {
    return this.saldoDisponibleInterna <= 0;
  }

  get hayNotasExistentes(): boolean {
    return (this.venta.notas?.length ?? 0) > 0;
  }

  constructor(
    private Notificaciones: NotificacionesService,
    private ventasService: VentasService,
    private miscService: MiscService,
    private confirmationService: ConfirmationService,
  ){}

  ngOnChanges(changes: SimpleChanges) {
    if (changes['visible']?.currentValue === true) {
      // Clona ANTES de tocar nada: el form arranca ya mostrando el remanente
      // real (no lo facturado), así el usuario no tiene que acordarse de bajar
      // a mano cada talla ya acreditada - ver comentario en ClonarProductos.
      this.productos = this.ClonarProductos(this.venta.productos);
      this.servicios = this.ClonarServicios(this.venta.servicios);
      this.productosSeleccionados = [];
      this.serviciosSeleccionados = [];
      this.tipoNotaElegida = this.tipoNotaPreseleccionada;
      this.CalcularTotalGeneral();

      this.miscService.ObtenerPuntosVenta()
        .pipe(takeUntil(this.destroy$))
        .subscribe(response => {
          this.puntos = response;
          // Hereda el punto de venta de la venta origen; si no matchea ninguno
          // (venta vieja sin idPunto, etc.) cae a "Otros" (id 7) como antes.
          // Sigue siendo editable desde el selector.
          this.puntoSeleccionado = this.puntos.find(p => p.id === this.venta.idPunto)
            ?? this.puntos.find(p => p.id === 7);
        });
    }
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  CerrarModal(actualizar:boolean) {
    this.cerrar.emit(actualizar);
  }

  // Copia cada producto y, para ítems con talles, capea cada tN al remanente
  // real (stockInicial[t], ya descontado lo acreditado por NC fiscales previas -
  // ver PrepararPreciosVenta) en vez de dejar la cantidad ORIGINAL facturada.
  // Bug real (sep-2026): sin este cap en el valor por default, una talla que el
  // usuario no tocaba a mano viajaba con su cantidad original completa - sin
  // pasar por ninguna validación, porque ActualizarCantidad solo corre cuando el
  // campo se edita. Resultado: se podía re-acreditar dos veces la misma talla
  // sin ningún aviso. cantidad/total/importeDescuento/totalMostrar se
  // recalculan acorde, para que el resumen abra ya reflejando el remanente.
  private ClonarProductos(productos: ProductosFactura[] = []): ProductosFactura[] {
    return productos.map(p => {
      const clon: any = { ...p, stockInicial: { ...(p.stockInicial ?? {}) } };

      if (this.EsItemNoCatalogado(clon)) {
        // Sin talles: cantidadOriginal ya viene descontado lo acreditado (ver
        // PrepararPreciosVenta) - es directamente el tope a usar acá.
        clon.cantidad = Math.min(Number(clon.cantidad) || 0, Number(clon.cantidadOriginal) || 0);
      } else {
        for (let i = 1; i <= 10; i++) {
          const talle = `t${i}`;
          const original = Number(clon[talle]) || 0;
          const remanente = Number(clon.stockInicial?.[talle]) || 0;
          clon[talle] = Math.min(original, remanente);
        }
        clon.cantidad = Array.from({ length: 10 }, (_, i) => clon[`t${i + 1}`] || 0)
          .reduce((a: number, b: number) => a + b, 0);
      }

      this.RecalcularTotalesItem(clon);
      return clon;
    });
  }

  /** Análogo a ClonarProductos, sin talles: el tope es siempre cantidadOriginal. */
  private ClonarServicios(servicios: ServiciosFactura[] = []): ServiciosFactura[] {
    return servicios.map(s => {
      const clon: any = { ...s };
      clon.cantidad = Math.min(Number(clon.cantidad) || 0, Number(clon.cantidadOriginal) || 0);
      this.RecalcularTotalesItem(clon);
      return clon;
    });
  }

  // Recalculo de total/importeDescuento/totalMostrar en base a item.cantidad,
  // reutilizado por ClonarProductos/ClonarServicios y por
  // RecalcularProducto/RecalcularProductoPresupuesto/RecalcularServicio.
  private RecalcularTotalesItem(item: any) {
    item.total = item.cantidad * (item.precioMostrar ?? item.unitario);
    item.importeDescuento = item.total * ((item.descuentoAplicado ?? 0) / 100);
    item.totalMostrar = item.total - item.importeDescuento;
  }

  SelectContent(event: FocusEvent) {
    const input = event.target as HTMLInputElement;
    input.select();
  }

  EstaSeleccionado(producto: any): boolean {
    // Comparación por referencia: codProducto no es único por fila (un mismo producto
    // puede tener más de una línea con distinto color/precio dentro de la misma venta).
    return this.productosSeleccionados?.some(p => p === producto);
  }

  EstaServicioSeleccionado(servicio: any): boolean {
    return this.serviciosSeleccionados?.some(s => s === servicio);
  }

  // true si el producto ya no tiene remanente para acreditar (se agotó en NC
  // fiscales previas sobre esta misma línea/talle - ver stockInicial en
  // PrepararPreciosVenta). Deshabilita la fila para que ni se pueda seleccionar,
  // en vez de dejar que el usuario la marque y recién enterarse en Confirmar()
  // (sep-2026, devoluciones parciales sucesivas).
  SinRemanente(producto: any): boolean {
    if (this.EsItemNoCatalogado(producto)) {
      return (producto.cantidadOriginal ?? 0) <= 0;
    }
    return Array.from({ length: 10 }, (_, i) => Number(producto.stockInicial?.[`t${i + 1}`]) || 0)
      .reduce((a, b) => a + b, 0) <= 0;
  }

  /** Análogo a SinRemanente, para servicios (sin talles, un único cantidadOriginal). */
  SinRemanenteServicio(servicio: any): boolean {
    return (servicio.cantidadOriginal ?? 0) <= 0;
  }



  CalcularTotalGeneral() {
    // "Seleccionar todo" (header checkbox) no distingue filas sin remanente -
    // esta versión de p-table no expone isDataSelectable, así que se filtran acá
    // en vez de en el toggle (cubre también cualquier otro camino de selección).
    this.productosSeleccionados = this.productosSeleccionados?.filter(p => !this.SinRemanente(p)) ?? [];
    this.serviciosSeleccionados = this.serviciosSeleccionados?.filter(s => !this.SinRemanenteServicio(s)) ?? [];

    const procesarItems = (items: any[]) => {
      return items?.reduce((acc, item) => {

        const totalItem = item.total || 0;
        const descuentoItem = item.importeDescuento || 0;

        acc.total += totalItem;
        acc.descuento += descuentoItem;

        return acc;

      }, { total: 0, descuento: 0 }) || { total: 0, descuento: 0 };
    };

    const productos = procesarItems(this.productosSeleccionados);
    const servicios = procesarItems(this.serviciosSeleccionados);

    this.totalItems = productos.total + servicios.total;
    this.totalDescuento = productos.descuento + servicios.descuento;

    // Base inicial
    this.subTotal = this.totalItems - this.totalDescuento;
    this.totalIva = 0;
    this.totalGeneral = this.subTotal;
    this.mostrarIva = false;

    if (this.venta.proceso !== 'COTIZACION') {

      const esComprobanteConIva = [
        TipoComprobante.FACTURA_A,
        TipoComprobante.NC_A,
        TipoComprobante.ND_A,
        TipoComprobante.FACTURA_B
      ].includes(this.venta.idTipoComprobante!);

      if (esComprobanteConIva) {
        // IVA incluido (ago-2026): PrepararPrecios() en listado-ventas.component.ts (que
        // llama EmitirNotaCredito antes de abrir este modal) deja los items con IVA
        // incluido para CUALQUIER tipo de comprobante/cliente, sin excepciones - se
        // discrimina, no se suma arriba. Uniforma con addmod-ventas.recalcularTotales(),
        // que nunca trató Factura A como caso especial (antes acá sí, `esTipoA ||
        // EsMayoristaConListaPropia()`, inconsistencia preexistente corregida de paso).
        const totalConIva = this.subTotal;
        this.totalIva = totalConIva * 21 / 121;
        this.subTotal = totalConIva - this.totalIva;
        this.totalGeneral = totalConIva;
        this.mostrarIva = true;
      }

      // FACTURA C u otros → sin IVA (quedan los valores base seteados arriba)
    }
  }

  // true si el producto es un ítem de presupuesto (sin talles, sin color, sin
  // stock) - ver TIPO_ITEM/esItemNoCatalogado. Usado en el template para mostrar
  // un único input de cantidad en vez del desglose por talle.
  EsItemNoCatalogado(producto: any): boolean {
    return esItemNoCatalogado(producto.tipoItem);
  }

  ActualizarCantidad(producto: any, field: string, event: any) {
    const input = event.target as HTMLInputElement;
    const value = Number(input.value) || 0;

    const stockDisponible = Number(producto.stockInicial[field]) || 0;
    if (value > stockDisponible) {
      this.Notificaciones.Warn(
        `La cantidad ingresada supera el stock inicial (${stockDisponible}).`
      );
      input.value = producto[field];
      return;
    }

    producto[field] = value;
    this.RecalcularProducto(producto);
  }

  private RecalcularProducto(producto: any) {
    producto.cantidad = Array.from({ length: 10 }, (_, i) => producto[`t${i + 1}`] || 0)
      .reduce((a, b) => a + b, 0);

    // precioMostrar es el precio unitario correcto (neto para Factura A, igual a unitario
    // para B/C), seteado por PrepararPrecios(). Usar producto.unitario acá reintroduciría
    // el IVA en la línea editada (unitario siempre queda bruto). Prorratea el
    // descuento a la cantidad efectivamente devuelta, no a la original.
    this.RecalcularTotalesItem(producto);

    this.CalcularTotalGeneral();
  }

  // Análogo a ActualizarCantidad/RecalcularProducto, pero para ítems de presupuesto:
  // no tienen talles, así que la cantidad se edita directo (un solo input) en vez de
  // sumar t1..t10, y el tope es cantidadOriginal en vez de stockInicial (mismo
  // patrón que ActualizarCantidadServicio/RecalcularServicio, ver ahí abajo).
  ActualizarCantidadProducto(producto: any, event: any) {
    const input = event.target as HTMLInputElement;
    const value = Number(input.value) || 0;

    const cantidadDisponible = Number(producto.cantidadOriginal) || 0;
    if (value > cantidadDisponible) {
      this.Notificaciones.Warn(
        `La cantidad ingresada supera la cantidad original (${cantidadDisponible}).`
      );
      input.value = producto.cantidad;
      return;
    }

    producto.cantidad = value;
    this.RecalcularProductoPresupuesto(producto);
  }

  private RecalcularProductoPresupuesto(producto: any) {
    this.RecalcularTotalesItem(producto);
    this.CalcularTotalGeneral();
  }

  ActualizarCantidadServicio(servicio: any, event: any) {
    const input = event.target as HTMLInputElement;
    const value = Number(input.value) || 0;

    const cantidadDisponible = Number(servicio.cantidadOriginal) || 0;
    if (value > cantidadDisponible) {
      this.Notificaciones.Warn(
        `La cantidad ingresada supera la cantidad original (${cantidadDisponible}).`
      );
      input.value = servicio.cantidad;
      return;
    }

    servicio.cantidad = value;
    this.RecalcularServicio(servicio);
  }

  private RecalcularServicio(servicio: any) {
    this.RecalcularTotalesItem(servicio);
    this.CalcularTotalGeneral();
  }

  Confirmar(){
    if(this.totalGeneral <= 0){
      this.Notificaciones.Warn("No se permite realizar una nota de credito por $0");
      return;
    }

    if(!this.puntoSeleccionado){
      this.Notificaciones.Warn("Seleccioná un punto de venta.");
      return;
    }

    // Bloqueo real (no solo cosmético en el selector). Se permiten varias NC de un
    // mismo tipo sobre la misma venta (devoluciones parciales sucesivas) mientras
    // quede saldo de ESE tipo sin acreditar - fiscal desde sep-2026, interna desde
    // este mismo cambio (antes bloqueaba directo tras la primera). Ninguna puede
    // dejar el acumulado de su tipo por encima de lo facturado - se valida contra
    // saldoDisponibleFiscal/saldoDisponibleInterna, no contra "ya existe una".
    if (this.emiteFiscal) {
      const saldoDisponible = this.saldoDisponibleFiscal;

      if (saldoDisponible <= 0) {
        this.Notificaciones.Warn("No queda saldo disponible de esta factura para emitir otra Nota de Crédito fiscal.");
        return;
      }

      // Tolerancia de 1 centavo por redondeo de punto flotante entre este total
      // (calculado acá) y el acumulado que llega del backend.
      if (this.totalGeneral > saldoDisponible + 0.01) {
        this.Notificaciones.Warn(
          `El importe de la Nota de Crédito ($${this.totalGeneral.toFixed(2)}) supera el saldo disponible de la factura ($${saldoDisponible.toFixed(2)}).`
        );
        return;
      }
    } else {
      const saldoDisponible = this.saldoDisponibleInterna;

      if (saldoDisponible <= 0) {
        this.Notificaciones.Warn("No queda saldo disponible de esta venta para emitir otra Nota de Crédito interna.");
        return;
      }

      if (this.totalGeneral > saldoDisponible + 0.01) {
        this.Notificaciones.Warn(
          `El importe de la Nota de Crédito ($${this.totalGeneral.toFixed(2)}) supera el saldo disponible ($${saldoDisponible.toFixed(2)}).`
        );
        return;
      }
    }

    this.ventasService.ObtenerProximoNroProceso(3)
      .subscribe(response => {
        this.proximoNroProceso = response;

        this.armarObjetoVenta();
        this.armarObjetoFactura();

        this.modalFacturarVisible = true;
    });
  }

  Guardar(factura?:FacturaVenta){
    this.modalFacturarVisible = false;

    if(factura && factura!=undefined){
      if(factura.estado == "Aprobado" || factura.estado == "Cotizacion"){

        // Solo se persisten datos de comprobante (CAE/ticket) cuando la NC
        // efectivamente pidió uno real a ARCA. Una NC interna (X) - elegida a
        // mano, o porque la venta origen no tiene comprobante fiscal - nunca
        // tiene CAE que guardar (ver armarObjetoVenta).
        if(this.emiteFiscal)
          this.nuevaVenta.factura = factura;

        // idProceso ya viene seteado a NOTA_CREDITO (ver armarObjetoVenta): el backend
        // decide devolver stock por ese campo, ya no hace falta pasar un flag aparte.
        this.ventasService.Agregar(this.nuevaVenta)
        .subscribe(response => {
          if(response){
            this.Notificaciones.Success("Se agregó correctamente la nota de credito.");
            this.CerrarModal(true);
          }
        });

      }else{
        this.Notificaciones.Error("No se pudo realizar la facturación electrónica, consulte los registros.")
      }
    } else{
      return;
    }
  }

  private armarObjetoVenta(){
    this.nuevaVenta.idProceso = 3; //Nota de credito
    this.nuevaVenta.nroProceso = this.proximoNroProceso;
    this.nuevaVenta.proceso = "Nota de Crédito";
    // Canal de venta interno elegido en el selector (default "Otros" - ver
    // ngOnChanges). No es el punto de venta fiscal de AFIP, ver comentario en `puntos`.
    this.nuevaVenta.idPunto = this.puntoSeleccionado?.id;
    this.nuevaVenta.fecha = new Date();
    this.nuevaVenta.descuento = this.venta.descuento;
    this.nuevaVenta.tipoDescuento = this.venta.tipoDescuento;
    this.nuevaVenta.codPromocion = this.venta.codPromocion;
    this.nuevaVenta.idCaja = this.venta.idCaja;

    let cliente:Cliente = new Cliente();
    cliente.id = this.venta.cliente?.id!;
    cliente.nombre = this.venta.cliente?.nombre;

    this.nuevaVenta.cliente = cliente;
    this.nuevaVenta.nroRelacionado = this.venta.nroProceso;
    this.nuevaVenta.tipoRelacionado = this.venta.proceso;
    this.nuevaVenta.idListaPrecio = this.venta.idListaPrecio;
    this.nuevaVenta.pagos = this.venta.pagos;
            
    this.nuevaVenta.idEmpresa = this.venta.idEmpresa;
    this.nuevaVenta.total = this.totalGeneral;

    if(this.emiteFiscal && this.venta.idTipoComprobante == 6) {//FACTURA B
      this.nuevaVenta.idTipoComprobante = 8;
      this.nuevaVenta.estado = "Facturada";
    }
    else if(this.emiteFiscal && this.venta.idTipoComprobante == 1) {//FACTURA A
      this.nuevaVenta.idTipoComprobante = 3;
      this.nuevaVenta.estado = "Facturada";
    }
    else if(this.emiteFiscal && this.venta.idTipoComprobante == 11) {//FACTURA C
      this.nuevaVenta.idTipoComprobante = 13;
      this.nuevaVenta.estado = "Facturada";
    }
    else{
      // NC interna (X): elegida a mano, o la venta origen no tiene comprobante
      // fiscal para asociar (Cotización, Ticket X, etc.). facturar-venta.component
      // ya trata este id igual que una Cotización - no pide CAE a ARCA (ver
      // Facturar() ahí), así que no hace falta ninguna otra rama acá.
      this.nuevaVenta.idTipoComprobante = 100; //NC X
      this.nuevaVenta.estado = "Finalizada";
    }

    this.nuevaVenta.productos = this.productosSeleccionados;
    this.nuevaVenta.servicios = this.serviciosSeleccionados;
  }

  private armarObjetoFactura(){
    this.objFacturar.total = Number(this.totalGeneral.toFixed(2));
    this.objFacturar.neto = Number(this.subTotal.toFixed(2));
    this.objFacturar.iva = Number(this.totalIva.toFixed(2));
    this.objFacturar.tipoComprobante = this.nuevaVenta.idTipoComprobante;
    this.objFacturar.tipoFacturaDesc = "Nota de Crédito";
    this.objFacturar.docNro = this.venta.cliente!.documento;
    this.objFacturar.docTipo = this.venta.cliente!.idTipoDocumento;
    this.objFacturar.docTipoDesc = this.venta.cliente!.tipoDocumento;
    this.objFacturar.condReceptor = this.venta.cliente!.idCondicionIva;
    this.objFacturar.condicion = this.venta.cliente!.condicionIva;
    this.objFacturar.cliente  = this.venta.cliente!.nombre;
    this.objFacturar.empresa = this.venta.empresa;
    this.objFacturar.idEmpresa = this.venta.idEmpresa;

    this.objFacturar.comprobanteAsociado = {
      tipo: this.venta.factura?.tipoComprobante!,
      puntoVenta : this.venta.factura?.ptoVenta!,
      numero: this.venta.factura?.ticket!,
    }
  }
}
