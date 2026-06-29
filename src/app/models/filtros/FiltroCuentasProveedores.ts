export class FiltroCuentasProveedores{
  pagina = 1;
  tamanioPagina = 15;
  total = 0;
  razonSocial: string = "";
  idProveedor: number = 0;
  idEmpresa: number = 0;
  incluirBaja = false;

  constructor(data?: any) {
    if (data) {
      this.pagina = data.pagina;
      this.tamanioPagina = data.tamanioPagina;
      this.total = data.total;
      this.razonSocial = data.razonSocial;
      this.idProveedor = data.idProveedor;
      this.idEmpresa = data.idEmpresa;
      this.incluirBaja = data.incluirBaja ?? false;
    }
  }
}
