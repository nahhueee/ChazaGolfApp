export class FiltroComprasProveedor{
  pagina = 1;
  tamanioPagina = 15;
  total = 0;
  idProveedor: number = 0;
  proceso: string | null = null; // 'COMPRA' | 'PAGO' | null (todos)
  fechas: Date[] | null = null; // rango [desde, hasta]

  constructor(data?: any) {
    if (data) {
      this.pagina = data.pagina;
      this.tamanioPagina = data.tamanioPagina;
      this.total = data.total;
      this.idProveedor = data.idProveedor;
      this.proceso = data.proceso ?? null;
      this.fechas = data.fechas ?? null;
    }
  }
}
