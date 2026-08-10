import { LineasTalle } from '../../models/Producto';

// Extraído de comprobante.service.ts (ago-2026) para reusar la misma lógica de
// armado de tabla de productos con desglose por talle en documento-comercial.service.ts
// (Presupuesto/Pedido/Nota de Empaque), sin duplicar ~150 líneas ni el riesgo de
// que un fix futuro de talles se aplique en un solo lugar. Funciones puras (sin DI):
// el caller resuelve lineasTalle (MiscService.ObtenerLineasTalle) y se lo pasa.

// Fallback usado cuando un producto no tiene idLineaTalle o no matchea ninguna línea
// del catálogo (dato legacy/faltante) - preserva el comportamiento que tenía la tabla
// antes de agrupar por línea de talle, en vez de romper o dejar la fila en blanco.
export const TALLES_LEGACY = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL', '4XL', '5XL', '6XL'];

export interface TotalesItems {
  subtotal: number;
  descuento: number;
  total: number;
}

export interface FilasProductosTalles {
  filasProducto: any[];
  filasProductoGrupos: number[];
  filasProductoContinuacion: number[];
}

export const FormatearCantidad = (cantidad: any): string => {
  const cantNumero = parseFloat(cantidad);
  return cantNumero % 1 === 0 ? cantNumero.toFixed(0) : cantNumero.toFixed(1);
};

export const FormatearPrecio = (precio: any): string => {
  const pNumero = parseFloat(precio);
  return pNumero.toLocaleString('es-AR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
};

// nombreProd puede venir undefined (nomProducto/nomServicio son opcionales en los
// modelos ProductosFactura/ServiciosFactura) - el código original (inline, sin tipar)
// no contemplaba este caso, quedó expuesto al tipar la función acá.
export const CortarNombreProducto = (nombreProd?: string): string => {
  if (!nombreProd) return '';
  return nombreProd.length > 25
    ? nombreProd.substring(0, 25) + '...'
    : nombreProd;
};

// Total de la fila en bruto (sin descuento): el descuento se muestra aparte
// en la columna "Desc" (informativa) y se aplica una sola vez, en el resumen.
export const FormatearPrecioTotalBruto = (unitario: any, cantidad: any): string => {
  const nCantidad = Number(cantidad) || 0;
  const nUnitario = parseFloat(unitario) || 0;

  const totalBruto = nUnitario * nCantidad;

  return totalBruto.toLocaleString('es-AR', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1
  });
};

// Talle en 0 (slot no usado por esta línea) no se muestra (celda vacía) en vez de
// '0' o '–', para no generar ruido visual donde no hay talle.
export const FormatearTalle = (valor: any): string => {
  const n = Number(valor) || 0;
  return n === 0 ? '' : n.toString();
};

// Talles reales (en el mismo orden posicional que t1..t10) de una línea de talle.
// Fallback a TALLES_LEGACY si el producto no tiene idLineaTalle o no matchea el catálogo
// (dato legacy/faltante) - mismo criterio que vista-previa.component.ts (ObtenerTallesDeLinea).
export const ObtenerTallesDeLinea = (lineasTalle: LineasTalle[], idLineaTalle?: number): string[] => {
  const talles = lineasTalle.find(l => l.id === idLineaTalle)?.talles;
  return talles?.length ? talles : TALLES_LEGACY;
};

// Calcula subtotal/descuento/total bruto de una lista de ítems (productos o servicios),
// respetando el tope de descuento por ítem. Efecto lateral: setea item.descuentoAplicado
// en cada ítem (lo consumen después las filas de la tabla) - mismo comportamiento que
// tenía procesarItems en comprobante.service.ts.
export const ProcesarItemsConDescuento = (items: any[] | undefined, descuentoGeneral: number): TotalesItems => {
  return items?.reduce((acc, item) => {
    const unitario = Number(item.unitario) || 0;
    const cantidad = Number(item.cantidad) || 0;

    const totalBruto = unitario * cantidad;

    const descuentoMax = item.topeDescuento ?? 100;
    const descuentoAplicado = Math.min(descuentoGeneral, descuentoMax);
    item.descuentoAplicado = descuentoAplicado;

    const importeDescuento = totalBruto * (descuentoAplicado / 100);
    const totalFinalItem = totalBruto - importeDescuento;

    acc.subtotal += totalBruto;
    acc.descuento += importeDescuento;
    acc.total += totalFinalItem;

    return acc;
  }, { subtotal: 0, descuento: 0, total: 0 } as TotalesItems) || { subtotal: 0, descuento: 0, total: 0 };
};

