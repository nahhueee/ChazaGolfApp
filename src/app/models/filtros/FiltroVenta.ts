export class FiltroVenta{
  pagina = 1;
  tamanioPagina = 15;
  total = 0;
  busqueda = "";
  orden = "";
  direccion = "";
  tipo = "";
  idProceso = 0;
  nroProceso = 0;
  // Estado exacto de la venta (ej. 'Pendiente'). Vacío = todos. Lo valida el backend contra
  // los estados conocidos (ver FiltroEstadoSql).
  estado = "";
  fechas = "";
  // Filtro por rango de fecha de entrega prometida. Solo aplica a
  // Presupuesto/Pedido/Nota de Empaque (tipo === 'pre').
  fechasEntrega = "";
  cliente = 0;
  impagas = 0;
  desdeCuenta = false;

  constructor(data?: any) {
    if (data) {
      this.pagina = data.pagina;
      this.tamanioPagina = data.tamanioPagina;
      this.total = data.total;
      this.busqueda = data.busqueda;
      this.orden = data.orden;
      this.direccion = data.direccion;
      this.tipo = data.tipo;
      this.idProceso = data.idProceso;
      this.nroProceso = data.nroProceso;
      this.estado = data.estado ?? "";
      this.fechas = data.fechas;
      this.fechasEntrega = data.fechasEntrega;
      this.cliente = data.cliente;
      this.impagas = data.impagas;
      this.desdeCuenta = data.desdeCuenta
    }
  }
}

