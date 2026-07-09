import { Component, EventEmitter, Input, OnInit, Output, SimpleChanges } from '@angular/core';
import { Venta } from '../../../../models/Factura';
import { Dialog } from 'primeng/dialog';
import { DividerModule } from 'primeng/divider';
import { DecimalFormatPipe } from '../../../../pipes/decimal-format.pipe';
import { DatePipe } from '@angular/common';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';
import { ComprobanteService } from '../../../../services/comprobante.service';
import { TipoComprobante } from '../../../../models/ObjFacturar';
import { MiscService } from '../../../../services/misc.service';
import { LineasTalle } from '../../../../models/Producto';

@Component({
  selector: 'app-vista-previa',
  imports: [
    Dialog,
    DividerModule,
    DecimalFormatPipe,
    DatePipe,
    TableModule,
    ButtonModule,
    TooltipModule
  ],
  standalone: true,
  templateUrl: './vista-previa.component.html',
  styleUrl: './vista-previa.component.scss',
})
export class VistaPreviaComponent implements OnInit {
  @Input() visible = false;
  @Input() venta: Venta = new Venta();
  // Indica si venta.productos/servicios ya vienen NETOS (sin IVA) para Factura A,
  // como deja listado-ventas.PrepararPrecios() antes de abrir esta vista (caso por defecto).
  // En addmod-ventas los precios siempre llegan BRUTOS (con IVA incluido, para A y B),
  // por eso ese caller pasa preciosNetos=false explícitamente.
  @Input() preciosNetos: boolean = true;
  @Output() visibleChange = new EventEmitter<boolean>();

  cantProductos:number = 0;
  cantservicios:number = 0;
  totalProductos:number = 0;
  totalServicios:number = 0;

  cantItems:number = 0;
  subTotal:number = 0;
  totalItems:number = 0;
  totalDescuento:number = 0;
  totalGeneral:number = 0;
  totalAPagar:number = 0;
  totalIva:number = 0;
  totalAjuste:number = 0;

  mostrarIva:boolean = false;
  saldoAplicado:number = 0;
  aplicaSaldoAFavor:boolean = false;

  lineasTalles: LineasTalle[] = [];

  constructor(
    private comprobanteService:ComprobanteService,
    private miscService:MiscService
  ){}

