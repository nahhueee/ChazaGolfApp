import { Injectable } from '@angular/core';


import { ParametrosService } from './parametros.service';
import { NotificacionesService } from './notificaciones.service';
import { VentasService } from './ventas.service';
import { FilesService } from './files.service';
import { firstValueFrom } from 'rxjs';
import { Venta } from '../models/Factura';
import { ObjTicketFactura } from '../models/ObjTicketFactura';
import { ObjComprobante } from '../models/ObjComprobant';

@Injectable({
  providedIn: 'root'
})
export class ComprobanteService {
  private pdfMake: any;

  constructor(
    private filesService:FilesService,
    private parametrosService:ParametrosService,
    private ventasService:VentasService,
    private Notificaciones:NotificacionesService
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
      const comprobante:ObjComprobante = this.GenerarDatosComunes(venta);
      return this.ArmarInternoA4(comprobante);
    }
  
    //Genera los datos comunes del documento y la estructura de la tabla
    private GenerarDatosComunes(venta:Venta): ObjComprobante {
      let comprobante = new ObjComprobante();
  
      comprobante.papel = this.parametrosService.GetPapel();
      comprobante.nombreLocal = "CHAZA GOLF"
      comprobante.horaVenta = venta.hora;
      comprobante.cliente = venta.cliente?.id + " - " + venta.cliente?.nombre;
      comprobante.proceso = venta.proceso;
  
      const fecha = new Date(venta.fecha!);
      comprobante.fechaVenta = fecha.toLocaleDateString('es-ES', {
        day: '2-digit', month: '2-digit', year: '2-digit'
      });
  
      const FormatearCantidad = (cantidad) => {
        const cantNumero = parseFloat(cantidad);
        return cantNumero % 1 === 0 ? cantNumero.toFixed(0) : cantNumero.toFixed(1);
      };
  
      const FormatearPrecio = (precio) => {
        const pNumero = parseFloat(precio);
        return pNumero.toLocaleString('es-AR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
      };
  
      const CortarNombreProducto = (nombreProd) => {
        return nombreProd.length > 25
          ? nombreProd.substring(0, 25) + '...'
          : nombreProd;
      };

      //Productos
      comprobante.filasProducto = [
        [
          { text: 'Código', style: 'tableHeader', alignment: 'left' },
          { text: 'Producto', style: 'tableHeader', alignment: 'left' },
          { text: 'Color', style: 'tableHeader', alignment: 'left' },
          { text: 'XS', style: 'tableHeader', alignment: 'center' },
          { text: 'S', style: 'tableHeader', alignment: 'center' },
          { text: 'M', style: 'tableHeader', alignment: 'center' },
          { text: 'L', style: 'tableHeader', alignment: 'center' },
          { text: 'XL', style: 'tableHeader', alignment: 'center' },
          { text: 'XXL', style: 'tableHeader', alignment: 'center' },
          { text: '3XL', style: 'tableHeader', alignment: 'center' },
          { text: '4XL', style: 'tableHeader', alignment: 'center' },
          { text: '5XL', style: 'tableHeader', alignment: 'center' },
          { text: '6XL', style: 'tableHeader', alignment: 'center' },
          { text: 'Cant', style: 'tableHeader', alignment: 'center' },
          { text: 'Precio', style: 'tableHeader', alignment: 'right' },
          { text: 'Desc', style: 'tableHeader', alignment: 'right' },
          { text: 'Total', style: 'tableHeader', alignment: 'right' },
        ]
      ];

      const procesarItems = (items: any[]) => {
        return items?.reduce((acc, item) => {

          const totalItem = item.total || 0;

          // Si no tiene tope, se asume 100%
          const descuentoMax = item.topeDescuento ?? 100;

          // Se respeta el menor
          const descuentoAplicado = Math.min(venta.descuento, descuentoMax);
          item.descuentoAplicado = descuentoAplicado;

          const descuentoItem = (totalItem * descuentoAplicado) / 100;

          acc.total += totalItem;
          acc.descuento += descuentoItem;

          return acc;

        }, { total: 0, descuento: 0 }) || { total: 0, descuento: 0 };
      };

      const productos = procesarItems(venta.productos);
      const servicios = procesarItems(venta.servicios);


 
      venta.productos.forEach(item => {
        comprobante.filasProducto?.push([
          { text: item.codProducto, alignment: 'left' },
          CortarNombreProducto(item.nomProducto),
          { text: item.color, alignment: 'left' },
          { text: item.t1 ?? 0, alignment: 'center' },
          { text: item.t2 ?? 0, alignment: 'center' },
          { text: item.t3 ?? 0, alignment: 'center' },
          { text: item.t4 ?? 0, alignment: 'center' },
          { text: item.t5 ?? 0, alignment: 'center' },
          { text: item.t6 ?? 0, alignment: 'center' },
          { text: item.t7 ?? 0, alignment: 'center' },
          { text: item.t8 ?? 0, alignment: 'center' },
          { text: item.t9 ?? 0, alignment: 'center' },
          { text: item.t10 ?? 0, alignment: 'center' },
          FormatearCantidad(item.cantidad),
          { text: FormatearPrecio(item.unitario), alignment: 'right' },
          { text: item.descuentoAplicado + "%", alignment: 'right' },
          { text: FormatearPrecio(item.total), alignment: 'right' },
        ]);
      });
  
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
          { text: FormatearPrecio(item.total), alignment: 'right' },
        ]);
      });
  
      let totalDescuento = 0;

      comprobante.totalProductos = productos.total;
      comprobante.totalServicios = servicios.total;
      comprobante.totalItem = productos.total + servicios.total;
      totalDescuento = productos.descuento + servicios.descuento;

      comprobante.descuento = totalDescuento;
      comprobante.totalFinal = comprobante.totalItem! - totalDescuento;
      comprobante.redondeo = venta.redondeo;
      comprobante.totalAPagar = comprobante.totalFinal + comprobante.redondeo
  
      comprobante.cantProductos = venta.productos?.reduce((acc, i) => acc + (i.cantidad || 0), 0) || 0;
      comprobante.cantServicios = venta.servicios?.reduce((acc, i) => acc + (i.cantidad || 0), 0) || 0;

      return comprobante;
    }

    private ArmarInternoA4(comprobante:ObjComprobante){
      return {
        pageSize: 'A4',
        pageOrientation: 'portrait',
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

          { text: `Productos`, style: 'recargaDescuento', alignment: 'left' },
          {
            table: {
              widths: ['auto', '*', 'auto', 'auto', 'auto', 'auto', 'auto', 'auto', 'auto', 'auto', 'auto', 'auto', 'auto', 'auto', 'auto', 'auto', 'auto'],
              body: comprobante.filasProducto
            },
            layout: {
              fillColor: function (rowIndex, node, columnIndex) {
                return rowIndex === 0 ? '#CCCCCC' : null;
              },
              hLineWidth: function (i, node) {
                // Línea después del header (i == 1) y después de la última fila (i == node.table.body.length)
                return (i === 1 || i === node.table.body.length) ? 1 : 0;
              },
              vLineWidth: function (i, node) {
                return 0;
              },
              hLineColor: function (i, node) {
                return i === 1 ? 'black' : '#CCCCCC';
              },
              paddingTop: function (i, node) { return 2; },
              paddingBottom: function (i, node) { return 2; },
            },
            style: 'tableStyle' // Aplicar el estilo a la tabla
          },
          { text: `Cantidad: ${comprobante.cantProductos}`, style: 'totalProducto', alignment: 'right' },
          { text: `Total: $${comprobante.totalProductos?.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, style: 'totalProducto', alignment: 'right' },


          (comprobante.cantServicios! > 0) ? [ //Ocultamos si no hay servicios
            { text: `Servicios`, style: 'recargaDescuento', alignment: 'left' },
            {
              table: {
                widths: ['auto', '*', 'auto', 'auto', 'auto', 'auto'],
                body: comprobante.filasServicio
              },
              layout: {
                fillColor: function (rowIndex, node, columnIndex) {
                  return rowIndex === 0 ? '#CCCCCC' : null;
                },
                hLineWidth: function (i, node) {
                  // Línea después del header (i == 1) y después de la última fila (i == node.table.body.length)
                  return (i === 1 || i === node.table.body.length) ? 1 : 0;
                },
                vLineWidth: function (i, node) {
                  return 0;
                },
                hLineColor: function (i, node) {
                  return i === 1 ? 'black' : '#CCCCCC';
                },
                paddingTop: function (i, node) { return 2; },
                paddingBottom: function (i, node) { return 2; },
              },
              style: 'tableStyle' // Aplicar el estilo a la tabla
            },
            { text: `Cantidad: ${comprobante.cantServicios}`, style: 'totalProducto', alignment: 'right' },
            { text: `Total: $${comprobante.totalServicios?.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, style: 'totalProducto', alignment: 'right' },

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
                      { text: `Subtotal: $${comprobante.totalItem?.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, style: 'subtotal', alignment: 'right' },
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
