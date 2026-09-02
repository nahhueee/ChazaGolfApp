import { Component, ViewChild } from '@angular/core';
import { map, of } from 'rxjs';
import { ProductosFactura, ServiciosFactura, Venta } from '../../../../models/Factura';
import { FiltroGral } from '../../../../models/filtros/FiltroGral';
import { VentasService } from '../../../../services/ventas.service';
import { TableLazyLoadEvent, TableModule } from 'primeng/table';
import { Button } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { DecimalFormatPipe } from '../../../../pipes/decimal-format.pipe';
import { DatePipe, TitleCasePipe } from '@angular/common';
import { TagModule } from 'primeng/tag';
import { FiltroVenta } from '../../../../models/filtros/FiltroVenta';
import { VistaPreviaComponent } from '../vista-previa/vista-previa.component';
import { FORMS_IMPORTS } from '../../../../imports/forms.import';
import { ProcesoVenta } from '../../../../models/ProcesoVenta';
import { MiscService } from '../../../../services/misc.service';
import { FormControl, FormGroup } from '@angular/forms';
import { DatePicker } from 'primeng/datepicker';
import { Cliente } from '../../../../models/Cliente';
import { ClientesService } from '../../../../services/clientes.service';
import { ComprobanteService } from '../../../../services/comprobante.service';
import { DocumentoComercialService } from '../../../../services/documento-comercial.service';
import { SplitButtonModule } from 'primeng/splitbutton';
import { Popover, PopoverModule } from 'primeng/popover';
import { FacturaService } from '../../../../services/factura.service';
import { ConfirmationService } from 'primeng/api';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { Dialog } from 'primeng/dialog';
import { TextareaModule } from 'primeng/textarea';
import { NotificacionesService } from '../../../../services/notificaciones.service';
import { NotasVentaComponent } from "../notas-venta/notas-venta.component";
import { NotaCreditoXComponent } from "../nota-credito-x/nota-credito-x.component";
import { NotaDebitoXComponent } from "../nota-debito-x/nota-debito-x.component";
import { TipoComprobante } from '../../../../models/ObjFacturar';
import { FilesService } from '../../../../services/files.service';
import { EncabezadoSeccionComponent } from '../../../compartidos/encabezado-seccion/encabezado-seccion.component';
import { esItemNoCatalogado, puedeDarseDeBaja, tieneNotaFiscal, tieneNotaInterna, TipoNotaCredito } from '../models/venta.constants';

@Component({
  selector: 'app-listado-ventas.component',
  standalone: true,
  imports: [
    ...FORMS_IMPORTS,
    ConfirmDialogModule,
    Dialog,
    TextareaModule,
    TableModule,
    Button,
    RouterLink,
    TooltipModule,
    DecimalFormatPipe,
    DatePipe,
    TitleCasePipe,
    TagModule,
    DatePicker,
    VistaPreviaComponent,
    SplitButtonModule,
    PopoverModule,
    NotasVentaComponent,
    NotaCreditoXComponent,
    NotaDebitoXComponent,
    EncabezadoSeccionComponent
],
  templateUrl: './listado-ventas.component.html',
  styleUrl: './listado-ventas.component.scss',
  providers: [ConfirmationService],
})
export class ListadoVentasComponent {
  ventas: Venta[] = [];
  totalRecords: number = 0;
  loading: boolean = false;
  filtroActual!: FiltroVenta;
  tipo: 'factura' | 'pre' = 'factura';
  tipoNota: 'Crédito' | 'Débito' = 'Crédito';
  // Elegido en el popover #tipoNC (ver ElegirTipoNotaCredito) - viaja como
  // Input a app-notas-venta para preseleccionar el selector Fiscal/Interna.
  tipoNotaCreditoElegida: TipoNotaCredito = 'FISCAL';
  primeraCarga = true;
  detalleVisible: boolean = false;
  notasVisible: boolean = false;
  notaCreditoXVisible: boolean = false;
  notaDebitoXVisible: boolean = false;
  ventaSeleccionada:Venta = new Venta();

  // Dar de baja (Presupuesto/Pedido/Nota de Empaque) - mismo patrón que
  // DarBajaRecibo en ventas-cliente.components.ts.
  bajaVisible: boolean = false;
  ventaBaja: number = 0;
  motivoBaja: string = '';

  // Libro IVA Ventas (ver HANDOFF-libro-iva-ventas-y-compras.md). Reusa el
  // mismo campo "fechas" del filtro del listado (igual que Exportar()) - no
  // hace falta un período aparte: el botón solo está visible en la pestaña
  // "factura" y el libro no depende de ningún otro filtro (cliente, proceso,
  // nroProceso), así que no hay ambigüedad real en reusarlo.
  empresaRI: any = null;
  
