export class DatosServidor{
  apiUrl? : string = "";
  modo?: string = "";

  constructor(data?: any) {
    if (data) {
      this.apiUrl = data.apiUrl;
      this.modo = data.modo;
    }
  }
}

