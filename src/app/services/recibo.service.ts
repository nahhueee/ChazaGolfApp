import { Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { OrdenIngresoService } from './orden-ingreso.service';
import { OrdenIngreso } from '../models/OrdenIngreso';

@Injectable({
  providedIn: 'root'
})
export class ReciboReporteService {
    private pdfMake: any;

    constructor() { }

    // Método para inicializar pdfMake
    async init() {
        const pdfMakeModule = await import('pdfmake/build/pdfmake');
        await import('pdfmake/build/vfs_fonts'); // side-effect

        this.pdfMake = pdfMakeModule.default || pdfMakeModule;
    }

    //#region PDF
    async VerReporte(data:any) {
        await this.init();

        const documentDefinition = await this.ArmarArchivo(data);
        this.pdfMake.createPdf(documentDefinition).open();
    }

    private async ArmarArchivo(data: any) {
        try {

            const formatMoney = (value: number) =>
                '$' + value.toLocaleString('es-AR', { minimumFractionDigits: 2 });

            const formatFecha = (fecha: string, hora: string) => {
                const d = new Date(fecha);

                const fechaFormateada = d.toLocaleDateString('es-AR', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric'
                });

                return `${fechaFormateada} ${hora}`;
            };

            const pagosBody = data.pagos.map(p => ([
                { text: p.metodo, alignment: 'left' },
                { text: formatMoney(p.monto), alignment: 'right' }
            ]));

            const ventasBody = data.ventas?.map(v => ([
                { text: `${v.proceso} # ${v.nroProceso}`, alignment: 'left' }
            ])) || [];

            const documentDefinition = {
                pageSize: {
                    width: 220, 
                    height: 'auto'
                },
                pageMargins: [10, 10, 10, 10],

                content: [

                    {
                        text: `RECIBO DE PAGO N°: ${data.id.toString().padStart(8, '0')}`,
                        bold: true,
                        fontSize: 10,
                        alignment: 'left'
                    },

                    {
                        text: `Fecha: ${formatFecha(data.fecha, data.hora)}`,
                        fontSize: 9
                    },

                    {
                        text: `Cliente: ${data.cliente}`,
                        margin: [0, 0, 0, 5],
                        fontSize: 9
                    },

                    {
                        canvas: [
                            { type: 'line', x1: 0, y1: 0, x2: 200, y2: 0, lineWidth: 1 }
                        ],
                        margin: [0, 5, 0, 5]
                    },

                    {
                        text: 'DETALLE DE PAGOS',
                        bold: true,
                        fontSize: 9,
                        margin: [0, 0, 0, 5]
                    },

                    {
                        table: {
                            widths: ['*', 'auto'],
                            body: pagosBody
                        },
                        layout: 'noBorders'
                    },

                    {
                        canvas: [
                            { type: 'line', x1: 0, y1: 0, x2: 200, y2: 0, lineWidth: 1 }
                        ],
                        margin: [0, 5, 0, 5]
                    },

                    {
                        columns: [
                            { text: 'TOTAL PAGADO:', bold: true },
                            { text: formatMoney(data.total), alignment: 'right', bold: true }
                        ],
                        fontSize: 10
                    },

                    {
                        canvas: [
                            { type: 'line', x1: 0, y1: 0, x2: 200, y2: 0, lineWidth: 1 }
                        ],
                        margin: [0, 5, 0, 5]
                    },

                    (ventasBody.length > 0) ? [
                        {
                            text: 'APLICADO A',
                            bold: true,
                            fontSize: 9,
                            margin: [0, 0, 0, 5]
                        },
                        {
                            table: {
                                widths: ['*'],
                                body: ventasBody
                            },
                            layout: 'noBorders'
                        }
                    ] : [],   
                ]
            };

            return documentDefinition;

        } catch (e) {
            console.error('Error generando reporte', e);
            return null;
        }
    }
    //#endregion
}