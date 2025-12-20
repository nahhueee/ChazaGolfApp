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
    async VerComprobante(tipo: string, venta: Venta) {
      await this.init();

      const documentDefinition = await this.ArmarComprobante(tipo, venta);
      this.pdfMake.createPdf(documentDefinition).open();
    }

  
    async ImprimirComprobante(tipo:string, venta:Venta){
        if (!this.pdfMake) {
            await this.init();
        }

      const documentDefinition = await this.ArmarComprobante(tipo, venta);
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
  
    private async ArmarComprobante( tipoComprobante: string, venta: Venta) {
      const comprobante:ObjComprobante = this.GenerarDatosComunes(venta);
      
      if(tipoComprobante === "interno"){ //Comprobantes internos
          return this.ArmarInternoA4(comprobante);
      }else{  //Comprobantes tipo factura
  
        //Obtenemos los datos de la vena facturada
        const datosFactura:ObjTicketFactura = new ObjTicketFactura({
          puntoVta : venta.factura?.ptoVenta,
          ticket : venta.factura?.ticket,
          neto : venta.factura?.neto,
          iva : venta.factura?.iva,
          cae : venta.factura?.cae,
          nroTipoFactura: venta.factura?.tipoFactura,
          DNI: venta.factura?.dni,
          tipoDNI: venta.factura?.tipoDni,
          condReceptor: venta.factura?.condReceptor,
        });
  
        //Formateamos la fecha
        const fecha = new Date(venta.factura?.caeVto!);
        datosFactura.caeVto = fecha.toLocaleDateString('es-ES', {
          day: '2-digit', month: '2-digit', year: '2-digit'
        });
  
        //Indicamos el tipo de factura realizada
        switch (datosFactura.nroTipoFactura) {
          case 1:
              datosFactura.tipoFactura = "A";
              break;
          case 6:
              datosFactura.tipoFactura = "B";
              break;
          case 11:
              datosFactura.tipoFactura = "C";
              break;
        }
  
        //Obtenemos datos grabados para la facturacion
        const parametrosFacturacion = await firstValueFrom(this.parametrosService.ObtenerParametrosFacturacion());
        if(parametrosFacturacion.condicion == 'responsable_inscripto'){
            datosFactura.condicion = "RESPONSABLE INSCRIPTO";
        }else{
          datosFactura.condicion = "MONOTRIBUTISTA";
        }
        datosFactura.CUIL = parametrosFacturacion.cuil;
        datosFactura.direccion = parametrosFacturacion.direccion;
        datosFactura.razon = parametrosFacturacion.razon;
       
        //Definimos datos del receptor
        switch (datosFactura.condReceptor) {
          case 5:
            datosFactura.condCliente = 'Consumidor Final';
            break;
          case 1:
            datosFactura.condCliente = 'IVA Responsable Inscripto';
            break;
          case 6:
            datosFactura.condCliente = 'Responsable Monotributo';
            break;
          case 13:
            datosFactura.condCliente = 'Monotributista Social';
            break;
          case 15:
            datosFactura.condCliente = 'IVA No Alcanzado';
            break;
        }
   
        //Obtenemos el codigo QR
        datosFactura.qr = await firstValueFrom(this.ventasService.ObtenerQR(venta.id!));
        return this.ArmarFacturaA4(comprobante, datosFactura);
      }
  
    }
  
  
    //Genera los datos comunes del documento y la estructura de la tabla
    private GenerarDatosComunes(venta:Venta): ObjComprobante {
      let comprobante = new ObjComprobante();
  
      comprobante.papel = this.parametrosService.GetPapel();
      comprobante.nombreLocal = "CHAZA GOLF"
      comprobante.horaVenta = venta.hora;
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
          { text: 'Total', style: 'tableHeader', alignment: 'right' }
        ]
      ];
 
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
          { text: FormatearPrecio(item.total), alignment: 'right' }
        ]);
      });
  
      //let totalProducto = venta.productos.reduce((sum, item) => sum + (item.cantidad! * item.unitario!), 0);

      //Servicios
      comprobante.filasServicio = [
        [
          { text: 'Código', style: 'tableHeader', alignment: 'left' },
          { text: 'Servicio', style: 'tableHeader', alignment: 'left' },
          { text: 'Cant', style: 'tableHeader', alignment: 'center' },
          { text: 'Precio', style: 'tableHeader', alignment: 'right' },
          { text: 'Total', style: 'tableHeader', alignment: 'right' }
        ]
      ];
 
      venta.servicios.forEach(item => {
        comprobante.filasServicio?.push([
          { text: item.codServicio, alignment: 'left' },
          CortarNombreProducto(item.nomServicio),
          FormatearCantidad(item.cantidad),
          { text: FormatearPrecio(item.unitario), alignment: 'right' },
          { text: FormatearPrecio(item.total), alignment: 'right' }
        ]);
      });
  
      //let totalServicio = venta.servicios.reduce((sum, item) => sum + (item.cantidad! * item.unitario!), 0);
     
      // comprobante.totalProductos = totalProducto;
      // comprobante.totalServicios = totalServicio;
      // comprobante.descuento = venta.descuento;
      // comprobante.redondeo = venta.redondeo;
      // comprobante.totalFinal = totalProducto + totalServicio - venta.descuento - venta.redondeo;


      let totalItems = 0;
      let totalDescuento = 0;

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

      comprobante.totalItem = productos.total + servicios.total;
      totalDescuento = productos.descuento + servicios.descuento;

      comprobante.descuento = totalDescuento;
      comprobante.totalFinal = comprobante.totalItem! - totalDescuento;
      comprobante.redondeo = venta.redondeo;
      comprobante.totalAPagar = comprobante.totalFinal + comprobante.redondeo
  
      return comprobante;
    }
  
    //#region COMPROBANTE INTERNO
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
          { text: `Productos`, style: 'recargaDescuento', alignment: 'left' },
          {
            table: {
              widths: ['auto', '*', 'auto', 'auto', 'auto', 'auto', 'auto', 'auto', 'auto', 'auto', 'auto', 'auto', 'auto', 'auto', 'auto', 'auto'],
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

          { text: `Servicios`, style: 'recargaDescuento', alignment: 'left' },
          {
            table: {
              widths: ['auto', '*', 'auto', 'auto', 'auto'],
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
          
          { text: `Total Items: $${comprobante.totalItem?.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, style: 'recargaDescuento', alignment: 'right' },
          { text: `Descuento: $${comprobante.descuento?.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, style: 'descuento', alignment: 'right' },

          { text: `Total General: $${comprobante.totalFinal?.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, style: 'recargaDescuento', alignment: 'right' },
          { text: `Redondeo: $${comprobante.redondeo?.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, style: 'recargaDescuento', alignment: 'right' },
          { text: `Total A Pagar: $${comprobante.totalFinal?.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, style: 'total', alignment: 'right' }
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
          total: {
            fontSize: 12,
            bold: true,
            margin: [3, 12, 3, 5]
          },
         
          recargaDescuento: {
            fontSize: 11,
            bold: false,
            margin: [3, 1, 3, 1]
          },
          descuento: {
            fontSize: 11,
            bold: false,
            margin: [3, 1, 3, 12]
          },
          tableStyle: {
            fontSize: 11, // Cambiar el tamaño de letra de la tabla
            margin: [0, 0, 0, 12]
          }
        }
      };
    }
    //#endregion
    
    //#region COMPROBANTE FACTURA
    private ArmarFacturaA4(comprobante:ObjComprobante, datosFactura:ObjTicketFactura){
      return {
        pageSize: 'A4',
        pageOrientation: 'portrait',
        pageMargins: [10, 10, 10, 10],
        content: [

          //Datos de Factura y titular
          {
            table: {
              widths: ['45%', '10%', '45%'],
              body: [
                [
                  {
                    stack: [
                      { text: comprobante.nombreLocal?.toUpperCase(), style: 'titulo', alignment: 'center' },
                      {
                        text: [
                          { text: 'Condición Frente IVA: ', bold: true },
                          { text: datosFactura.condicion }
                        ],
                        style: 'simple'
                      },
                      {
                        text: [
                          { text: 'Razón Social: ', bold: true },
                          { text: datosFactura.razon }
                        ],
                        style: 'simple'
                      },
                      {
                        text: [
                          { text: 'Dirección: ', bold: true },
                          { text: datosFactura.direccion }
                        ],
                        style: 'simple'
                      }
                    ]
                  },
                  {
                    stack: [
                      { text: datosFactura.tipoFactura, style: 'tipoComprobante' },
                      { text: "Cod." + datosFactura.nroTipoFactura, fontSize: 7 }
                    ],
                    alignment: 'center'
                  },
                  {
                    stack: [
                      { text: 'FACTURA', style: 'titulo', alignment: 'center' },
                      {
                        text: [
                          { text: 'Punto y Nro Comp: ', bold: true },
                          { text: datosFactura.puntoVta + "-" + datosFactura.ticket }
                        ],
                        style: 'simple'
                      },
                      {
                        text: [
                          { text: 'Fecha Emisión: ', bold: true },
                          { text: comprobante.fechaVenta + ' - ' + comprobante.horaVenta }
                        ],
                        style: 'simple'
                      },
                      {
                        text: [
                          { text: 'CUIT: ', bold: true },
                          { text: datosFactura.CUIL }
                        ],
                        style: 'simple'
                      }
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

          //Datos Receptor
          (datosFactura.nroTipoFactura != 11) ? [ //Ocultamos para facturas C
            {
              table: {
                widths: ['*'],
                body: [
                  [
                    {
                      stack: [
                        {
                          text: [
                            { text: 'Condición de Venta: ', bold: true },
                            { text: 'Contado' }
                          ],
                          style: 'simple'
                        },                      {
                          text: [
                            { text: 'Condición del Receptor: ', bold: true },
                            { text: datosFactura.condCliente }
                          ],
                          style: 'simple'
                        },
                        {
                          text: [
                            { text: 'Documento y Tipo: ', bold: true },
                            { text: datosFactura.DNI + " / " + datosFactura.tipoDNI }
                          ],
                          style: 'simple'
                        }
                      ]
                    },
                  ]
                ]
              },
              layout: {
                hLineWidth: function () { return 0.5; },
                vLineWidth: function () { return 0.5; },
                hLineColor: function () { return '#aaa'; },
                vLineColor: function () { return '#aaa'; }
              },
              margin: [0, 10, 0, 10]
            },
          ]: [],
          

          //Tabla de productos
          { text: `Productos`, style: 'recargaDescuento', alignment: 'left' },
          {
            table: {
              widths: ['auto', '*', 'auto', 'auto', 'auto', 'auto', 'auto', 'auto', 'auto', 'auto', 'auto', 'auto', 'auto', 'auto', 'auto', 'auto'],
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

          { text: `Servicios`, style: 'recargaDescuento', alignment: 'left' },
          {
            table: {
              widths: ['auto', '*', 'auto', 'auto', 'auto'],
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
          
          //Detalle totales tabla productos
          { text: `Total Items: $${comprobante.totalItem?.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, style: 'recargaDescuento', alignment: 'right' },
          { text: `Descuento: $${comprobante.descuento?.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, style: 'descuento', alignment: 'right' },

          { text: `Total General: $${comprobante.totalFinal?.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, style: 'recargaDescuento', alignment: 'right' },
          { text: `Redondeo: $${comprobante.redondeo?.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, style: 'recargaDescuento', alignment: 'right' },
          { text: `Total A Pagar: $${comprobante.totalFinal?.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, style: 'total', alignment: 'right' },
          
          //Pie de página
          {
            columns: [
              //Columna QR
              {
                image: datosFactura.qr,
                width: 100,
                alignment: 'left',
                margin: [0, 0, 30, 0] 
              },

              // Columna central título ARCA y comprobante valido - CAE y CAEVTO
              {
                stack: [
                  { text: 'ARCA', style:"arca", alignment: 'left' },
                  { text: 'Comprobante Autorizado', fontSize: 10, italic:true, bold:true, margin: [8, 0, 0, 15], alignment: 'left' },
                  {
                    text: [
                      { text: 'CAE: ', bold: true },
                      { text: datosFactura.cae }
                    ],
                    style: 'simple'
                  },
                  {
                    text: [
                      { text: 'Vencimiento CAE: ', bold: true },
                      { text: datosFactura.caeVto }
                    ],
                    style: 'simple'
                  },
                ],
                width: 'auto' 
              },

              // Columna derecha descripcion del IVA
              (datosFactura.nroTipoFactura != 11) ? [ //Ocultamos para facturas C
                {
                  stack: [
                    { text: 'IVA 21% Incluido', fontSize: 10, margin: [0, 12, 0, 5] },
                    {
                      text: [
                        { text: 'Neto Total: ', bold: true },
                        { text: '$' + datosFactura.neto?.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }
                      ],
                      style: 'simple'
                    },
                    {
                      text: [
                        { text: 'IVA Total: ', bold: true },
                        { text: '$' + datosFactura.iva?.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }
                      ],
                      style: 'simple'
                    },
                    {
                      text: [
                        { text: 'Moneda: ', bold: true },
                        { text: 'PES' }
                      ],
                      style: 'simple'
                    }
                  ],
                  alignment: 'right',
                  width: '*'
                }
              ] : [],
              
            ],
            margin: [0, 15, 0, 0] 
          }

          
        ],
        styles: {
          simple: {
            fontSize: 11,
            margin: [8, 0, 0, 2]
          },
          tipoComprobante: {
            fontSize: 30,
            bold: true,
            decoration: 'underline',
            margin: [0, 10, 0, 3]
          },
          titulo: {
            fontFamily: "LEMONMILK",
            fontSize: 14,
            bold: true,
            margin: [0, 15, 0, 8]
          },
          arca: {
            fontFamily: "LEMONMILK",
            fontSize: 20,
            bold: true,
            margin: [8, 7, 0, 0]
          },
          fecha: {
            fontSize: 11, 
            margin: [0, 0, 0, 5]
          },
          total: {
            fontSize: 12,
            bold: true,
            margin: [3, 10, 3, 5]
          },
         
          recargaDescuento: {
            fontSize: 11,
            bold: false,
            margin: [3, 1, 3, 1]
          },
          descuento: {
            fontSize: 11,
            bold: false,
            margin: [3, 1, 3, 12]
          },
          tableStyle: {
            fontSize: 11, 
            margin: [0, 0, 0, 12]
          }
        }
      };
    }
    //#endregion
  
  
    //#endregion
}
