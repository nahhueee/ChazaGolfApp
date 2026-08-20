import { Injectable } from '@angular/core';


import { ParametrosService } from './parametros.service';
import { NotificacionesService } from './notificaciones.service';
import { VentasService } from './ventas.service';
import { FilesService } from './files.service';
import { MiscService } from './misc.service';
import { firstValueFrom } from 'rxjs';
import { Venta } from '../models/Factura';
import { ObjTicketFactura } from '../models/ObjTicketFactura';
import { ObjComprobante } from '../models/ObjComprobant';
import { LineasTalle } from '../models/Producto';
import {
  ProcesarItemsConDescuento,
  ArmarFilasProductosConTalles,
  FormatearCantidad,
  FormatearPrecio,
  FormatearPrecioTotalNeto,
  CortarNombreProducto,
} from './helpers/tabla-productos-talles.helper';

@Injectable({
  providedIn: 'root'
})
export class ComprobanteService {
  private pdfMake: any;

  constructor(
    private filesService:FilesService,
    private parametrosService:ParametrosService,
    private ventasService:VentasService,
    private Notificaciones:NotificacionesService,
    private miscService:MiscService
  ) { }

  // Método para inicializar pdfMake
  async init() {
    const pdfMakeModule = await import('pdfmake/build/pdfmake');
    await import('pdfmake/build/vfs_fonts'); // side-effect

    this.pdfMake = pdfMakeModule.default || pdfMakeModule;
  }

  //#region PDF
    async VerComprobante(venta: Venta) {
      await this.init();

      const documentDefinition = await this.ArmarComprobante(venta);
      this.pdfMake.createPdf(documentDefinition).open();
    }

    async ImprimirComprobante(tipo:string, venta:Venta){
        if (!this.pdfMake) {
            await this.init();
        }

      const documentDefinition = await this.ArmarComprobante(venta);
      const pdfDocGenerator = this.pdfMake.createPdf(documentDefinition);
  
      pdfDocGenerator.getBlob((blob) => {
        const file = new File([blob], "ticket.pdf", { type: "application/pdf" });
        this.filesService.ImprimirPDF(file, this.parametrosService.GetImpresora())
        .subscribe(response => {
          if(response=='OK')
            this.Notificaciones.Success("Impreso Correctamente.");
          });    
      });
    }
  
    private async ArmarComprobante(venta: Venta) {
      const lineasTalle = await firstValueFrom(this.miscService.ObtenerLineasTalle(true));
      const comprobante:ObjComprobante = this.GenerarDatosComunes(venta, lineasTalle);
      return this.ArmarInternoA4(comprobante);
    }

