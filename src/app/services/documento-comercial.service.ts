import { Injectable } from '@angular/core';

import { ParametrosService } from './parametros.service';
import { NotificacionesService } from './notificaciones.service';
import { FilesService } from './files.service';
import { MiscService } from './misc.service';
import { firstValueFrom } from 'rxjs';
import { Venta } from '../models/Factura';
import { ObjComprobante } from '../models/ObjComprobant';
import { LineasTalle } from '../models/Producto';
import { ID_PROCESO, IdProceso, SIGLA_DOCUMENTO_COMERCIAL } from '../components/contenido/ventas/models/venta.constants';
import {
  ProcesarItemsConDescuento,
  ArmarFilasProductosConTalles,
  FormatearCantidad,
  FormatearPrecio,
  FormatearPrecioTotalNeto,
  CortarNombreProducto,
} from './helpers/tabla-productos-talles.helper';

// Empresa fija usada como emisor en el encabezado de Presupuesto/Pedido/Nota de Empaque.
// Estos 3 procesos no tienen idEmpresa asignada todavía (recién se define al facturar -
// ver esProcesoPre en vista-previa.component.ts), así que se usa siempre la empresa
// matriz (id=1, mismo criterio que otros lugares del sistema que asumen empresa 1 como
// la principal). Si en el futuro hace falta elegir la empresa al generar este
// documento, este es el único punto a tocar.
const ID_EMPRESA_DEFAULT = 1;

// Condiciones de venta fijas impresas al pie del documento (texto acordado con el
// cliente, ago-2026). Cambiar el texto acá requiere un deploy - decisión explícita
// (ver conversación de origen) de no moverlo a un parámetro configurable por ahora.
const CONDICIONES_VENTA: string[] = [
  'Validez: Esta cotización es válida por 72hs.',
  'Condiciones de pago: 50% de anticipo al confirmar el pedido. 50% restante contra entrega.',
  'Entrega: Si los productos están en stock, la entrega es inmediata.',
  'Comentario: Si es necesario producir las prendas, el tiempo de entrega se coordinará entre 20 a 30 días ' +
    'hábiles acreditado el anticipo. Para prendas con Logo en parche, el tiempo de producción es de 14 días hábiles.',
];

@Injectable({
  providedIn: 'root'
})
export class DocumentoComercialService {
  private pdfMake: any;

  constructor(
    private filesService: FilesService,
    private parametrosService: ParametrosService,
    private miscService: MiscService,
    private Notificaciones: NotificacionesService
  ) { }

  // Método para inicializar pdfMake
  async init() {
    const pdfMakeModule = await import('pdfmake/build/pdfmake');
    await import('pdfmake/build/vfs_fonts'); // side-effect

    this.pdfMake = pdfMakeModule.default || pdfMakeModule;
  }

  //#region PDF
    async VerDocumento(venta: Venta) {
      await this.init();

      const documentDefinition = await this.ArmarDocumento(venta);
      this.pdfMake.createPdf(documentDefinition).open();
    }

    async ImprimirDocumento(venta: Venta) {
      if (!this.pdfMake) {
        await this.init();
      }

      const documentDefinition = await this.ArmarDocumento(venta);
      const pdfDocGenerator = this.pdfMake.createPdf(documentDefinition);

      pdfDocGenerator.getBlob((blob) => {
        const file = new File([blob], "documento.pdf", { type: "application/pdf" });
        this.filesService.ImprimirPDF(file, this.parametrosService.GetImpresora())
        .subscribe(response => {
          if (response == 'OK')
            this.Notificaciones.Success("Impreso Correctamente.");
          });
      });
    }

    private async ArmarDocumento(venta: Venta) {
      const [lineasTalle, empresa] = await Promise.all([
        firstValueFrom(this.miscService.ObtenerLineasTalle(true)),
        firstValueFrom(this.miscService.ObtenerEmpresa(ID_EMPRESA_DEFAULT)),
      ]);

      const comprobante = this.GenerarDatosComunes(venta, lineasTalle);
      const sigla = SIGLA_DOCUMENTO_COMERCIAL[venta.idProceso as IdProceso] ?? '';

      return this.ArmarDocumentoA4(comprobante, venta, empresa, sigla);
    }

