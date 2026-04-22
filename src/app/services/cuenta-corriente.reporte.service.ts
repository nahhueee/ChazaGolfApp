import { Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { OrdenIngresoService } from './orden-ingreso.service';
import { OrdenIngreso } from '../models/OrdenIngreso';

@Injectable({
  providedIn: 'root'
})
export class CuentaCorrienteReporteService {
    private pdfMake: any;

    constructor() { }

    // Método para inicializar pdfMake
    async init() {
        const pdfMakeModule = await import('pdfmake/build/pdfmake');
        await import('pdfmake/build/vfs_fonts'); // side-effect

        this.pdfMake = pdfMakeModule.default || pdfMakeModule;
    }

    //#region PDF
    async VerReporte(data: {
        codCliente: string;
        cliente: string;
        saldo: number;
        fechaDesde?: string | null;
        fechaHasta?: string | null;
        proceso?: string | null;
        movimientos: any[];
    }) {
        await this.init();

        const documentDefinition = await this.ArmarArchivo(data);
        this.pdfMake.createPdf(documentDefinition).open();
    }

    private async ArmarArchivo(data: {
        codCliente: string;
        cliente: string;
        saldo: number;
        fechaDesde?: string | null;
        fechaHasta?: string | null;
        proceso?: string | null;
        movimientos: any[];
    }) {
        try {
            const formatMoney = (value: number) => {
                return value.toLocaleString('es-AR', {
                    style: 'currency',
                    currency: 'ARS',
                    minimumFractionDigits: 2
                });
            };

            const formatDate = (date: string) => date?.split(' ')[0] || '';

            const rows = data.movimientos.map(m => ([
                m.proceso,
                m.nroProceso,
                formatDate(m.fecha),
                m.comprobante,
                formatMoney(m.debe),
                formatMoney(m.haber),
                formatMoney(m.saldo),
                m.estado || ''
            ]));

            const filtros: any[] = [];

            if (data.fechaDesde && data.fechaHasta) {
                filtros.push({
                    text: `Período: ${data.fechaDesde} al ${data.fechaHasta}`,
                    style: 'filtro'
                });
            } else if (data.fechaDesde) {
                filtros.push({
                    text: `Desde: ${data.fechaDesde}`,
                    style: 'filtro'
                });
            } else if (data.fechaHasta) {
                filtros.push({
                    text: `Hasta: ${data.fechaHasta}`,
                    style: 'filtro'
                });
            }

            if (data.proceso) {
                filtros.push({
                    text: `Proceso: ${data.proceso}`,
                    style: 'filtro'
                });
            }

            //Totales
            const saldoMovimientos = data.movimientos.reduce((acc, m) => {
                const debe = Number(m.debe) || 0;
                const haber = Number(m.haber) || 0;
                return acc + (debe - haber);
            }, 0);
            const saldoAnterior = (data.saldo || 0) - saldoMovimientos;

            const documentDefinition: any = {
                pageSize: 'A4',
                pageMargins: [20, 40, 20, 40],
                pageOrientation: 'landscape', 

                content: [
                    {
                        columns: [
                            {
                                text: `Informe de cuenta corriente`,
                                style: 'header'
                            },
                            {
                                text: `Cliente: ${data.codCliente} - ${data.cliente}`,
                                style: 'subheader',
                                alignment: 'right'
                            }
                        ],
                        margin: [0, 0, 0, 10],
                    },
                    ...(filtros.length ? [{
                        margin: [0, 0, 0, 10],
                        stack: filtros
                    }] : []),
                    {
                        table: {
                            headerRows: 1,
                            widths: ['auto','auto','auto','*','auto','auto','auto','auto'],
                            body: [
                                [
                                    'Proceso',
                                    'Nro',
                                    'Fecha',
                                    'Comprobante',
                                    'Debe',
                                    'Haber',
                                    'Saldo',
                                    'Estado'
                                ],
                                ...rows
                            ]
                        },
                        layout: 'lightHorizontalLines'
                    },
                    {
                        margin: [0, 15, 0, 0],
                        columns: [
                            { width: '*', text: '' }, 

                            {
                                width: 'auto',
                                table: {
                                    widths: ['auto', 'auto'],
                                    body: [
                                        [
                                            { text: 'Saldo anterior:', bold: true },
                                            { text: formatMoney(saldoAnterior), alignment: 'right' }
                                        ],
                                        [
                                            { text: 'Mov. período:', bold: true },
                                            { text: formatMoney(saldoMovimientos), alignment: 'right' }
                                        ],
                                        [
                                            { text: 'Saldo final:', bold: true },
                                            { text: formatMoney(data.saldo), alignment: 'right', bold: true }
                                        ]
                                    ]
                                },
                                layout: {
                                    hLineWidth: function (i: number, node: any) {
                                        // línea SOLO antes del saldo final
                                        if (i === node.table.body.length - 1) {
                                            return 1;
                                        }
                                        return 0;
                                    },
                                    vLineWidth: function () {
                                        return 0;
                                    }
                                }
                            }
                        ]
                    }
                ],

                styles: {
                    header: {
                        fontSize: 16,
                        bold: true,
                    },
                    subheader: {
                        fontSize: 11,
                        bold: true
                    },
                    saldo: {
                        fontSize: 11,
                        bold: true,
                        color: data.saldo < 0 ? 'green' : 'red'
                    },
                    saldoFinal: {
                        fontSize: 12,
                        bold: true
                    },
                    filtro: {
                        fontSize: 9,
                        italics: true
                    }
                }
            };

            return documentDefinition;

        } catch (e) {
            console.error('Error generando reporte', e);
            return null;
        }
    }
    //#endregion
}