    //Genera los datos comunes del documento y la estructura de la tabla
    private GenerarDatosComunes(venta:Venta, lineasTalle:LineasTalle[]): ObjComprobante {
      let comprobante = new ObjComprobante();
  
      comprobante.papel = this.parametrosService.GetPapel();
      comprobante.nombreLocal = "CHAZA GOLF"
      comprobante.horaVenta = venta.hora;
      comprobante.cliente = venta.cliente?.id + " - " + venta.cliente?.nombre;
      comprobante.proceso = venta.proceso;
      comprobante.nroRemito = venta.id!;
  
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
  
      // Descuento general + procesamiento de ítems (subtotal/descuento/total bruto,
      // respetando tope de descuento por ítem) - lógica compartida con
      // documento-comercial.service.ts (ver tabla-productos-talles.helper.ts).
      const descuentoGeneral = Number(venta.descuento) || 0;
      const productos = ProcesarItemsConDescuento(venta.productos, descuentoGeneral);
      const servicios = ProcesarItemsConDescuento(venta.servicios, descuentoGeneral);

      // NC X "sin productos" (ver nota-credito-x.component.ts): sin ítems, el importe
      // real es el total que cargó el usuario a mano (venta.total) - mismo criterio
      // que factura.service.ts (comprobante.sinItems).
      const sinItems = (!venta.productos || venta.productos.length === 0)
        && (!venta.servicios || venta.servicios.length === 0);
      comprobante.sinItems = sinItems;

      // Agrupamos por línea de talle (idLineaTalle) para mostrar, en un subheader por grupo,
      // los talles reales de esa línea (ej. 28-46 numérico vs XS-6XL letra) en vez de un único
      // header global que no aplica a todos los productos. Clonamos antes de ordenar: no hay
      // que mutar venta.productos, lo reutiliza el caller (mismo criterio que
      // vista-previa.component.ts.ngOnChanges).
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

      comprobante.subTotal = productos.total + servicios.total;
      comprobante.descuento = productos.descuento + servicios.descuento;
      comprobante.totalIva = 0;
      comprobante.totalFinal = comprobante.subTotal! - comprobante.descuento!;

      //Definimos totales
      if (sinItems) {
        // NC X sin productos: no hay ítems de los que partir, el total es el que
        // cargó el usuario en nota-credito-x.component.ts (venta.total).
        comprobante.subTotal = venta.total ?? 0;
        comprobante.descuento = 0;
        comprobante.totalFinal = venta.total ?? 0;
      } else {
        comprobante.subTotal = subtotalBruto;
        comprobante.descuento = totalDescuento;
        comprobante.totalFinal = subtotalBruto - totalDescuento;
      }
      comprobante.redondeo = venta.redondeo;
      comprobante.totalAPagar = comprobante.totalFinal + comprobante.redondeo;
      comprobante.cantProductos = venta.productos?.reduce((acc, i) => acc + (i.cantidad || 0), 0) || 0;
      comprobante.cantServicios = venta.servicios?.reduce((acc, i) => acc + (i.cantidad || 0), 0) || 0;

      return comprobante;
    }

    private ArmarInternoA4(comprobante:ObjComprobante){
      return {
        pageSize: 'A4',
        pageOrientation: 'landscape',
        pageMargins: [10, 10, 10, 10],
        content: [
          {
            columns: [
              { text: comprobante.nombreLocal?.toUpperCase(), style: 'titulo', alignment: 'left' },
              { text: comprobante.fechaVenta + " " + comprobante.horaVenta, style: 'fecha', alignment: 'right' }
            ]
          },  
          {
            text: [
              { text: 'Nro Remito: ', bold: true },
              { text: comprobante.nroRemito.toString().padStart(8, '0')}
            ],
            style: 'simple'
          },
          {
            text: [
              { text: 'Proceso: ', bold: true },
              { text: comprobante.proceso }
            ],
            style: 'simple'
          },
          {
            text: [
              { text: 'Cliente: ', bold: true },
              { text: comprobante.cliente }
            ],
            style: 'cliente'
          },
          comprobante.fechaEntrega ? {
            text: [
              { text: 'Fecha de Entrega: ', bold: true },
              { text: comprobante.fechaEntrega }
            ],
            style: 'cliente'
          } : [],
          comprobante.observacion ? {
            text: [
              { text: 'Observaciones: ', bold: true },
              { text: comprobante.observacion }
            ],
            style: 'cliente'
          } : [],

          { text: `Productos`, style: 'recargaDescuento', alignment: 'left' },
          comprobante.sinItems ? [
            { text: 'Sin productos', style: 'totalProducto', alignment: 'left', italics: true, margin: [3, 2, 3, 6] },
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
                // Continuación del mismo producto: mismo color de fondo que la fila anterior
                // (si no, el zebra la pinta distinto y rompe la sensación de "misma línea").
                const idxZebra = comprobante.filasProductoContinuacion?.includes(rowIndex) ? rowIndex - 1 : rowIndex;
                return idxZebra % 2 === 0 ? '#F5F5F5' : null;
              },
              hLineWidth: function (i, node) {
                // Sin línea arriba de una fila de continuación (mismo producto, precio
                // distinto por talle): se tiene que leer pegada a la fila anterior.
                if (comprobante.filasProductoContinuacion?.includes(i)) return 0;
                // Línea después del header (i == 1), arriba de cada subheader de grupo,
                // y después de la última fila (i == node.table.body.length)
                return (i === 1 || i === node.table.body.length || comprobante.filasProductoGrupos?.includes(i)) ? 1 : 0.5;
              },
              vLineWidth: function (i, node) {
                return 0.5;
              },
              hLineColor: function (i, node) {
                return i === 1 ? 'black' : '#CCCCCC';
              },
              vLineColor: function (i, node) {
                return '#CCCCCC';
              },
              paddingTop: function (i, node) { return 3; },
              paddingBottom: function (i, node) { return 3; },
              // Un poco más de aire horizontal en las columnas de talle (3 a 12) para que no
              // queden pegadas a la cuadrícula.
              paddingLeft: function (i, node) { return (i >= 3 && i <= 12) ? 6 : 4; },
              paddingRight: function (i, node) { return (i >= 3 && i <= 12) ? 6 : 4; },
            },
            style: 'tableStyle' // Aplicar el estilo a la tabla
          },
          { text: `Cantidad: ${comprobante.cantProductos}`, style: 'totalProducto', alignment: 'right' },
          // { text: `Total: $${comprobante.totalProductos?.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, style: 'totalProducto', alignment: 'right' },
          ],