    // Genera los datos comunes del documento y la estructura de la tabla - mismo
    // criterio que comprobante.service.ts (reusa el helper de talles), con el
    // agregado de IVA 21% informativo (ver totalIva más abajo).
    private GenerarDatosComunes(venta: Venta, lineasTalle: LineasTalle[]): ObjComprobante {
      let comprobante = new ObjComprobante();

      comprobante.nroRemito = venta.id!;
      comprobante.nroProceso = venta.nroProceso;
      comprobante.nombreLocal = "CHAZA GOLF";
      comprobante.horaVenta = venta.hora;
      comprobante.cliente = venta.cliente?.id + " - " + (venta.cliente?.razonSocial || venta.cliente?.nombre);
      comprobante.proceso = venta.proceso;

      const fecha = new Date(venta.fecha!);
      comprobante.fechaVenta = fecha.toLocaleDateString('es-ES', {
        day: '2-digit', month: '2-digit', year: '2-digit'
      });

      if (venta.fechaEntrega) {
        comprobante.fechaEntrega = new Date(venta.fechaEntrega).toLocaleDateString('es-ES', {
          day: '2-digit', month: '2-digit', year: '2-digit'
        });
      }
      comprobante.observacion = venta.observacion;

      const descuentoGeneral = Number(venta.descuento) || 0;
      const productos = ProcesarItemsConDescuento(venta.productos, descuentoGeneral);
      const servicios = ProcesarItemsConDescuento(venta.servicios, descuentoGeneral);

      // Sin ítems (caso límite heredado del mismo criterio que comprobante.service.ts/
      // factura.service.ts para NC X "sin productos" - acá no debería darse en la
      // práctica para Presupuesto/Pedido/Nota de Empaque, pero se cubre igual para no
      // romper si algún día se reusa este servicio para otro proceso).
      const sinItems = (!venta.productos || venta.productos.length === 0)
        && (!venta.servicios || venta.servicios.length === 0);
      comprobante.sinItems = sinItems;

      const productosOrdenados = [...(venta.productos ?? [])]
        .sort((a, b) => (a.idLineaTalle ?? 0) - (b.idLineaTalle ?? 0));

      const tablaProductos = ArmarFilasProductosConTalles(productosOrdenados, lineasTalle);
      comprobante.filasProducto = tablaProductos.filasProducto;
      comprobante.filasProductoGrupos = tablaProductos.filasProductoGrupos;
      comprobante.filasProductoContinuacion = tablaProductos.filasProductoContinuacion;

      //Servicios
      comprobante.filasServicio = [
        [
          { text: 'Código', style: 'tableHeader', alignment: 'left' },
          { text: 'Servicio', style: 'tableHeader', alignment: 'left' },
          { text: 'Cant', style: 'tableHeader', alignment: 'center' },
          { text: 'Precio', style: 'tableHeader', alignment: 'right' },
          { text: 'Desc', style: 'tableHeader', alignment: 'right' },
          { text: 'Total', style: 'tableHeader', alignment: 'right' },
        ]
      ];

      venta.servicios.forEach(item => {
        comprobante.filasServicio?.push([
          { text: item.codServicio, alignment: 'left' },
          CortarNombreProducto(item.nomServicio),
          FormatearCantidad(item.cantidad),
          { text: FormatearPrecio(item.unitario), alignment: 'right' },
          { text: item.descuentoAplicado + "%", alignment: 'right' },
          { text: FormatearPrecioTotalNeto(item.unitario, item.cantidad, item.descuentoAplicado), alignment: 'right' },
        ]);
      });

      //Importes base
      const subtotalBruto = productos.subtotal + servicios.subtotal;
      const totalDescuento = productos.descuento + servicios.descuento;
      const subtotalNeto = subtotalBruto - totalDescuento;

      // Sin discriminar IVA: Presupuesto/Pedido/Nota de Empaque no son comprobantes
      // fiscales (no pasan por AFIP) - decisión explícita del cliente (ago-2026) de no
      // mostrarlo, ni siquiera informativamente, para no sugerir que el documento tiene
      // valor fiscal. Mismo criterio que ya usa comprobante.service.ts (remito).
      comprobante.totalIva = 0;

      if (sinItems) {
        comprobante.subTotal = venta.total ?? 0;
        comprobante.descuento = 0;
        comprobante.totalFinal = venta.total ?? 0;
      } else {
        comprobante.subTotal = subtotalBruto;
        comprobante.descuento = totalDescuento;
        comprobante.totalFinal = subtotalNeto;
      }

      comprobante.redondeo = venta.redondeo;
      comprobante.totalAPagar = comprobante.totalFinal! + comprobante.redondeo!;
      comprobante.cantProductos = venta.productos?.reduce((acc, i) => acc + (i.cantidad || 0), 0) || 0;
      comprobante.cantServicios = venta.servicios?.reduce((acc, i) => acc + (i.cantidad || 0), 0) || 0;

      return comprobante;
    }

