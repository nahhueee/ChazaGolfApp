import { Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { OrdenIngresoService } from './orden-ingreso.service';
import { OrdenIngreso } from '../models/OrdenIngreso';

@Injectable({
  providedIn: 'root'
})
export class OrdenIngresoReporteService {
  private pdfMake: any;

  constructor(
    private ordenesService:OrdenIngresoService
  ) { }

  // Método para inicializar pdfMake
  async init() {
    const pdfMakeModule = await import('pdfmake/build/pdfmake');
    await import('pdfmake/build/vfs_fonts'); // side-effect

    this.pdfMake = pdfMakeModule.default || pdfMakeModule;
  }

  //#region PDF
    async VerReporte(orden: OrdenIngreso) {
      await this.init();

      const documentDefinition = await this.ArmarArchivo(orden);
      this.pdfMake.createPdf(documentDefinition).open();
    }

  
    private async ArmarArchivo(orden:OrdenIngreso) {
        try {
            const data = await firstValueFrom(this.ordenesService.ObtenerDatosReporte(orden.id!));
            const grupos = this.agruparPorProducto(data);
            const content: any[] = [];

            //Datos de cabecera
            content.push({
                columns: [
                    [
                    { text: `Orden N°: ${orden.id}`, bold: true },
                    { text: `Corte: ${orden.corte}` },
                    { text: `Estado: ${orden.estado}` }
                    ],
                    [
                    { text: `Fecha alta: ${this.formatFecha(orden.alta)}` },
                    { text: `Usuario: ${orden.usuario}` }
                    ]
                ],
                margin: [0, 0, 0, 10]
            });

            //Observaciones
            if (orden.observaciones) {
                content.push({
                    text: `Observaciones: ${orden.observaciones}`,
                    italics: true,
                    margin: [0, 0, 0, 10]
                });
            }

            grupos.forEach((grupo:any) => {

                    // Título del producto
                    content.push({
                    text: `${grupo.codigo} ${grupo.nombre} - ${grupo.color}`,
                    style: 'header',
                    margin: [0, 10, 0, 5]
                    });

                    // Tabla del producto
                    content.push({
                    table: {
                        headerRows: 1,
                        widths: [
                        110, // tipo
                        70, // fecha
                        60, // usuario
                        30, // t1
                        30, // t2
                        30, // t3
                        30, // t4
                        30, // t5
                        30, // t6
                        30, // t7
                        30, // t8
                        30, // t9
                        30, // t10
                        40  // total
                        ],
                        body: [
                        // Header
                        [
                            'Tipo', 'Fecha', 'Usuario',
                            'XS','S','M','L','XL','XXL','3XL','4XL','5XL','6XL',
                            'Total'
                        ],

                        // Filas
                       ...grupo.filas.map(f => [
                            f.tipo,
                            f.fecha || '',
                            f.usuario || '',
                            this.mostrar(f.t1),
                            this.mostrar(f.t2),
                            this.mostrar(f.t3),
                            this.mostrar(f.t4),
                            this.mostrar(f.t5),
                            this.mostrar(f.t6),
                            this.mostrar(f.t7),
                            this.mostrar(f.t8),
                            this.mostrar(f.t9),
                            this.mostrar(f.t10),
                            f.total || 0
                        ])]
                    },
                    layout: 'lightHorizontalLines'
                    });

                });

                return {
                    pageSize: 'A4',
                    pageOrientation: 'landscape', 
                    pageMargins: [20, 20, 20, 20],

                    content,

                    styles: {
                    header: {
                        fontSize: 12,
                        bold: true
                    }
                    }
                };

        } catch (e) {
            console.error('Error generando reporte', e);
        }
        return null;
    }
    //#endregion

    agruparPorProducto(data) {
        const grupos = {};

        data.forEach(item => {
            if (!grupos[item.idProducto]) {
            grupos[item.idProducto] = {
                codigo: item.codigo,
                nombre: item.nombreProducto,
                color: item.color,
                filas: []
            };
            }

            grupos[item.idProducto].filas.push(item);
        });

        return Object.values(grupos);
    }

    formatFecha(fecha?: Date) {
    if (!fecha) return '';

    const d = new Date(fecha);
    const pad = (n: number) => n.toString().padStart(2, '0');

    return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ` +
            `${pad(d.getHours())}:${pad(d.getMinutes())}`;
    }

   mostrar(valor: any) {
        if (valor === null || valor === undefined) return '';
        if (Number(valor) === 0) return '';  
        return String(valor);
    }
}