          (comprobante.cantServicios! > 0) ? [ //Ocultamos si no hay servicios
            { text: `Servicios`, style: 'recargaDescuento', alignment: 'left' },
            {
              table: {
                widths: ['auto', '*', 'auto', 'auto', 'auto', 'auto'],
                body: comprobante.filasServicio
              },
              layout: {
                fillColor: function (rowIndex, node, columnIndex) {
                  if (rowIndex === 0) return '#CCCCCC';
                  return rowIndex % 2 === 0 ? '#F5F5F5' : null;
                },
                hLineWidth: function (i, node) {
                  // Línea después del header (i == 1) y después de la última fila (i == node.table.body.length)
                  return (i === 1 || i === node.table.body.length) ? 1 : 0.5;
                },
                vLineWidth: function (i, node) {
                  return 0.5;
                },
                hLineColor: function (i, node) {
                  return i === 1 ? 'black' : '#CCCCCC';
                },
                vLineColor: function (i, node) {
                  return '#CCCCCC';
                },
                paddingTop: function (i, node) { return 2; },
                paddingBottom: function (i, node) { return 2; },
              },
              style: 'tableStyle' // Aplicar el estilo a la tabla
            },
            { text: `Cantidad: ${comprobante.cantServicios}`, style: 'totalProducto', alignment: 'right' },
            // { text: `Total: $${comprobante.totalServicios?.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, style: 'totalProducto', alignment: 'right' },

          ]: [],

          {
            table: {
              widths: ['50%','50%'],
              body: [
                [
                  {
                    stack: [
                     
                    ]
                  },
                  {
                    stack: [
                      { text: `Subtotal: $${comprobante.subTotal?.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, style: 'subtotal', alignment: 'right' },
                      { text: `Descuento: $${comprobante.descuento?.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, style: 'descuento', alignment: 'right' },

                      { text: `Total General: $${comprobante.totalFinal?.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, style: 'recargaDescuento', alignment: 'right' },
                      { text: `Redondeo: $${comprobante.redondeo?.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, style: 'recargaDescuento', alignment: 'right' },
                      { text: `Total A Pagar: $${comprobante.totalFinal?.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, style: 'total', alignment: 'right' }
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
            fontSize: 15,
            bold: true,
            margin: [0, 0, 0, 5]
          },
          fecha: {
            fontSize: 12, 
            margin: [0, 0, 0, 5]
          },
          simple: {
            fontSize: 11,
            margin: [0, 0, 0, 0]
          },
          cliente: {
            fontSize: 11,
            margin: [0, 0, 0, 5]
          },
          total: {
            fontSize: 12,
            bold: true,
            margin: [3, 12, 3, 5]
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
            margin: [3, 12, 3, 1]
          },
          descuento: {
            fontSize: 11,
            bold: false,
            margin: [3, 1, 3, 12]
          },
          tableStyle: {
            fontSize: 11, // Cambiar el tamaño de letra de la tabla
            margin: [0, 0, 0, 5]
          },
          totales: {
            margin: [0, 10, 0, 0]
          }
        }
      };
    }
}
