import { Injectable } from '@angular/core';
import {
    BloqueAnulado, BloqueContraparte, BloqueFirmas, EmpresaA4, EncabezadoEmpresa, FilaImporte,
    FormatoFecha, MarcaAgua, Seccion, TablaImportes
} from './helpers/reporte-a4.helper';

// Orden de Pago A4 de un pago a proveedor. Documento INTERNO (no fiscal): lo emite la empresa que paga; el recibo
// lo emite el proveedor. Se numera con el id de compras_pagos_proveedor (global entre empresas).
// Consume el mismo objeto que "Ver Detalle del Pago" (ComprasCuentasRepo.ObtenerPagoProveedor).
@Injectable({
  providedIn: 'root'
})
export class OrdenPagoReporteService {
    private pdfMake: any;

    constructor() { }

    async init() {
        const pdfMakeModule = await import('pdfmake/build/pdfmake');
        await import('pdfmake/build/vfs_fonts'); // side-effect

        this.pdfMake = pdfMakeModule.default || pdfMakeModule;
    }

    //#region PDF
    async VerReporte(data: any) {
        await this.init();

        const documentDefinition = this.ArmarArchivo(data);
        this.pdfMake.createPdf(documentDefinition).open();
    }

    // Orden de Pago de una compra pagada (total o parcialmente) al contado: efectivo, transferencia, cheque propio
    // o endoso. No hay un registro de pago aparte (el pago vive en compras_metodos_pago), así que no tiene número
    // propio: se identifica por el comprobante de la compra. Consume ComprasRepo.ObtenerUna.
    // Solo lo realmente pagado va en "Formas de pago"; la parte que quedó a cuenta corriente o se cubrió con saldo
    // a favor del proveedor se informa aparte, porque no es plata que salió.
    async VerReporteCompra(data: any) {
        await this.init();

        const documentDefinition = this.ArmarArchivoCompra(data);
        this.pdfMake.createPdf(documentDefinition).open();
    }

    private ArmarArchivoCompra(data: any) {
        const TIPOS_NO_CONTADO = ['CUENTA_CORRIENTE_PROVEEDOR', 'SALDO_FAVOR_PROVEEDOR'];
        const pagos: any[] = data.pagos ?? [];

        const contado = pagos.filter(p => !TIPOS_NO_CONTADO.includes(p.tipoMetodo));
        const montoCC = pagos.filter(p => p.tipoMetodo === 'CUENTA_CORRIENTE_PROVEEDOR').reduce((a, p) => a + Number(p.monto), 0);
        const montoSF = pagos.filter(p => p.tipoMetodo === 'SALDO_FAVOR_PROVEEDOR').reduce((a, p) => a + Number(p.monto), 0);
        const totalPagado = contado.reduce((a, p) => a + Number(p.monto), 0);

        const formasPago: FilaImporte[] = contado.map(p => ({
            texto: p.metodo ?? '',
            detalle: p.detalleCheque ?? null,
            importe: p.monto
        }));

        const comprobante = [data.tipoComprobante, data.nroComprobante].filter(x => !!x).join(' ');

        const detalleCompra: FilaImporte[] = [{ texto: `${comprobante} - total de la compra`, importe: data.total }];
        if (montoCC > 0) detalleCompra.push({ texto: 'Quedó a cuenta corriente del proveedor', importe: montoCC });
        if (montoSF > 0) detalleCompra.push({ texto: 'Cubierto con saldo a favor del proveedor', importe: montoSF });

        const fechaEmision = [FormatoFecha(data.fecha), data.usuario ? `Usuario: ${data.usuario}` : '']
            .filter(x => !!x).join('  ·  ');

        const contenido: any[] = [
            EncabezadoEmpresa(data.empresa ?? null, 'ORDEN DE PAGO', comprobante, fechaEmision, 'Compra'),
            BloqueContraparte('Proveedor', data.proveedor, data.proveedorDocumento, data.condicionIvaProveedor, data.proveedorDomicilio),
            Seccion('Formas de pago'),
            TablaImportes(formasPago, totalPagado, 'TOTAL PAGADO'),
            Seccion('Detalle de la compra'),
            TablaImportes(detalleCompra, null),
        ];

        if (data.baja) {
            contenido.push(BloqueAnulado(FormatoFecha(data.baja), data.usuarioBaja, data.observacionBaja, 'ANULADA'));
        }

        contenido.push(BloqueFirmas(['Autorizó', 'Recibí conforme (firma, aclaración, DNI, fecha)']));

        return {
            pageSize: 'A4',
            pageMargins: [40, 40, 40, 40],
            defaultStyle: { fontSize: 10 },
            watermark: data.baja ? MarcaAgua('ANULADA') : undefined,
            content: contenido
        };
    }

