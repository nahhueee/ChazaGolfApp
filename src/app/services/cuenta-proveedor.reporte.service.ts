import { Injectable } from '@angular/core';
import { FormatoFecha, FormatoMoneda } from './helpers/reporte-a4.helper';

// Extracto impreso de la cuenta corriente de un proveedor (espejo de CuentaCorrienteReporteService de clientes).
// A4 apaisado: son 8 columnas y en vertical no entran legibles. Convención del proveedor: compras al HABER,
// pagos (Órdenes de Pago) al DEBE; saldo positivo = se le debe al proveedor.
@Injectable({
  providedIn: 'root'
})
export class CuentaProveedorReporteService {
    private pdfMake: any;

    constructor() { }

    async init() {
        const pdfMakeModule = await import('pdfmake/build/pdfmake');
        await import('pdfmake/build/vfs_fonts'); // side-effect

        this.pdfMake = pdfMakeModule.default || pdfMakeModule;
    }

    //#region PDF
    async VerReporte(data: {
        proveedor: string;
        saldo: number;
        fechaDesde?: string | null;
        fechaHasta?: string | null;
        proceso?: string | null;
        movimientos: any[];
    }) {
        await this.init();

        const documentDefinition = this.ArmarArchivo(data);
        this.pdfMake.createPdf(documentDefinition).open();
    }

    private ArmarArchivo(data: {
        proveedor: string;
        saldo: number;
        fechaDesde?: string | null;
        fechaHasta?: string | null;
        proceso?: string | null;
        movimientos: any[];
    }) {
        const encabezados = ['Proceso', 'Fecha', 'Comprobante', 'Referencia', 'Debe', 'Haber', 'Saldo', 'Estado']
            .map((t, i) => ({ text: t, bold: true, fontSize: 9, alignment: (i >= 4 && i <= 6) ? 'right' : 'left' }));

        const filas = data.movimientos.map(m => ([
            { text: m.proceso, fontSize: 8 },
            { text: FormatoFecha(m.fecha), fontSize: 8 },
            { text: m.comprobante, fontSize: 8 },
            { text: m.referencia || '', fontSize: 8 },
            { text: FormatoMoneda(m.debe), fontSize: 8, alignment: 'right' },
            { text: FormatoMoneda(m.haber), fontSize: 8, alignment: 'right' },
            { text: FormatoMoneda(m.saldo), fontSize: 8, alignment: 'right' },
            { text: m.estado || '', fontSize: 8 },
        ]));

        const filtros: string[] = [];
        if (data.fechaDesde && data.fechaHasta) filtros.push(`Período: ${data.fechaDesde} al ${data.fechaHasta}`);
        else if (data.fechaDesde) filtros.push(`Desde: ${data.fechaDesde}`);
        if (data.proceso) filtros.push(`Proceso: ${data.proceso}`);

        const contenido: any[] = [
            { text: 'CUENTA CORRIENTE DE PROVEEDOR', bold: true, fontSize: 15 },
            { text: data.proveedor, bold: true, fontSize: 12, margin: [0, 4, 0, 0] },
            {
                columns: [
                    { text: `Emitido: ${FormatoFecha(new Date())}`, fontSize: 9, color: '#555555' },
                    { text: `Saldo actual: ${FormatoMoneda(data.saldo)}`, fontSize: 11, bold: true, alignment: 'right' },
                ],
                margin: [0, 4, 0, 0]
            },
        ];
        if (filtros.length) contenido.push({ text: filtros.join('   ·   '), fontSize: 9, color: '#555555', margin: [0, 2, 0, 0] });

        contenido.push({
            margin: [0, 10, 0, 0],
            table: {
                headerRows: 1,
                widths: [55, 70, '*', 110, 62, 62, 66, 52],
                body: [encabezados, ...filas]
            },
            layout: 'lightHorizontalLines'
        });

        if (!filas.length) contenido.push({ text: 'Sin movimientos para los filtros seleccionados.', fontSize: 9, margin: [0, 8, 0, 0] });

        return {
            pageSize: 'A4',
            pageOrientation: 'landscape',
            pageMargins: [40, 40, 40, 40],
            defaultStyle: { fontSize: 10 },
            footer: (current: number, total: number) => ({ text: `Página ${current} de ${total}`, alignment: 'right', fontSize: 8, margin: [0, 0, 40, 0] }),
            content: contenido
        };
    }
    //#endregion
}