// Arma las filas pdfMake de la tabla de Productos agrupada por línea de talle (subheader
// por grupo con los talles reales de esa línea), incluyendo el header de columnas.
// Requiere que ProcesarItemsConDescuento ya haya corrido sobre estos ítems (usa
// item.descuentoAplicado). productosOrdenados debe venir ordenado por idLineaTalle
// (mismo criterio que factura.service.ts/comprobante.service.ts) para que los grupos
// queden contiguos.
export const ArmarFilasProductosConTalles = (
  productosOrdenados: any[],
  lineasTalle: LineasTalle[]
): FilasProductosTalles => {
  const filasProducto: any[] = [
    [
      { text: 'Código', style: 'tableHeader', alignment: 'left' },
      { text: 'Producto', style: 'tableHeader', alignment: 'left' },
      { text: 'Color', style: 'tableHeader', alignment: 'left' },
      { text: 'Talles', style: 'tableHeader', alignment: 'center', colSpan: 10 },
      {}, {}, {}, {}, {}, {}, {}, {}, {},
      { text: 'Cant', style: 'tableHeader', alignment: 'center' },
      { text: 'Precio', style: 'tableHeader', alignment: 'right' },
      { text: 'Desc', style: 'tableHeader', alignment: 'right' },
      { text: 'Total', style: 'tableHeader', alignment: 'right' },
    ]
  ];

  const gruposIdx: number[] = [];
  const continuacionIdx: number[] = [];
  let idLineaActual: number | undefined;
  let esPrimerGrupo = true;
  let itemAnterior: any = undefined;

  productosOrdenados.forEach(item => {
    if (esPrimerGrupo || item.idLineaTalle !== idLineaActual) {
      idLineaActual = item.idLineaTalle;
      esPrimerGrupo = false;
      itemAnterior = undefined; // un nuevo grupo de talle nunca es "continuación" del anterior

      const talles = ObtenerTallesDeLinea(lineasTalle, item.idLineaTalle);
      const tallesFila = Array.from({ length: 10 }, (_, i) => talles[i] ?? '');

      gruposIdx.push(filasProducto.length);
      filasProducto.push([
        '', '', '',
        ...tallesFila.map(t => ({ text: t, alignment: 'center', bold: true })),
        '', '', '', '',
      ]);
    }

    // Mismo producto+color que la fila anterior (partido en 2+ líneas por tener precio
    // distinto entre talles -ver AgregarProducto en addmod-ventas.component.ts-). No
    // repetimos Código/Nombre/Color: dejamos solo un indicador para que se lea como la
    // misma línea, no como un producto duplicado.
    const esContinuacion = !!itemAnterior
      && itemAnterior.idProducto === item.idProducto
      && itemAnterior.idColor === item.idColor;

    if (esContinuacion) {
      continuacionIdx.push(filasProducto.length);
    }

    filasProducto.push([
      // '->' en vez de '↳': ese carácter (bloque Unicode "Arrows") no está en la fuente
      // embebida de pdfMake y no renderiza (se ve vacío). '->' es ASCII, siempre renderiza,
      // y va en el color/peso normal del texto (sin bold ni color propio) para que se lea
      // como una continuación de la fila, no como un elemento destacado aparte.
      esContinuacion
        ? { text: '->', alignment: 'left' }
        : { text: item.codProducto, alignment: 'left' },
      esContinuacion ? '' : CortarNombreProducto(item.nomProducto),
      esContinuacion ? '' : { text: item.color, alignment: 'left' },
      { text: FormatearTalle(item.t1), alignment: 'center' },
      { text: FormatearTalle(item.t2), alignment: 'center' },
      { text: FormatearTalle(item.t3), alignment: 'center' },
      { text: FormatearTalle(item.t4), alignment: 'center' },
      { text: FormatearTalle(item.t5), alignment: 'center' },
      { text: FormatearTalle(item.t6), alignment: 'center' },
      { text: FormatearTalle(item.t7), alignment: 'center' },
      { text: FormatearTalle(item.t8), alignment: 'center' },
      { text: FormatearTalle(item.t9), alignment: 'center' },
      { text: FormatearTalle(item.t10), alignment: 'center' },
      { text: FormatearCantidad(item.cantidad), alignment: 'center' },
      { text: FormatearPrecio(item.unitario), alignment: 'right' },
      { text: item.descuentoAplicado + "%", alignment: 'right' },
      { text: FormatearPrecioTotalBruto(item.unitario, item.cantidad), alignment: 'right' },
    ]);

    itemAnterior = item;
  });

  return {
    filasProducto,
    filasProductoGrupos: gruposIdx,
    filasProductoContinuacion: continuacionIdx,
  };
};