  ngOnInit() {
    this.miscService.ObtenerLineasTalle(true).subscribe(data => this.lineasTalles = data);
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['visible']?.currentValue === true) {
      // const pagoEnSaldo = this.venta.pagos.find(x => x.idMetodo == 8);
      // if(pagoEnSaldo){
      //   this.saldoAplicado = pagoEnSaldo.monto!;
      //   this.aplicaSaldoAFavor = true;
      // }else{
      //   this.saldoAplicado = 0;
      //   this.aplicaSaldoAFavor = false;
      // }
      // Copia ordenada por idLineaTalle: rowGroupMode/groupRowsBy de PrimeNG necesita filas
      // contiguas por grupo. No mutamos el array original del padre (venta.productos es @Input).
      if (this.venta.productos) {
        this.venta.productos = [...this.venta.productos].sort((a, b) => (a.idLineaTalle ?? 0) - (b.idLineaTalle ?? 0));
      }
      this.CalcularTotalGeneral();
  }
  }

  // Talles reales (en el mismo orden posicional que t1..t10) de la línea de talle del producto.
  // Se usa en el groupheader de la tabla de Productos para mostrar el talle real de cada columna.
  ObtenerTallesDeLinea(idLineaTalle?: number): string[] {
    return this.lineasTalles.find(l => l.id === idLineaTalle)?.talles ?? [];
  }

  // Mismo criterio que addmod-ventas.component.ts: detecta si la fila en rowIndex es
  // "continuación" del mismo producto (idProducto+idColor) que la fila anterior, cuando un
  // producto queda partido en 2+ líneas por tener precio distinto entre talles.
  EsContinuacionMismoProducto(rowIndex: number): boolean {
    if (rowIndex <= 0) return false;
    const anterior = this.venta.productos?.[rowIndex - 1];
    const actual = this.venta.productos?.[rowIndex];
    return !!anterior && !!actual
      && anterior.idProducto === actual.idProducto
      && anterior.idColor === actual.idColor;
  }

  // Complemento: true si la fila siguiente es continuación de esta (para sacarle el
  // border-bottom y que no se vea la línea divisoria entre ambas).
  PrecedeContinuacion(rowIndex: number): boolean {
    const actual = this.venta.productos?.[rowIndex];
    const siguiente = this.venta.productos?.[rowIndex + 1];
    return !!actual && !!siguiente
      && actual.idProducto === siguiente.idProducto
      && actual.idColor === siguiente.idColor;
  }

  get hayFilasContinuacion(): boolean {
    return (this.venta.productos ?? []).some((_, i) => this.EsContinuacionMismoProducto(i));
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

    const productos = procesarItems(this.venta.productos);
    const servicios = procesarItems(this.venta.servicios);

    //Sumamos ajuste si corresponde a los productos
    this.totalAjuste = this.venta.total! * 0.10;
    const totalAjuste = this.venta.ajuste == 1 ? this.totalAjuste : 0;

    this.totalProductos = productos.total + totalAjuste;
    this.totalServicios = servicios.total;

    //Importes base (bruto, sin descuento aplicado por ítem — ver fix de ítems en bruto)
    const subtotalBruto = this.totalProductos + servicios.total;
    const totalDescuento = productos.descuento + servicios.descuento;

    //Neto sin IVA (solo se usa como fallback si todavía no hay venta.factura)
    const subtotalNeto = subtotalBruto - totalDescuento;

    const esComprobanteConIva = [
         TipoComprobante.FACTURA_A,
         TipoComprobante.NC_A,
         TipoComprobante.ND_A,
         TipoComprobante.FACTURA_B
    ].includes(this.venta.idTipoComprobante!);

    // Si la venta ya está facturada (CAE/neto/iva confirmados por AFIP en venta.factura),
    // se usan esos valores como fuente de verdad en vez de recalcular desde los ítems —
    // mismo criterio ya aplicado en factura.service.ts (ver memoria "fix ítems en bruto y
    // Subtotal factura"). Evita que este resumen termine mostrando un total distinto al que
    // realmente pagó el cliente. Mientras la venta se arma en addmod-ventas todavía no hay
    // venta.factura (no se facturó contra AFIP) → se sigue calculando local como antes.
    if (this.venta.factura) {
      this.subTotal = (this.venta.factura.neto ?? subtotalNeto) + totalDescuento;
      this.totalDescuento = totalDescuento;
      this.totalIva = esComprobanteConIva ? (this.venta.factura.iva ?? 0) : 0;
      this.mostrarIva = esComprobanteConIva;
      this.totalGeneral = (this.venta.total ?? subtotalNeto) - (this.venta.redondeo ?? 0);
      this.totalAPagar = this.totalGeneral + (this.venta.redondeo ?? 0);

    } else {
      let totalIva = 0;
      let totalGeneral = 0;

      // Aplica igual para A y B: el caller decide vía preciosNetos si el precio de los
      // ítems ya viene neto (mayorista con lista propia → se suma IVA) o con IVA incluido
      // (resto de casos → se discrimina). Ver EsMayoristaConListaPropia en addmod-ventas.
      if (esComprobanteConIva) {

        if (this.preciosNetos) {
          totalIva = subtotalNeto * 0.21;
          totalGeneral = subtotalNeto + totalIva;
        } else {
          totalIva = subtotalNeto * 21 / 121;
          totalGeneral = subtotalNeto; // ya incluye IVA
        }
        this.mostrarIva = true;

      // Otros comprobantes → sin IVA
      } else {

        totalIva = 0;
        totalGeneral = subtotalNeto;
        this.mostrarIva = false;
      }

      this.subTotal = subtotalBruto;
      this.totalDescuento = totalDescuento;
      this.totalIva = totalIva;
      this.totalGeneral = totalGeneral;
      this.totalAPagar = totalGeneral + this.venta.redondeo;
    }

    // cantidades
    this.cantProductos = this.venta.productos?.reduce((acc, i) => acc + (i.cantidad || 0), 0) || 0;
    this.cantservicios = this.venta.servicios?.reduce((acc, i) => acc + (i.cantidad || 0), 0) || 0;

    this.cantItems = this.cantProductos + this.cantservicios;
  }

  Cerrar() {
    this.visibleChange.emit(false);
  }

  VerComprobante(){
    this.comprobanteService.VerComprobante(this.venta)
  }
}
