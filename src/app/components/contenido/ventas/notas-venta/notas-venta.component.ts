import { Component, EventEmitter, Input, Output, SimpleChanges } from '@angular/core';
import { ProductosFactura, ServiciosFactura, Venta } from '../../../../models/Factura';
import { Dialog } from 'primeng/dialog';
import { DividerModule } from 'primeng/divider';
import { DecimalFormatPipe } from '../../../../pipes/decimal-format.pipe';
import { CommonModule, DatePipe } from '@angular/common';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { NotificacionesService } from '../../../../services/notificaciones.service';
import { VentasService } from '../../../../services/ventas.service';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService } from 'primeng/api';
import { Cliente } from '../../../../models/Cliente';
import { ObjFacturar, TipoComprobante } from '../../../../models/ObjFacturar';
import { FacturarVentaComponent } from '../facturar-venta/facturar-venta.component';
import { FacturaVenta } from '../../../../models/FacturaVenta';
import { TALLES_ESTANDAR } from '../models/venta.constants';

@Component({
  selector: 'app-notas-venta',
  standalone: true,
  imports: [
    CommonModule,
    Dialog,
    DividerModule,
    DecimalFormatPipe,
    DatePipe,
    TableModule,
    ButtonModule,
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
  productosSeleccionados: ProductosFactura[] = [];
  serviciosSeleccionados: ServiciosFactura[] = [];
  modalFacturarVisible: boolean = false;

  nuevaVenta:Venta = new Venta();
  proximoNroProceso: number = 0;

  constructor(
    private Notificaciones: NotificacionesService,
    private ventasService: VentasService,
    private confirmationService: ConfirmationService,
  ){}
  
  ngOnChanges(changes: SimpleChanges) {
    if (changes['visible']?.currentValue === true) {
      this.productosSeleccionados = [];
      this.serviciosSeleccionados = [];
      this.CalcularTotalGeneral()
    }
  }

  CerrarModal(actualizar:boolean) {
    this.cerrar.emit(actualizar);
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

  CalcularTotalGeneral() {
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

      const esTipoA = [
        TipoComprobante.FACTURA_A,
        TipoComprobante.NC_A,
        TipoComprobante.ND_A
      ].includes(this.venta.idTipoComprobante!);

      const esTipoB = this.venta.idTipoComprobante === TipoComprobante.FACTURA_B;

      if (esTipoB) {
        // FACTURA B: el precio ya incluye IVA, se discrimina.
        const totalConIva = this.subTotal;

        this.totalIva = totalConIva * 21 / 121;
        this.subTotal = totalConIva - this.totalIva;
        this.totalGeneral = totalConIva;
        this.mostrarIva = true;

      } else if (esTipoA) {
        // FACTURA A: a diferencia de B, acá this.subTotal llega NETO (sin IVA).
        // PrepararPrecios() en listado-ventas.component.ts ya divide unitario/1.21
        // para este tipo de comprobante antes de abrir este modal, así que corresponde
        // sumar el IVA (no discriminarlo de un total que ya viene neto).
        this.totalIva = this.subTotal * 0.21;
        this.totalGeneral = this.subTotal + this.totalIva;
        this.mostrarIva = true;
      }

      // FACTURA C u otros → sin IVA (quedan los valores base seteados arriba)
    }
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
    // el IVA en la línea editada (unitario siempre queda bruto).
    producto.total = producto.cantidad * (producto.precioMostrar ?? producto.unitario);

    // Prorratea el descuento a la cantidad efectivamente devuelta, no a la original.
    producto.importeDescuento = producto.total * ((producto.descuentoAplicado ?? 0) / 100);
    producto.totalMostrar = producto.total - producto.importeDescuento;

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
    servicio.total = servicio.cantidad * (servicio.precioMostrar ?? servicio.unitario);
    servicio.importeDescuento = servicio.total * ((servicio.descuentoAplicado ?? 0) / 100);
    servicio.totalMostrar = servicio.total - servicio.importeDescuento;

    this.CalcularTotalGeneral();
  }

  Confirmar(){
    if(this.totalGeneral <= 0){
      this.Notificaciones.Warn("No se permite realizar una nota de credito por $0");
      return;
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

        if(this.venta.proceso != "COTIZACION")
          this.nuevaVenta.factura = factura;

        this.ventasService.Agregar(this.nuevaVenta, true)
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
    this.nuevaVenta.idPunto = 7; //Otros
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

    if(this.venta.idTipoComprobante == 6) {//FACTURA B
      this.nuevaVenta.idTipoComprobante = 8;
      this.nuevaVenta.estado = "Facturada";
    }
    else if(this.venta.idTipoComprobante == 1) {//FACTURA A
      this.nuevaVenta.idTipoComprobante = 3;
      this.nuevaVenta.estado = "Facturada";
    }
    else{
      this.nuevaVenta.idTipoComprobante = 100; //COTIZACION
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
