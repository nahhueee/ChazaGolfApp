export class FiltroComprasProveedor{
  pagina = 1;
  tamanioPagina = 15;
  total = 0;
  idProveedor: number = 0;

  constructor(data?: any) {
    if (data) {
      this.pagina = data.pagina;
      this.tamanioPagina = data.tamanioPagina;
      this.total = data.total;
      this.idProveedor = data.idProveedor;
    }
  }
}