    private ArmarArchivo(data: any) {
        const empresa: EmpresaA4 | null = data.empresaRazonSocial ? {
            razonSocial: data.empresaRazonSocial,
            cuit: data.empresaCuit != null ? String(data.empresaCuit) : null,
            condicion: data.empresaCondicion,
            direccion: data.empresaDireccion,
            iibb: data.empresaIibb,
            inicioAct: data.empresaInicioAct,
        } : null;

        const fechaEmision = [FormatoFecha(data.fecha, data.hora), data.usuario ? `Usuario: ${data.usuario}` : '']
            .filter(x => !!x).join('  ·  ');

        const formasPago: FilaImporte[] = (data.metodos ?? []).map((m: any) => ({
            texto: m.metodoPago ?? '',
            detalle: this.DetalleMetodo(m),
            importe: m.monto
        }));

        const aplicacion: FilaImporte[] = (data.detalle ?? []).map((d: any) => {
            let texto: string;
            if (d.tipoAplicacion === 'SALDO_INICIAL') texto = 'Cancelación saldo inicial';
            else if (d.tipoAplicacion === 'SALDO_A_FAVOR') texto = 'Excedente a favor del proveedor';
            else texto = [d.tipoComprobante, d.nroComprobante].filter(x => !!x).join(' ') || 'Aplicación';
            return { texto, importe: d.montoAplicado };
        });

        const contenido: any[] = [
            EncabezadoEmpresa(empresa, 'ORDEN DE PAGO', String(data.id).padStart(8, '0'), fechaEmision),
            BloqueContraparte('Proveedor', data.proveedor, data.proveedorDocumento, data.proveedorCondicionIva, data.proveedorDomicilio),
            Seccion('Formas de pago'),
            TablaImportes(formasPago, data.total, 'TOTAL PAGADO'),
        ];

        if (aplicacion.length > 0) {
            contenido.push(Seccion('Aplicación del pago'), TablaImportes(aplicacion, null));
        }

        if (data.observaciones) {
            contenido.push(Seccion('Observaciones'), { text: data.observaciones, fontSize: 9 });
        }

        if (data.baja) {
            contenido.push(BloqueAnulado(FormatoFecha(data.baja), data.usuarioBaja, data.observacionBaja, 'ANULADA'));
        }

        contenido.push(BloqueFirmas(['Autorizó', 'Recibí conforme (firma, aclaración, DNI, fecha)']));

        return {
            pageSize: 'A4',
            pageMargins: [40, 40, 40, 40],
            defaultStyle: { fontSize: 10 },
            watermark: data.baja ? MarcaAgua('ANULADA') : undefined,
            content: contenido
        };
    }

    private DetalleMetodo(m: any): string | null {
        if (m.chequeNumero) {
            const tipo = m.chequeTipo === 'ECHEQ' ? 'eCheq' : 'Cheque físico';
            const partes = [tipo, m.chequeBanco, `N° ${m.chequeNumero}`];
            if (m.chequeFechaPago) partes.push(`Fecha de pago: ${FormatoFecha(m.chequeFechaPago)}`);
            return partes.filter(x => !!x).join(' · ');
        }
        if (m.endosoNumero) {
            const partes = ['Cheque de terceros', m.endosoBanco, `N° ${m.endosoNumero}`];
            if (m.endosoLibrador) partes.push(`Librador: ${m.endosoLibrador}`);
            if (m.endosoFechaCobro) partes.push(`Fecha de cobro: ${FormatoFecha(m.endosoFechaCobro)}`);
            return partes.filter(x => !!x).join(' · ');
        }
        return null;
    }
    //#endregion
}
