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
      await this.init();

      const documentDefinition = await this.ArmarArchivo(productos);
      this.pdfMake.createPdf(documentDefinition).open();
    }
  
    private async ArmarArchivo(productos: ProductoImprimir[]) {
      try {
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
            pageOrientation: 'landscape',
            pageMargins: [0, 0, 0, 0],
            content: contenido
        };

        return docDefinition;
      } catch (e) {
        console.error('Error generando etiquetas', e);
      }
      return null;
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
            fontSize: 8,
            alignment: 'center',
            lineHeight: 0.85,
            margin: [2, 2, 2, 0]
          },
          {
            text: producto.color!.toUpperCase() + " | " + producto.talle!.toUpperCase(),
            bold: true,
            fontSize: 8,
            alignment: 'center',
            lineHeight: 0.9,
            margin: [2, 0, 2, 0]
          },

          // Código de barras
          codigoBarra
          ? {
              image: codigoBarra,
              width: 95,
              height: 28,        // altura fija, evita que pdfMake recalcule proporción
              alignment: 'center',
              margin: [0, 1, 0, 0]
            }
          : {},
          {
            text: producto.codigo!.toUpperCase(),
            bold: false,
            fontSize: 6,
            alignment: 'center',
            lineHeight: 0.9,
            margin: [1, 0, 2, 0]
          },
        ]
      };
    }

    private GenerarCodigoBarras(texto: string): string {
      const canvas = document.createElement('canvas');

      // Ancho del código en pdfMake = 95pt
      // Escala 4x sobre el ancho real para mantener nitidez sin oversizing
      // 95pt @ 96dpi = ~127px → × 4 = 508px
      const SCALE = 4;
      const TARGET_WIDTH_PT = 95;
      const PX_PER_PT = 96 / 72; // ~1.333
      
      const canvasWidth = Math.round(TARGET_WIDTH_PT * PX_PER_PT * SCALE); // ~508px
      const canvasHeight = Math.round(canvasWidth * 0.3); // proporción barcode estándar

      canvas.width = canvasWidth;
      canvas.height = canvasHeight;

      JsBarcode(canvas, texto, {
        format: 'CODE128',
        displayValue: false,
        width: 2,           // barras más gruesas → más tolerancia al escalar
        height: Math.round(canvasHeight * 0.75), // deja quiet zone vertical
        margin: Math.round(canvasWidth * 0.04),  // quiet zone proporcional (~4%)
        background: '#FFFFFF',
        lineColor: '#000000',
      });

      // PNG con máxima calidad
      return canvas.toDataURL('image/png', 1.0);
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