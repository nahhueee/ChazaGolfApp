import { Injectable } from '@angular/core';
import JsBarcode from 'jsbarcode';
import { ProductoImprimir } from '../models/ProductoImprimir';

@Injectable({
  providedIn: 'root'
})
export class EtiquetasService {
  private pdfMake: any;

  constructor() { }

  // Método para inicializar pdfMake
  async init() {
    const pdfMakeModule = await import('pdfmake/build/pdfmake');
    await import('pdfmake/build/vfs_fonts'); // side-effect

    this.pdfMake = pdfMakeModule.default || pdfMakeModule;
  }

  //#region PDF
    async GenerarEtiquetas(productos:ProductoImprimir[]) {
      if (!this.pdfMake) {
        await this.init();
      }
      const documentDefinition = await this.ArmarArchivo(productos);
      this.pdfMake.createPdf(documentDefinition).open();
    }
  
    private async ArmarArchivo(productos: ProductoImprimir[]) {
        const contenido: any[] = [];

        for (let i = 0; i < productos.length; i++) {
            const producto = productos[i];

            const codigoBarrasBase64 = await this.GenerarCodigoBarras(producto.codigo!);
            const cuadrito = this.GenerarCuadrito(producto, codigoBarrasBase64);

            contenido.push({
            ...cuadrito,
            pageBreak: i < productos.length - 1 ? 'after' : undefined
            });
        }

        const docDefinition = {
            pageSize: {
            width: 108,
            height: 57
            },
            pageMargins: [0, 0, 0, 0],
            content: contenido
        };

        return docDefinition;
    }

    //Se encarga de posicionar a los cuadritos en fila
    //El parametro "porFila" define cuantos pueden existir en una fila
    private AgruparEnFilas(array: any[], porFila){
      const filas: any[] = [];

      for (let i = 0; i < array.length; i += porFila) {
        filas.push({
          columns: array.slice(i, i + porFila)
        });
      }

      return filas;
    }


    private GenerarCuadrito(producto: ProductoImprimir, codigoBarra: string) {
      return {
        stack: [
          // 🏷️ Nombre (protagonista)
          {
            text: producto.nombre!.toUpperCase(),
            bold: true,
            fontSize: 9,
            alignment: 'center',
            lineHeight: 0.9,
            margin: [2, 2, 2, 1]
          },
          {
            text: producto.color!.toUpperCase() + " | " + producto.talle!.toUpperCase(),
            bold: true,
            fontSize: 9,
            alignment: 'center',
            lineHeight: 0.9,
            margin: [2, 0, 2, 1]
          },

          // Código de barras
          codigoBarra
            ? {
                image: codigoBarra,
                height: 20,
                width: 100, 
                alignment: 'center',
                margin: [0, 1, 0, 0]
              }
            : 
            {},
          {
            text: producto.codigo!.toUpperCase(),
            bold: false,
            fontSize: 8,
            alignment: 'center',
            lineHeight: 0.9,
            margin: [2, 0, 2, 0]
          },
        ]
      };
    }

    private GenerarCodigoBarras(texto: string) {
      const canvas = document.createElement('canvas');
      JsBarcode(canvas, texto, {
        format: 'CODE39',
        displayValue: false,
        height: 50,     
        width: 2,
      });
      return canvas.toDataURL('image/png');
    }

    async GenerarImagen(url: string) {
      const res = await fetch(url);
      const blob = await res.blob();
      return new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(blob);
      });
    }

  
}