    private ArmarDocumentoA4(comprobante: ObjComprobante, venta: Venta, empresa: any, sigla: string) {
      const cliente = venta.cliente;
      const direccionCliente = cliente?.direcciones?.[0]?.resumen || '-';

      // Qué se imprime al pie difiere por proceso (ago-2026, pedido del cliente):
      // - Presupuesto: Condiciones de Venta (fijas) + Observaciones. Sin Fecha de
      //   Entrega (todavía no hay nada confirmado en esta etapa).
      // - Pedido/Nota de Empaque: Observaciones + Fecha de Entrega. Sin Condiciones de
      //   Venta (ya no es una cotización, el pedido está en curso).
      const esPresupuesto = venta.idProceso === ID_PROCESO.PRESUPUESTO;

      return {
        pageSize: 'A4',
        pageOrientation: 'landscape',
        pageMargins: [10, 10, 10, 10],
        content: [

          //Datos de la empresa (fija, ver ID_EMPRESA_DEFAULT) y tipo/número de documento
          {
            table: {
              widths: ['45%', '10%', '45%'],
              body: [
                [
                  {
                    stack: [
                      { text: empresa?.razonSocial?.toUpperCase(), style: 'titulo', alignment: 'center' },
                      { text: [{ text: 'Dirección: ', bold: true }, { text: empresa?.direccion }], style: 'simple' },
                      { text: [{ text: 'Teléfono: ', bold: true }, { text: empresa?.telefono }], style: 'simple' },
                      { text: [{ text: 'Email: ', bold: true }, { text: empresa?.email }], style: 'simple' },
                      { text: [{ text: 'Ing. Brutos: ', bold: true }, { text: empresa?.IIBB }], style: 'simple' },
                      { text: [{ text: 'Inicio de Actividades: ', bold: true }, { text: empresa?.inicioAct }], style: 'simple' },
                    ]
                  },
                  {
                    stack: [
                      { text: sigla, style: 'tipoComprobante' },
                    ],
                    alignment: 'center'
                  },
                  {
                    stack: [
                      { text: comprobante.proceso, style: 'titulo', alignment: 'center' },
                      { text: [{ text: 'N°: ', bold: true }, { text: comprobante.nroProceso?.toString().padStart(4, '0') ?? '-', bold: true }], style: 'simple' },
                      { text: [{ text: 'Fecha Emisión: ', bold: true }, { text: comprobante.fechaVenta }], style: 'simple' },
                      (comprobante.fechaEntrega && !esPresupuesto) ? { text: [{ text: 'Fecha de Entrega: ', bold: true }, { text: comprobante.fechaEntrega }], style: 'simple' } : [],
                      { text: [{ text: 'CUIT: ', bold: true }, { text: empresa?.cuil }], style: 'simple' },
                      { text: [{ text: 'Cond. IVA: ', bold: true }, { text: empresa?.condicion?.toUpperCase() }], style: 'simple' },
                      { text: 'DOCUMENTO NO VALIDO COMO FACTURA', style: 'leyendaNoFiscal' },
                    ]
                  }
                ]
              ]
            },
            layout: {
              hLineWidth: function () { return 0.5; },
              vLineWidth: function () { return 0.5; },
              hLineColor: function () { return '#aaa'; },
              vLineColor: function () { return '#aaa'; }
            },
            style: 'tableStyle'
          },

          //Datos del cliente
          {
            table: {
              widths: ['*'],
              body: [
                [
                  {
                    stack: [
                      { text: [{ text: 'Cliente N°: ', bold: true }, { text: cliente?.id?.toString() ?? '-' }], style: 'simple', margin: [8, 5, 0, 4] },
                      { text: [{ text: 'Razón Social: ', bold: true }, { text: cliente?.razonSocial || cliente?.nombre }], style: 'simple' },
                      { text: [{ text: 'Dirección: ', bold: true }, { text: direccionCliente }], style: 'simple' },
                      { text: [{ text: 'Teléfono: ', bold: true }, { text: cliente?.telefono || '-' }], style: 'simple' },
                      { text: [{ text: 'CUIL/CUIT: ', bold: true }, { text: cliente?.documento?.toString() || '-' }], style: 'simple' },
                    ]
                  },
                ]
              ]
            },
            layout: {
              fillColor: function (rowIndex) {
                return rowIndex === 0 ? '#eeeeee' : null;
              },
              hLineWidth: function () { return 0.5; },
              vLineWidth: function () { return 0.5; },
              hLineColor: function () { return '#aaa'; },
              vLineColor: function () { return '#aaa'; }
            },
            margin: [0, 10, 0, 10]
          },

          //Tabla de productos con desglose de talles (mismo layout que comprobante.service.ts)
          { text: `Detalle Productos`, style: 'recargaDescuento', alignment: 'left', bold: true },
          comprobante.sinItems ? [
            {
              text: comprobante.observacion ? `Motivo: ${comprobante.observacion}` : 'Sin productos',
              style: 'totalProducto', alignment: 'left', italics: true, margin: [3, 2, 3, 6]
            },
          ] : [
          {
            table: {
              widths: ['auto', '*', 'auto', 'auto', 'auto', 'auto', 'auto', 'auto', 'auto', 'auto', 'auto', 'auto', 'auto', 'auto', 'auto', 'auto', 'auto'],
              body: comprobante.filasProducto
            },
            layout: {
              fillColor: function (rowIndex, node, columnIndex) {
                if (rowIndex === 0) return '#CCCCCC';
                if (comprobante.filasProductoGrupos?.includes(rowIndex)) return '#E8E8E8';
                const idxZebra = comprobante.filasProductoContinuacion?.includes(rowIndex) ? rowIndex - 1 : rowIndex;
                return idxZebra % 2 === 0 ? '#F5F5F5' : null;
              },
              hLineWidth: function (i, node) {
                if (comprobante.filasProductoContinuacion?.includes(i)) return 0;
                return (i === 1 || i === node.table.body.length || comprobante.filasProductoGrupos?.includes(i)) ? 1 : 0.5;
              },
              vLineWidth: function (i, node) { return 0.5; },
              hLineColor: function (i, node) { return i === 1 ? 'black' : '#CCCCCC'; },
              vLineColor: function (i, node) { return '#CCCCCC'; },
              paddingTop: function (i, node) { return 3; },
              paddingBottom: function (i, node) { return 3; },
              paddingLeft: function (i, node) { return (i >= 3 && i <= 12) ? 6 : 4; },
              paddingRight: function (i, node) { return (i >= 3 && i <= 12) ? 6 : 4; },
            },
            style: 'tableStyle'
          },
          { text: `Cantidad: ${comprobante.cantProductos}`, style: 'totalProducto', alignment: 'right' },
          ],

          (comprobante.cantServicios! > 0) ? [ //Ocultamos si no hay servicios
            { text: `Detalle Servicios`, style: 'recargaDescuento', alignment: 'left', bold: true },
            {
              table: {
                widths: ['auto', '*', 'auto', 'auto', 'auto', 'auto'],
                body: comprobante.filasServicio
              },
              layout: {
                fillColor: function (rowIndex, node, columnIndex) {
                  return rowIndex === 0 ? '#CCCCCC' : null;
                },
                hLineWidth: function (i, node) { return (i === 1 || i === node.table.body.length) ? 1 : 0.5; },
                vLineWidth: function (i, node) { return 0.5; },
                hLineColor: function (i, node) { return i === 1 ? 'black' : '#CCCCCC'; },
                vLineColor: function (i, node) { return '#CCCCCC'; },
                paddingTop: function (i, node) { return 2; },
                paddingBottom: function (i, node) { return 2; },
              },
              style: 'tableStyle'
            },
            { text: `Cantidad: ${comprobante.cantServicios}`, style: 'totalProducto', alignment: 'right' },
          ] : [],

          //Condiciones de Venta (izquierda) + Resumen de totales (derecha), en la misma
          //fila para ahorrar espacio de hoja - sin discriminar IVA (ver GenerarDatosComunes).
          {
            table: {
              widths: ['55%', '45%'],
              body: [
                [
                  {
                    stack: esPresupuesto ? [
                      { text: 'CONDICIONES DE VENTA', style: 'tituloCondiciones' },
                      ...CONDICIONES_VENTA.map(linea => ({ text: linea, style: 'condicion' })),
                      ...(comprobante.observacion
                        ? [{ text: [{ text: 'Observaciones: ', bold: true }, { text: comprobante.observacion }], style: 'condicion' }]
                        : []),
                    ] : [
                      ...(comprobante.observacion
                        ? [{ text: [{ text: 'Observaciones: ', bold: true }, { text: comprobante.observacion }], style: 'condicion' }]
                        : []),
                    ]
                  },
                  {
                    stack: [
                      { text: `Subtotal: $${comprobante.subTotal?.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, style: 'subtotal', alignment: 'right' },
                      { text: `Descuento: $${comprobante.descuento?.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, style: 'descuento', alignment: 'right' },
                      { text: `Total General: $${comprobante.totalFinal?.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, style: 'total', alignment: 'right' },
                    ]
                  }
                ]
              ]
            },
            layout: {
              hLineWidth: function () { return 0.5; },
              vLineWidth: function () { return 0.5; },
              hLineColor: function () { return '#aaa'; },
              vLineColor: function () { return '#aaa'; }
            },
            style: 'totales'
          },
        ],
        styles: {
          titulo: {
            fontFamily: "LEMONMILK",
            fontSize: 14,
            bold: true,
            margin: [0, 10, 0, 8]
          },
          simple: {
            fontSize: 10,
            margin: [8, 0, 0, 4]
          },
          tipoComprobante: {
            fontSize: 22,
            bold: true,
            decoration: 'underline',
            margin: [0, 15, 0, 3]
          },
          leyendaNoFiscal: {
            fontSize: 8,
            italics: true,
            margin: [0, 6, 0, 0]
          },
          totalProducto: {
            fontSize: 11,
            bold: false,
            margin: [3, 1, 3, 1]
          },
          recargaDescuento: {
            fontSize: 11,
            bold: false,
            margin: [3, 1, 3, 1]
          },
          subtotal: {
            fontSize: 11,
            bold: false,
            margin: [3, 6, 3, 1]
          },
          descuento: {
            fontSize: 11,
            bold: false,
            margin: [3, 1, 3, 1]
          },
          total: {
            fontSize: 12,
            bold: true,
            margin: [3, 10, 3, 5]
          },
          tableStyle: {
            fontSize: 11,
            margin: [0, 0, 0, 5]
          },
          totales: {
            margin: [0, 10, 0, 0]
          },
          tituloCondiciones: {
            fontSize: 11,
            bold: true,
            margin: [0, 3, 0, 3]
          },
          condicion: {
            fontSize: 9,
            margin: [5, 2, 5, 2]
          },
        }
      };
    }
}