  filtros:FormGroup;
  clientes:Cliente[]=[];
  clientesFiltrados:Cliente[]=[];
  procesos:ProcesoVenta[] = [];
  @ViewChild('op') op!: Popover;
  @ViewChild('notas') notas!: Popover;
  @ViewChild('tipoNC') tipoNC!: Popover;


  constructor(
    private ventasService:VentasService,
    private router:Router,
    private rutaActiva: ActivatedRoute,
    private miscService: MiscService,
    private clientesService:ClientesService,
    private comprobanteService:ComprobanteService,
    private facturaService:FacturaService,
    private documentoComercialService:DocumentoComercialService,
    private confirmationService: ConfirmationService,
    private Notificaciones: NotificacionesService,
    private filesService:FilesService
  ){
    this.filtros = new FormGroup({
      proceso: new FormControl(),
      nroProceso: new FormControl(),
      fechas: new FormControl(),
      fechasEntrega: new FormControl(),
      cliente: new FormControl()
    })
  }

  ngOnInit() {
    this.rutaActiva.queryParams.subscribe(params => {
      this.tipo = params['tipo'] ?? 'factura';
      this.LimpiarFiltros();
      this.ObtenerProcesosVenta();
      this.ObtenerClientes();
    });
  }

  ObtenerProcesosVenta(){
    this.miscService.ObtenerProcesosVenta(this.tipo)
      .subscribe(response => {
        this.procesos = response;
      });
  }

  Buscar(event?: TableLazyLoadEvent, busqueda?: string, recargaConFiltro: boolean = false) {
    if (this.primeraCarga) {
      this.primeraCarga = false;
      return; // ignora la carga automática
   }
   
    this.loading = true;

    const pageIndex = (event?.first ?? 0) / (event?.rows ?? 10); 
    const pageSize = event?.rows ?? 10;

    if (!recargaConFiltro) {
      this.filtroActual = new FiltroVenta({
        pagina: pageIndex + 1,  
        tamanioPagina: pageSize,
        busqueda: busqueda,
        tipo: this.tipo,
        idProceso: this.filtros.value.proceso?.id ?? 0,
        nroProceso: this.filtros.value.nroProceso,
        fechas: this.filtros.value.fechas,
        fechasEntrega: this.filtros.value.fechasEntrega,
        cliente: this.filtros.value.cliente?.id ?? 0
      });
    }

    this.ventasService.ObtenerVentas(this.filtroActual).subscribe(response => {
      this.ventas = response.registros;
      this.totalRecords = response.total;
      this.loading = false;
    });
  }

  Exportar(){
    const fechas = this.filtros.get('fechas')?.value;
    if(!fechas || fechas.length !== 2 || !fechas[0] || !fechas[1]){
      this.Notificaciones.Warn("Debe seleccionar un rango de fechas completo (desde y hasta).");
      return;
    }

    this.filtroActual = new FiltroVenta({
      tipo: this.tipo,
      idProceso: this.filtros.value.proceso?.id ?? 0,
      nroProceso: this.filtros.value.nroProceso,
      fechas: this.filtros.value.fechas,
      cliente: this.filtros.value.cliente?.id ?? 0
    });

    this.filesService.DescargarVentasExcel(this.filtroActual).subscribe(blob => {
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');

      // Fecha en formato DD-MM-YY
      const fecha = new Date();
      const dd = String(fecha.getDate()).padStart(2, '0');
      const mm = String(fecha.getMonth() + 1).padStart(2, '0'); // Meses empiezan en 0
      const yy = String(fecha.getFullYear()).slice(-2); // últimos 2 dígitos del año

      const nombreArchivo = `Ventas_${dd}-${mm}-${yy}.xlsx`;

      a.href = url;
      a.download = nombreArchivo; 
      a.click();
      window.URL.revokeObjectURL(url);
    });
  }

