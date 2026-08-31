import { ProductosFactura, ServiciosFactura, Venta } from '../../models/Factura';
import { TipoComprobante } from '../../models/ObjFacturar';
import { esItemNoCatalogado } from '../../components/contenido/ventas/models/venta.constants';

// Extraído de listado-ventas.component.ts (ago-2026) para que TODA pantalla que imprima
// una venta con factura.service.ts calcule los precios de la misma forma.
//
// Motivo: factura.service.ts NO calcula precios - consume precioMostrar / total /
// descuentoAplicado / totalMostrar que le deja el componente que lo llama. Cuentas
// Corrientes (ventas-cliente.components.ts) tenía una copia vieja de esta lógica que
// reconstruía el descuento desde venta.descuento (el descuento de CABECERA), que con el
// rediseño de listas de precio quedó en 0 porque el descuento pasó a vivir por ítem en
// importeDescuento. Resultado: la misma venta de un cliente Lista 5 salía al doble desde
// Cuenta Corriente que desde Ventas. La copia vieja además seguía desglosando a neto
// (/1.21) para Factura A -conversión desactivada en ago-2026- y no procesaba servicios.
//
// Regla: si una pantalla nueva llama a facturaService.VerFactura(venta), llama antes a
// PrepararPreciosVenta(venta). No dupliques esta lógica.
export const PrepararPreciosVenta = (venta: Venta): void => {
  const esTipoA = [
    TipoComprobante.FACTURA_A,
    TipoComprobante.NC_A,
    TipoComprobante.ND_A
  ].includes(venta.idTipoComprobante!);

  venta.productos?.forEach(producto => {
    CalcularPrecioItem(producto, esTipoA, venta.descuento);

    if (esItemNoCatalogado(producto.tipoItem)) {
      // Ítem de presupuesto: no tiene talles, así que el tope de cantidad para
      // la NC se guarda en cantidadOriginal (igual que en servicios) en vez de
      // stockInicial, que quedaría vacío (sin claves t1..t10).
      producto.cantidadOriginal = producto.cantidad;
    } else {
      producto.stockInicial = Object.fromEntries(
        Object.entries(producto)
          .filter(([key]) => /^t\d+$/.test(key))
      );
    }
  });

  // Servicios: mismo cálculo que productos (neto, descuento, totalMostrar).
  // No tienen talles, por eso el tope de cantidad para la NC se guarda en
  // cantidadOriginal en vez de stockInicial.
  venta.servicios?.forEach(servicio => {
    CalcularPrecioItem(servicio, esTipoA, venta.descuento);
    servicio.cantidadOriginal = servicio.cantidad;
  });
};

// Calcula precioMostrar/total/descuentoAplicado/importeDescuento/totalMostrar
// para un ítem de la venta (producto o servicio), según el tipo de comprobante.
const CalcularPrecioItem = (
  item: ProductosFactura | ServiciosFactura,
  esTipoA: boolean,
  descuentoGeneral: number
) => {
  const unitario = Number(item.unitario) || 0; // Precio con IVA incluido (ago-2026: para cualquier lista/categoría)
  const cantidad = Number(item.cantidad) || 0;

  // DESACTIVADO (ago-2026, a pedido del usuario): desglosar a neto acá para Factura A
  // venía generando problemas recurrentes - el último, que reconstruía mal el % de
  // descuento más abajo (dividía el importe persistido -en base bruta, con IVA- contra
  // este total ya convertido a neto, dando un % distinto al real). El cliente ya no
  // factura mostrando el neto desglosado por ítem acá, así que ahora se muestra el
  // mismo precio bruto que en la venta (unitario, con IVA incluido) para Factura A/B -
  // igual que en addmod-ventas. La excepción de "mayorista con lista propia" (precio
  // persistido en neto) se eliminó por completo (ver venta.constants.ts, historial de
  // git de esMayoristaConListaPropia): ahora unitario SIEMPRE viene con IVA incluido,
  // sin excepciones. Código viejo comentado, no borrado, por si el cliente lo vuelve a
  // pedir. (esTipoA se conserva como parámetro por eso mismo.)
  // let precioNeto = 0;
  // if(esTipoA && !esMayorista)
  //   // Resto de Factura A: precio con IVA incluido → se desglosa a neto.
  //   precioNeto = unitario / 1.21;
  // else
  //   // Factura B, Factura A mayorista (unitario ya es neto), u otros comprobantes.
  //   precioNeto = unitario;
  const precioNeto = unitario;

  item.precioMostrar = precioNeto;
  let totalNeto = precioNeto * cantidad;
  item.total = totalNeto;

  // Importe del descuento: se usa el valor persistido en el momento de la venta
  // (respeta el topeDescuento que tenía el ítem en ese momento, dato que no se
  // guarda en ningún lado más). Si no está disponible (venta anterior al fix de
  // 07/2026), se cae al cálculo aproximado de antes, que asume topeDescuento=100
  // para todo ítem — puede quedar mal si el ítem tenía un tope distinto (deuda
  // técnica conocida, ver memoria del proyecto).
  let importeDescuento: number;
  if (item.importeDescuento != null) {
    // Con precioNeto/totalNeto desactivado arriba (ago-2026), item.importeDescuento
    // persistido y totalNeto quedan en la misma base (bruto, con IVA incluido, sin
    // excepciones) - no hace falta convertir nada acá. (Cuando la
    // conversión a neto SÍ corría para Factura A, esto necesitaba dividir también por
    // 1.21 para no mezclar numerador bruto con denominador neto - queda comentado
    // más abajo por si se reactiva la conversión de arriba.)
    // importeDescuento = (esTipoA && !esMayorista) ? item.importeDescuento / 1.21 : item.importeDescuento;
    importeDescuento = item.importeDescuento;
    // Redondeado a 2 decimales: es una división entre montos, sin esto arrastra
    // el error de punto flotante típico de JS (ej. 13.309999999999999%).
    item.descuentoAplicado = totalNeto > 0 ? Math.round((importeDescuento / totalNeto) * 10000) / 100 : 0;
  } else {
    const descuentoAplicado = Math.min(descuentoGeneral, item.topeDescuento ?? 100);
    item.descuentoAplicado = descuentoAplicado;
    importeDescuento = totalNeto * (descuentoAplicado / 100);
  }
  item.importeDescuento = importeDescuento;

  // Total bruto del item
  const totalFinalNeto = totalNeto - importeDescuento;
  item.totalMostrar = totalFinalNeto;
};
