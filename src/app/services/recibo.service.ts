import { Injectable } from '@angular/core';
import {
    BloqueAnulado, BloqueContraparte, BloqueFirmas, EmpresaA4, EncabezadoEmpresa, FilaImporte,
    FormatoFecha, MarcaAgua, Seccion, TablaImportes
} from './helpers/reporte-a4.helper';

// Recibo de cobro a clientes. Hasta 7-nov-2026 era un ticket (220pt de ancho, alto automático) y al imprimirlo
// en A4 el diálogo de impresión lo escalaba hasta llenar la hoja ("sale gigante"). Ahora es A4 real, con el
// mismo esquema visual que la Orden de Pago (helpers/reporte-a4.helper.ts).
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

            // empresa viene null en recibos viejos sin entrega ni venta con empresa: el encabezado se omite.
            const empresa: EmpresaA4 | null = data.empresa ?? null;

            const pagos: FilaImporte[] = (data.pagos ?? []).map(p => ({
                texto: p.metodo,
                importe: p.monto
            }));

            const detalles: FilaImporte[] = (data.detalles ?? []).map(d => {
                let descripcion = '';

                switch (d.tipoAplicacion) {
                    case 'VENTA':
                        descripcion = `${d.proceso} #${d.nroProceso}`;
                        break;

                    case 'SALDO_INICIAL':
                        descripcion = 'Cancelación saldo inicial';
                        break;

                    case 'SALDO_A_FAVOR':
                        descripcion = 'Saldo a favor generado';
                        break;

                    default:
                        descripcion = 'Aplicación';
                }

                return { texto: descripcion, importe: d.montoAplicado };
            });

            // Recibos sin detalle de aplicación: se lista a qué ventas corresponden (sin importe).
            const ventas: FilaImporte[] = (data.ventas ?? []).map(v => ({
                texto: `${v.proceso} #${v.nroProceso}`
            }));

            const contenido: any[] = [
                EncabezadoEmpresa(empresa, 'RECIBO', data.id.toString().padStart(8, '0'), FormatoFecha(data.fecha, data.hora)),
                BloqueContraparte('Cliente', data.cliente, data.clienteDocumento, data.clienteCondicionIva),
                Seccion('Detalle de pagos'),
                TablaImportes(pagos, data.total, 'TOTAL PAGADO'),
            ];

            if (detalles.length > 0) {
                contenido.push(Seccion('Aplicación del importe'), TablaImportes(detalles, null));
            } else if (ventas.length > 0) {
                contenido.push(Seccion('Aplicado a'), TablaImportes(ventas, null));
            }

            // El motivo de la baja queda guardado en observaciones (ver ObtenerRecibo / DarBajaRecibo).
            if (data.fechaBaja) {
                contenido.push(BloqueAnulado(FormatoFecha(data.fechaBaja), null, data.observaciones, 'ANULADO'));
            }

            contenido.push(BloqueFirmas(['Recibí (firma y aclaración)']));

            return {
                pageSize: 'A4',
                pageMargins: [40, 40, 40, 40],
                defaultStyle: { fontSize: 10 },
                watermark: data.fechaBaja ? MarcaAgua('ANULADO') : undefined,
                content: contenido
            };

        } catch (e) {
            console.error('Error generando reporte', e);
            return null;
        }
    }
    //#endregion
}