  // Resuelve (y cachea) la única empresa Responsable Inscripto. Si el día de
  // mañana hay más de una, no elige "la primera" en silencio: avisa, porque
  // a partir de ahí hace falta un selector (ver handoff) y facturar contra
  // la empresa equivocada en un documento fiscal es peor que frenar acá.
  ResolverEmpresaRI(){
    if(this.empresaRI) return of(this.empresaRI);

    return this.miscService.ObtenerEmpresas().pipe(
      map(empresas => {
        const empresasRI = empresas.filter((e:any) => e.abrevCondicion === 'RI');

        if(empresasRI.length === 0){
          this.Notificaciones.Warn("No se encontró ninguna empresa Responsable Inscripto.");
          return null;
        }
        if(empresasRI.length > 1){
          this.Notificaciones.Warn("Hay más de una empresa Responsable Inscripto: falta agregar el selector para elegir cuál. Avisale a soporte.");
          return null;
        }

        this.empresaRI = empresasRI[0];
        return this.empresaRI;
      })
    );
  }

  DescargarLibroIva(){
    const fechas = this.filtros.get('fechas')?.value;
    if(!fechas || fechas.length !== 2 || !fechas[0] || !fechas[1]){
      this.Notificaciones.Warn("Debe seleccionar un rango de fechas completo (desde y hasta).");
      return;
    }

    this.ResolverEmpresaRI().subscribe(empresaRI => {
      if(!empresaRI) return; // Ya se avisó adentro de ResolverEmpresaRI().

      this.filesService.DescargarLibroIvaVentasExcel({
        idEmpresa: empresaRI.id,
        fechas
      }).subscribe(blob => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');

        // Nombre con las fechas del PERIODO (no la de hoy): el usuario va a
        // regenerar el mismo período varias veces y necesita distinguirlos.
        const formatear = (f:Date) => {
          const dd = String(f.getDate()).padStart(2, '0');
          const mm = String(f.getMonth() + 1).padStart(2, '0');
          const yy = String(f.getFullYear()).slice(-2);
          return `${dd}-${mm}-${yy}`;
        };

        a.href = url;
        a.download = `Libro_IVA_Ventas_${formatear(fechas[0])}_a_${formatear(fechas[1])}.xlsx`;
        a.click();
        window.URL.revokeObjectURL(url);
      });
    });
  }

  Editar(id:number){
    this.router.navigate(
      ['/ventas/administrar', id],
      { queryParams: { tipo: this.tipo} }
    );
  }

  // ElegirNota(venta:Venta){
  //   this.notas.toggle(event);
  //   this.ventaSeleccionada = venta;
  // }

  VerResumen(venta:Venta){
    this.ventaSeleccionada = venta;
    this.PrepararPrecios();
    this.detalleVisible = true;
  }

  // Abre el popover para elegir Fiscal/Interna (ver #tipoNC en el html). La
  // venta se fija acá para que los botones del popover (TieneNotaFiscal/
  // TieneNotaInterna) sepan sobre qué venta preguntar.
  ElegirTipoNotaCredito(event: Event, venta: Venta) {
    this.ventaSeleccionada = venta;
    this.tipoNC.toggle(event);
  }

  TieneNotaFiscal(venta: Venta): boolean {
    return tieneNotaFiscal(venta.notas);
  }

  TieneNotaInterna(venta: Venta): boolean {
    return tieneNotaInterna(venta.notas);
  }

  EmitirNotaCredito(tipo: TipoNotaCredito){
    this.tipoNota = 'Crédito';
    this.tipoNotaCreditoElegida = tipo;
    this.PrepararPrecios();
    this.notasVisible = true;
  }
  Actualizar(actualiza){
    this.notasVisible = false;
    if(actualiza)
      this.Buscar();
  }

  AbrirNotaCreditoX(){
    this.notaCreditoXVisible = true;
  }

  ActualizarNotaCreditoX(actualiza:boolean){
    this.notaCreditoXVisible = false;
    if(actualiza)
      this.Buscar();
  }

  AbrirNotaDebitoX(){
    this.notaDebitoXVisible = true;
  }

  ActualizarNotaDebitoX(actualiza:boolean){
    this.notaDebitoXVisible = false;
    if(actualiza)
      this.Buscar();
  }

  ElegirComprobante(venta:Venta){
    this.op.toggle(event);
    this.ventaSeleccionada = venta;
  }
  VerComprobante(){
    this.comprobanteService.VerComprobante(this.ventaSeleccionada)
  }
  VerFactura(){
    this.PrepararPrecios();
    this.facturaService.VerFactura(this.ventaSeleccionada)
  }
  // Documento comercial (Presupuesto/Pedido/Nota de Empaque) con formato tipo factura +
  // condiciones de venta - análogo a VerFactura() pero para tipo === 'pre'.
  VerDocumentoComercial(){
    this.documentoComercialService.VerDocumento(this.ventaSeleccionada)
  }

  Aprobar(venta:Venta){
    this.confirmationService.confirm({
        key: 'cerrarDialog',
        message: '¿Estas seguro de pasar a estado APROBADA la nota de empaque Nro ' + venta.nroProceso + "?",
        header: 'Confirmación',
        closable: true,
        closeOnEscape: true,
        icon: 'pi pi-exclamation-triangle',
        rejectButtonProps: {
            label: 'Cancelar',
            severity: 'secondary',
            outlined: true,
        },
        acceptButtonProps: {
            label: 'Aceptar',
        },
        accept: () => {
          this.ventasService.AprobarVenta(venta.id!)
          .subscribe(response => {
            if(response=='OK'){
              this.Notificaciones.Success("Nota de empaque aprobada correctamente.");
              this.Buscar();
            }
          });
        },
        reject: () => {},
      });
  }

  // Solo Presupuesto/Pedido/Nota de Empaque en su estado "abierto" (ver
  // ESTADOS_ABIERTOS_BAJA en venta.constants.ts). La validación real la hace
  // el backend igual - esto es solo para no mostrar el botón habilitado
  // cuando ya se sabe que va a rechazar.
  PuedeDarseDeBaja(venta: Venta): boolean {
    return puedeDarseDeBaja(venta.idProceso, venta.estado);
  }

  AbrirDarBaja(venta: Venta) {
    this.ventaBaja = venta.id!;
    this.motivoBaja = '';
    this.bajaVisible = true;
  }

  ConfirmarDarBaja() {
    if (!this.motivoBaja?.trim()) return;

    this.ventasService.DarBajaVenta(this.ventaBaja, this.motivoBaja.trim())
      .subscribe({
        next: () => {
          this.Notificaciones.Success(`Venta #${this.ventaBaja} dada de baja correctamente.`);
          this.bajaVisible = false;
          this.Buscar();
        },
        // Mismo patrón que ConfirmarDarBaja en ventas-cliente.components.ts: el
        // backend tira { status, message } con el motivo específico del bloqueo
        // (proceso no válido, estado no abierto, motivo faltante).
        error: (e) => this.Notificaciones.Error(e?.error ?? 'No se pudo dar de baja.')
      });
  }

  GetSeverity(estado: string): 'info' | 'warn' | 'success' {
    if (!estado) return 'info';

    const value = estado.toLowerCase();

    if (value === 'aprobada' || value === 'aprobado') {
      return 'info';
    }

    if (
      value === 'pendiente' ||
      value === 'asociado' ||
      value === 'asociada'
    ) {
      return 'warn';
    }

    if (value === 'facturado' || value === 'facturada' || value === 'finalizada') {
      return 'success';
    }

    return 'info';
  }

  ObtenerClientes(){
    this.clientesService.SelectorClientes()
      .subscribe(response => {
        this.clientes = response;
      });
  }
  
  FiltrarClientes(event: any) {
    const query = event.query.toLowerCase();
    this.clientesFiltrados = this.clientes.filter(c => {
      const nombre = (c.nombre ?? '').toLowerCase();
      const dni = (c.documento ?? '').toString();
      return nombre.includes(query) || dni.includes(query);
    });
  }

  LimpiarFiltros(){
    this.filtros.reset();
    this.Buscar();
  }

  PrepararPrecios(){
    const esTipoA = [
      TipoComprobante.FACTURA_A,
      TipoComprobante.NC_A,
      TipoComprobante.ND_A
    ].includes(this.ventaSeleccionada.idTipoComprobante!);

    this.ventaSeleccionada.productos.forEach(producto => {
      this.calcularPrecioItem(producto, esTipoA);

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
    this.ventaSeleccionada.servicios?.forEach(servicio => {
      this.calcularPrecioItem(servicio, esTipoA);
      servicio.cantidadOriginal = servicio.cantidad;
    });
  }

  // Calcula precioMostrar/total/descuentoAplicado/importeDescuento/totalMostrar
  // para un ítem de la venta (producto o servicio), según el tipo de comprobante.
  private calcularPrecioItem(item: ProductosFactura | ServiciosFactura, esTipoA: boolean) {
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
    // pedir.
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
      const descuentoAplicado = Math.min(this.ventaSeleccionada.descuento, item.topeDescuento ?? 100);
      item.descuentoAplicado = descuentoAplicado;
      importeDescuento = totalNeto * (descuentoAplicado / 100);
    }
    item.importeDescuento = importeDescuento;

    // Total bruto del item
    const totalFinalNeto = totalNeto - importeDescuento;
    item.totalMostrar = totalFinalNeto;
  }
}
