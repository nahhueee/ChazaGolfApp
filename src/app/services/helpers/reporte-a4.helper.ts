// Helper compartido MÍNIMO para los comprobantes A4 (Orden de Pago de proveedores y Recibo de clientes).
// Son funciones puras que devuelven nodos de pdfmake: no hay estado, no hay servicio, no es un framework de
// reportes. Si un bloque lo usa un solo documento, vive en el servicio de ese documento, no acá.

export interface EmpresaA4 {
    razonSocial?: string | null;
    cuit?: string | null;
    condicion?: string | null;
    direccion?: string | null;
    iibb?: string | null;
    inicioAct?: string | null;
}

export interface FilaImporte {
    texto: string;
    detalle?: string | null;      // segunda línea, más chica (ej: banco/N° de cheque)
    importe?: number | null;      // null = fila sin importe (ej: lista "Aplicado a")
}

const GRIS = '#555555';
const LINEA = '#999999';
const ROJO = '#b3261e';
const ANCHO_UTIL_A4 = 515; // A4 (595pt) con márgenes de 40

//#region FORMATO
export function FormatoMoneda(value: any): string {
    const n = Number(value ?? 0);
    return '$' + n.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Acepta 'YYYY-MM-DD' y 'YYYY-MM-DD HH:mm[:ss]' (strings sin zona: se formatean tal cual, sin pasar por Date para
// no correr el día por el huso horario) y cualquier otra cosa que entienda Date (ISO con Z, objetos Date).
export function FormatoFecha(fecha: any, hora?: string | null): string {
    if (!fecha) return '';

    let texto: string;
    let horaPropia = '';

    const m = typeof fecha === 'string'
        ? /^(\d{4})-(\d{2})-(\d{2})(?: (\d{2}:\d{2})(?::\d{2})?)?$/.exec(fecha)
        : null;

    if (m) {
        texto = `${m[3]}/${m[2]}/${m[1]}`;
        horaPropia = m[4] ?? '';
    } else {
        const d = new Date(fecha);
        if (isNaN(d.getTime())) return String(fecha);
        texto = d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    }

    const h = hora || horaPropia;
    return h ? `${texto} ${h}` : texto;
}

export function FormatoCuit(cuit: any): string {
    const s = String(cuit ?? '').replace(/\D/g, '');
    return s.length === 11 ? `${s.substring(0, 2)}-${s.substring(2, 10)}-${s.substring(10)}` : String(cuit ?? '');
}
//#endregion

//#region BLOQUES
// Empresa a la izquierda; título, número y fecha a la derecha. Si empresa es null (recibo viejo sin empresa
// resoluble) se omite ese bloque: nunca se inventa una empresa por default.
export function EncabezadoEmpresa(empresa: EmpresaA4 | null | undefined, titulo: string, numero: string, fecha: string, rotuloNumero: string = 'N°'): any {
    const izquierda: any[] = [];

    if (empresa) {
        if (empresa.razonSocial) izquierda.push({ text: empresa.razonSocial, bold: true, fontSize: 13, margin: [0, 0, 0, 2] });

        const lineas = [
            empresa.cuit ? `CUIT: ${FormatoCuit(empresa.cuit)}` : null,
            empresa.condicion ? `Condición IVA: ${empresa.condicion}` : null,
            empresa.direccion ? `Domicilio: ${empresa.direccion}` : null,
            empresa.iibb ? `Ing. Brutos: ${empresa.iibb}` : null,
            empresa.inicioAct ? `Inicio de actividades: ${empresa.inicioAct}` : null,
        ].filter(l => !!l) as string[];

        lineas.forEach(l => izquierda.push({ text: l, fontSize: 9, color: GRIS }));
    }

    return {
        stack: [
            {
                columns: [
                    { width: '*', stack: izquierda },
                    {
                        width: 'auto',
                        stack: [
                            { text: titulo, bold: true, fontSize: 16, alignment: 'right' },
                            { text: `${rotuloNumero} ${numero}`, bold: true, fontSize: 14, alignment: 'right' },
                            { text: fecha, fontSize: 9, color: GRIS, alignment: 'right', margin: [0, 3, 0, 0] },
                        ]
                    }
                ]
            },
            { canvas: [{ type: 'line', x1: 0, y1: 0, x2: ANCHO_UTIL_A4, y2: 0, lineWidth: 1 }], margin: [0, 8, 0, 0] }
        ]
    };
}

export function Seccion(texto: string): any {
    return { text: texto.toUpperCase(), bold: true, fontSize: 10, margin: [0, 14, 0, 4] };
}

export function BloqueContraparte(rotulo: string, nombre: string, documento?: string | null, condicionIva?: string | null, domicilio?: string | null): any {
    const datos: any[] = [];
    if (documento) datos.push(`Documento: ${documento}`);
    if (condicionIva) datos.push(`Condición IVA: ${condicionIva}`);

    const stack: any[] = [
        { text: rotulo.toUpperCase(), fontSize: 8, color: GRIS },
        { text: nombre ?? '', bold: true, fontSize: 11 },
    ];
    if (datos.length) stack.push({ text: datos.join('   ·   '), fontSize: 9, margin: [0, 2, 0, 0] });
    if (domicilio) stack.push({ text: `Domicilio: ${domicilio}`, fontSize: 9, margin: [0, 2, 0, 0] });

    return {
        margin: [0, 12, 0, 0],
        table: { widths: ['*'], body: [[{ stack, margin: [4, 4, 4, 4] }]] },
        layout: { hLineColor: () => LINEA, vLineColor: () => LINEA, hLineWidth: () => 0.5, vLineWidth: () => 0.5 }
    };
}

// Tabla Concepto / Importe. Si total es null no se agrega la fila de total.
export function TablaImportes(filas: FilaImporte[], total?: number | null, rotuloTotal: string = 'TOTAL'): any {
    const body: any[] = [[
        { text: 'Concepto', bold: true, fontSize: 9 },
        { text: 'Importe', bold: true, fontSize: 9, alignment: 'right' }
    ]];

    filas.forEach(f => {
        const celdaTexto: any = f.detalle
            ? { stack: [{ text: f.texto, fontSize: 10 }, { text: f.detalle, fontSize: 8, color: GRIS }] }
            : { text: f.texto, fontSize: 10 };
        body.push([celdaTexto, { text: f.importe != null ? FormatoMoneda(f.importe) : '', alignment: 'right', fontSize: 10 }]);
    });

    if (total != null) {
        body.push([
            { text: rotuloTotal, bold: true, fontSize: 11 },
            { text: FormatoMoneda(total), bold: true, fontSize: 11, alignment: 'right' }
        ]);
    }

    return { table: { headerRows: 1, widths: ['*', 'auto'], body }, layout: 'lightHorizontalLines' };
}

export function BloqueFirmas(firmas: string[]): any {
    const columnas: any[] = firmas.map(f => ({
        width: 240,
        stack: [
            { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 230, y2: 0, lineWidth: 0.7 }] },
            { text: f, alignment: 'center', fontSize: 9, margin: [0, 3, 10, 0] }
        ]
    }));
    // Con una sola firma se corre a la derecha (un hueco a la izquierda), como en un recibo.
    if (columnas.length === 1) columnas.unshift({ width: '*', text: '' });

    return { margin: [0, 60, 0, 0], columnGap: 35, columns: columnas, unbreakable: true };
}

// Para usar en la propiedad `watermark` de la definición del documento (ANULADA / ANULADO).
export function MarcaAgua(texto: string): any {
    return { text: texto, color: ROJO, opacity: 0.15, bold: true, italics: false };
}

// Recuadro de anulación: fecha, usuario y motivo. `fecha` ya viene formateada.
export function BloqueAnulado(fecha: string, usuario: string | null | undefined, motivo: string | null | undefined, rotulo: string = 'ANULADA'): any {
    const encabezado = [`${rotulo}`, fecha ? `el ${fecha}` : '', usuario ? `por ${usuario}` : ''].filter(x => !!x).join(' ');

    return {
        margin: [0, 14, 0, 0],
        table: {
            widths: ['*'],
            body: [[{
                stack: [
                    { text: encabezado, bold: true, color: ROJO, fontSize: 10 },
                    { text: `Motivo: ${motivo || 'sin motivo registrado'}`, fontSize: 9, margin: [0, 2, 0, 0] }
                ],
                margin: [4, 4, 4, 4]
            }]]
        },
        layout: { hLineColor: () => ROJO, vLineColor: () => ROJO, hLineWidth: () => 0.8, vLineWidth: () => 0.8 }
    };
}
//#endregion
