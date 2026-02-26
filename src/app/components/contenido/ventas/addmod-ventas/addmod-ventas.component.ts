
import { Component, ElementRef, HostListener, ViewChild } from '@angular/core';
import { FORMS_IMPORTS } from '../../../../imports/forms.import';
import { NavegacionComponent } from '../../../compartidos/navegacion/navegacion.component';
import { AccordionModule } from 'primeng/accordion';
import { Table, TableModule } from 'primeng/table';
import { DatePickerModule } from 'primeng/datepicker';
import { AbstractControl, FormArray, FormControl, FormGroup, Validators } from '@angular/forms';
import { Cliente } from '../../../../models/Cliente';
import { ClientesService } from '../../../../services/clientes.service';
import { ColorDisponible, LineasTalle, Producto, ProductoBusqueda } from '../../../../models/Producto';
import { ProductosService } from '../../../../services/productos.service';
import { MiscService } from '../../../../services/misc.service';
import { BadgeModule } from 'primeng/badge';
import { OverlayBadgeModule } from 'primeng/overlaybadge';
import { PagosFactura, ProductosFactura, ServiciosFactura, Venta } from '../../../../models/Factura';
import { ConfirmPopupModule } from 'primeng/confirmpopup';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService, MenuItem } from 'primeng/api';
import { NotificacionesService } from '../../../../services/notificaciones.service';
import { Servicio } from '../../../../models/Servicio';
import { GlobalesService } from '../../../../services/globales.service';
import { SplitButtonModule } from 'primeng/splitbutton';
import { Dialog } from 'primeng/dialog';
import { DividerModule } from 'primeng/divider';
import { AddModClientesComponent } from '../../clientes/addmod-clientes/addmod-clientes.component';
import { VentasService } from '../../../../services/ventas.service';
import { ActivatedRoute, Router } from '@angular/router';
import { TipoComprobante } from '../../../../models/TipoComprobante';
import { MetodoPago } from '../../../../models/MetodoPago';
import { ProcesoVenta } from '../../../../models/ProcesoVenta';
import { ObjFacturar } from '../../../../models/ObjFacturar';
import { FacturarVentaComponent } from '../facturar-venta/facturar-venta.component';
import { FacturaVenta } from '../../../../models/FacturaVenta';
import { TagModule } from 'primeng/tag';
import { ServiciosService } from '../../../../services/servicios.service';
import { PuntoVenta } from '../../../../models/PuntoVenta';
import { TipoDescuento } from '../../../../models/TipoDescuento';
import { TooltipModule } from 'primeng/tooltip';
import { ProductoPresupuesto } from '../../../../models/ProductoPresupuesto';
import { VistaPreviaComponent } from '../vista-previa/vista-previa.component';
import { Empresa } from '../../../../models/Empresa';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-addmod-ventas',
  standalone: true,
  imports: [
    ...FORMS_IMPORTS,
    AccordionModule,
    DatePickerModule,
    TableModule,
    BadgeModule,
    OverlayBadgeModule,
    ConfirmPopupModule,
    SplitButtonModule,
    Dialog,
    TagModule,
    DividerModule,
    AddModClientesComponent,
    FacturarVentaComponent,
    TooltipModule,
    ConfirmDialogModule,
    VistaPreviaComponent
  ],
  providers: [ConfirmationService],
  templateUrl: './addmod-ventas.component.html',
  styleUrl: './addmod-ventas.component.scss',
})
export class AddModVentasComponent {
  tipo: 'factura' | 'pre' = 'factura';
  icono: string = "pi pi-plus-circle";
  titulo: string = "";
  proximoNroVenta:number = 0;
  nroRelacionado:number = 0;
  tipoRelacionado:string = "";

  decimal_mask: any;
  modificando:boolean;
  idAnterior:number;

  venta:Venta = new Venta();
  totalItems:number = 0;
  totalDescuento:number = 0;
  totalIva:number = 0;
  subtotal:number = 0;
  totalGeneral:number = 0;
  totalAPagar:number = 0;
  cantItems:number = 0;

  itemsMenu: MenuItem[];
  vistaPreviaVisible:boolean = false;
  modalClienteVisible:boolean = false;
  modalAddClienteVisible:boolean = false;
  modalFacturarVisible:boolean = false;

  DEFAULT_COMPROBANTE_POR_CONDICION: Record<number, number> = {
    1: 1, // Responsable Inscripto → Factura A
    5: 6, // Consumidor Final → Factura B
    6: 1,  // Responsable Monotributo → Factura A
    13: 1, // Monotributo Social → Factura A
    15: 6, // Iva no Alcanzado → Factura B
    99: 6  // No selecciono cliente 
  };


  //PANTALLA 1
  formGenerales:FormGroup;
  procesos:ProcesoVenta[] = [];
  puntos:PuntoVenta[] = [];

  clienteSeleccionado:Cliente | undefined;
  clientes:Cliente[]=[];
  clientesFiltrados:Cliente[]=[];
  ventasCliente:Venta[]=[];

  //PANTALLA 2
  formProductos:FormGroup;
  productosFiltrados:ProductoBusqueda[]=[];
  resultadoBusqueda:Producto[]=[];
  variantesDisponibles:Producto[]=[];
  coloresDisponibles: ColorDisponible[] = [];

  productoSeleccionado:Producto = new Producto();
  tallesBase:string[] = ["X","X","X","X","X","X","X","X","X","X"]
  tallesProducto:string[] = [];

  productosFactura:ProductosFactura[]=[];
  lineasTalles: LineasTalle[] = [];

  productosPreFiltrados:ProductoPresupuesto[]=[];

  //PANTALLA 3
  formServicios:FormGroup;
  servicios:Servicio[]=[];
  serviciosFiltrado:Servicio[]=[];
  serviciosFactura:ServiciosFactura[]=[];

  //PANTALLA 4
  formFacturacion:FormGroup;
  formPagos:FormGroup;
  pagosFactura:PagosFactura[]=[];
  redondeo:FormControl = new FormControl('');
  empresas:Empresa[]=[];
  tiposDescuento:TipoDescuento[]=[];
  comprobantes:TipoComprobante[]=[];
  metodosPago:MetodoPago[]=[];
  mostrarIva:boolean = false;

  objFacturar:ObjFacturar = new ObjFacturar();

  @ViewChild('inputCodigo') inputCodigo: ElementRef<HTMLInputElement>; //Para usar el input de codigo
  @ViewChild('tablaProductos') tablaProductos: Table | undefined;

  constructor(
    private router:Router,
    private clientesService:ClientesService,
    private productosService:ProductosService,
    private miscService:MiscService,
    private confirmationService: ConfirmationService,
    private Notificaciones: NotificacionesService,
    private globalesService:GlobalesService,
    private ventasService:VentasService,
    private rutaActiva:ActivatedRoute,
    private serviciosService:ServiciosService
  ){
    this.ArmarFormularios();
  }

  ArmarFormularios(){
    this.formGenerales = new FormGroup({
      proceso: new FormControl('', [Validators.required]),
      punto: new FormControl('', [Validators.required]),
      nroNota: new FormControl({ value: '', disabled: true }),
      fecha: new FormControl(new Date(), [Validators.required]),
      cliente: new FormControl([null], [Validators.required]),
      lista: new FormControl(''),
    });

    this.formProductos = new FormGroup({
      codigoBarras: new FormControl(''),
      producto: new FormControl([null]),
      descuento: new FormControl(''),
      colorSeleccionado: new FormControl([null]),

      //Solo para presupuestos
      precio: new FormControl(''),
      cantidad: new FormControl(''),
    });

    this.formServicios = new FormGroup({
      servicio: new FormControl([null]),
      cantidad: new FormControl(''),
      precio: new FormControl(''),
    });

    this.formFacturacion = new FormGroup({
      empresa: new FormControl('', [Validators.required]),
      tComprobante: new FormControl('', [Validators.required]),
      tDescuento: new FormControl(1),
      descuento: new FormControl('', [Validators.min(0), Validators.max(100)]),
      codPromo: new FormControl(''),
    });

    this.formPagos = new FormGroup({
      metodo: new FormControl('', [Validators.required]),
      monto: new FormControl('', [Validators.min(0)])
    });
  }

  get TipoDescuentoControl(){return this.formFacturacion.get('tDescuento')?.value;}
  get DescuentoControl(){return this.formFacturacion.get('descuento')?.value;}
  get ServicioControl(){return this.formServicios.get('servicio')?.value ?? '';}
  get ProcesoControl(){return this.formGenerales.get('proceso')?.value;}
  get PuntoControl(){return this.formGenerales.get('punto')?.value;}
  get ProductoControl(){return this.formProductos.get('producto')?.value ?? '';}
  get TipoComprobanteControl(){return this.formFacturacion.get('tComprobante')?.value ?? '';}
  get esPresupuesto(): boolean {
    return this.ProcesoControl?.descripcion === 'PRESUPUESTO';
  }

  ngOnInit(): void {
    this.rutaActiva.queryParams.subscribe(params => {
      this.tipo = params['tipo'] ?? 'factura';

      this.ReiniciarTodo();
      setTimeout(() => {
        this.ObtenerProcesosVenta();
      },10);
    });
  
  }

  ngAfterViewInit(){
    this.ObtenerEmpresas();
    this.ObtenerPuntosVenta();
    this.ObtenerClientes();
    this.ObtenerLineasTalle();
    this.ObtenerServicios();
    this.ObtenerMetodosPago();
    this.ObtenerTiposDescuento();

    setTimeout(() => {
      //Configuracion para la mascara decimal Imask
      this.decimal_mask = {
        mask: Number,
        scale: 2,
        thousandsSeparator: '.',
        radix: ',',
        normalizeZeros: true,
        padFractionalZeros: true,
        lazy: false,
        signed: true
      }

      this.rutaActiva.paramMap.subscribe(params => {
        const id = Number(params.get('id'));

        if (id && id !== 0) {
          this.modificando = true;
          this.ObtenerVenta(id);
        } else {
          this.ReiniciarTodo();
        }
      });
    },10);

    //Calcula el total general cuando se aplica un redondeo
    this.redondeo.valueChanges.subscribe((value) => {
      this.CalcularTotalGeneral();
    });
  }

  ReiniciarTodo() {
    if(this.tipo == "factura"){
      this.titulo = "Nueva Facturación";
    }else{
      this.titulo = "Nueva PreFacturación"
    }

    this.modificando = false;
    this.venta = new Venta();
    this.venta.id = 0;

    this.redondeo.setValue('');

    this.productosFactura = [];
    this.serviciosFactura = [];
    this.pagosFactura = [];
    this.clienteSeleccionado = undefined;

    this.ArmarFormularios();
    this.CalcularTotalGeneral();
  }

  SetearTitulo(){
    this.formFacturacion.get('empresa')?.setValue(this.empresas[0].id);
    this.PrepararFacturacionCliente(this.clienteSeleccionado?.idCondicionIva ?? 99)

    if(this.ProcesoControl.descripcion == 'COTIZACION'){
      this.formFacturacion.get('tComprobante')?.setValue(99);
    }else{
      this.formFacturacion.get('tComprobante')?.setValue(6);
    }

    this.ventasService.ObtenerProximoNroProceso(this.ProcesoControl.id)
    .subscribe(response => {
      this.proximoNroVenta = response;

      if(this.venta.id == 0){
        let antelacion = this.ProcesoControl.descripcion == "PRESUPUESTO" || this.ProcesoControl.descripcion == "PEDIDO" ? "Nuevo " : "Nueva ";
        this.titulo = antelacion + this.ProcesoControl.descripcion + " Nro: " + this.proximoNroVenta;
      }
    });
  }

  BuscarNotaEmpaque(){
    const nroNota = this.formGenerales.get('nroNota')?.value;
    if(nroNota == "" || nroNota == 0) return;

    this.ventasService.VerificarNroNota(nroNota)
      .subscribe(response => {
        if(response == null){
          this.Notificaciones.Warn("No se encontraron notas de empaque con este número.")
        }else{
          this.confirmationService.confirm({
            key: 'cerrarDialog',
            message: 'Se encontró una nota de empaque.<br> ¿Estas seguro de pasar a facturar el proceso nro ' + nroNota + "?",
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
              this.venta = response;
              this.nroRelacionado = response.nroProceso!;
              this.tipoRelacionado = "NOTA DE EMPAQUE";

              if(this.venta.productos) this.productosFactura = this.venta.productos;
              if(this.venta.servicios) this.serviciosFactura = this.venta.servicios;
              this.formFacturacion.get('descuento')?.setValue(0);
              this.formFacturacion.get('tDescuento')?.setValue(this.tiposDescuento.find(t => t.id == 1));
              //this.formGenerales.get('punto')?.setValue();
              this.CalcularTotalGeneral();

              this.Notificaciones.Success("Nota de empaque cargada correctamente.")
            },
            reject: () => {},
          });
        }
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

    if (value === 'facturado' || value === 'facturada') {
      return 'success';
    }

    return 'info';
  }

  ObtenerVenta(idVenta){
    this.ventasService.ObtenerVenta(idVenta)
      .subscribe(response => {
        this.venta = response;
        this.CompletarCampos();
      });
  }

  CompletarCampos(){
    this.formGenerales.get('proceso')?.setValue(this.procesos.find(p => p.id == this.venta.idProceso));
    this.formGenerales.get('punto')?.setValue(this.puntos.find(p => p.id == this.venta.idPunto));
    this.formGenerales.get('fecha')?.setValue(new Date(this.venta.fecha ?? ''));
    this.formFacturacion.get('empresa')?.setValue(this.empresas.find(e => e.id == this.venta.idEmpresa));
    this.formFacturacion.get('tDescuento')?.setValue(this.venta.idTipoDescuento);
    this.formFacturacion.get('descuento')?.setValue(this.venta.descuento);
    this.formFacturacion.get('codPromo')?.setValue(this.venta.codPromocion);
    this.redondeo.setValue(this.venta.redondeo?.toLocaleString('es-AR'));

    this.nroRelacionado = this.venta.nroRelacionado!;
    this.tipoRelacionado = this.venta.tipoRelacionado!;

    if(this.tipoRelacionado == "NOTA DE EMPAQUE")
      this.formGenerales.get('nroNota')?.setValue(this.nroRelacionado);

    this.formGenerales.get('cliente')?.setValue(this.venta.cliente);

    if(this.venta.productos) this.productosFactura = this.venta.productos;
    if(this.venta.servicios) this.serviciosFactura = this.venta.servicios;
    if(this.venta.pagos) this.pagosFactura = this.venta.pagos;

    this.SeleccionarCliente(this.venta.idTipoComprobante);

    this.titulo = "Editar " + this.ProcesoControl.descripcion + " Nro: " + this.venta.nroProceso;
    this.CalcularTotalGeneral();
  }

  CalcularTotalGeneral() {
    const descuentoUsuario = parseFloat(this.DescuentoControl) || 0;
    let totalItems = 0;
    let totalDescuento = 0;

    const procesarItems = (items: any[]) => {
      return items?.reduce((acc, item) => {

        const totalItem = item.total || 0;

        // Si no tiene tope, se asume 100%
        const descuentoMax = item.topeDescuento ?? 100;

        // Se respeta el menor
        const descuentoAplicado = Math.min(descuentoUsuario, descuentoMax);
        item.descuentoAplicado = descuentoAplicado;

        const descuentoItem = (totalItem * descuentoAplicado) / 100;

        acc.total += totalItem;
        acc.descuento += descuentoItem;

        return acc;

      }, { total: 0, descuento: 0 }) || { total: 0, descuento: 0 };
    };

    const productos = procesarItems(this.productosFactura);
    const servicios = procesarItems(this.serviciosFactura);

    this.totalItems = productos.total + servicios.total;
    this.totalDescuento = productos.descuento + servicios.descuento;

    // Base inicial
    const subtotalBase = this.totalItems - this.totalDescuento;
    this.subtotal = this.totalItems - this.totalDescuento;
    this.totalIva = 0;
    this.totalGeneral = subtotalBase;
    this.mostrarIva = false;

    const esFactura =
      this.ProcesoControl.descripcion !== 'COTIZACION' &&
      this.tipo === 'factura' &&
      this.productosFactura.length > 0;

    if (esFactura) {

      const forzarLogicaB =
      this.clienteSeleccionado?.idCategoria === 1 &&
      this.clienteSeleccionado?.idCondicionIva === 1;

      const usarLogicaB =
      this.TipoComprobanteControl === 6 || forzarLogicaB;

      if (!usarLogicaB) {
        // FACTURA A
        this.subtotal = subtotalBase;
        this.totalIva = subtotalBase * 0.21;
        this.totalGeneral = subtotalBase + this.totalIva;
        this.mostrarIva = true;

      } else {
        // FACTURA B (o forzada)
        const totalConIva = subtotalBase;

        this.totalIva = totalConIva * 21 / 121;
        this.subtotal = totalConIva - this.totalIva;
        this.totalGeneral = totalConIva;
        this.mostrarIva = true;
      }

      // FACTURA C (11) → no IVA
    }
    
    this.totalAPagar =
      this.totalGeneral +
      this.globalesService.EstandarizarDecimal(this.redondeo.value);

    // cantidades
    const cantProductos =
      this.productosFactura?.reduce((acc, i) => acc + (i.cantidad || 0), 0) || 0;

    const cantServicios =
      this.serviciosFactura?.reduce((acc, i) => acc + (i.cantidad || 0), 0) || 0;

    this.cantItems = cantProductos + cantServicios;
  }

  ObtenerEmpresas(){
    this.miscService.ObtenerEmpresas()
      .subscribe(response => {
        this.empresas = response;
        this.formFacturacion.get('empresa')?.setValue(this.empresas[0].id);
        this.SetearTitulo();
    });
  }

  ObtenerProcesosVenta(){
    this.miscService.ObtenerProcesosVenta(this.tipo)
      .subscribe(response => {
        this.procesos = response;
        this.formGenerales.get('proceso')?.setValue(this.procesos[1]);
      });
  }

  ObtenerPuntosVenta(){
    this.miscService.ObtenerPuntosVenta()
      .subscribe(response => {
        this.puntos = response;
        this.formGenerales.get('punto')?.setValue(this.puntos[3]);
      });
  }

  ObtenerLineasTalle(){
    this.miscService.ObtenerLineasTalle()
      .subscribe(response => {
        this.lineasTalles = response;
      });
  }

  ObtenerServicios(){
    this.serviciosService.Selector()
      .subscribe(response => {
        this.servicios = response;
      });
  }

  ObtenerMetodosPago(){
    this.miscService.ObtenerMetodosPago()
      .subscribe(response => {
        this.metodosPago = response;
        this.formPagos.get('metodo')?.setValue(this.metodosPago[0]);
      });
  }

  ObtenerTiposDescuento(){
    this.miscService.ObtenerTiposDescuento()
      .subscribe(response => {
        this.tiposDescuento = response;
        this.formFacturacion.get('tDescuento')?.setValue(1);
      });
  }

  SelectContent(event: FocusEvent) {
    const input = event.target as HTMLInputElement;
    input.select();
  }

  CambioEmpresa(){
    const seleccionada = this.empresas.find(e => e.id == this.formFacturacion.get('empresa')?.value);
    if(this.clienteSeleccionado != undefined){
      this.PrepararFacturacionCliente(this.clienteSeleccionado.idCondicionIva!)

      if(this.ProductoControl.descripcion!= "COTIZACION"){

        if(seleccionada?.abrevCondicion == 'RI'){
          if(this.clienteSeleccionado.idCondicionIva == 1){
            this.formFacturacion.get('tComprobante')?.setValue(1);
          }
          if(this.clienteSeleccionado.idCondicionIva == 5){
            this.formFacturacion.get('tComprobante')?.setValue(6);
          }
        }

        if(seleccionada?.abrevCondicion == 'MONO'){
          this.formFacturacion.get('tComprobante')?.setValue(11);
        }

        this.CalcularTotalGeneral();
        return;
      }
    }

    this.PrepararFacturacionCliente(99)
    this.formFacturacion.get('tComprobante')?.setValue(99);
    this.CalcularTotalGeneral();
  }

  CambioTipoComprobante(){
    if(this.clienteSeleccionado && this.clienteSeleccionado.idCondicionIva == 1 && this.productosFactura.length > 0){
      this.productosFactura.forEach(element => {
        element.unitario = this.CalcularPrecioCliente(element.precio!);
        element.total = element.unitario! * element.cantidad!;
      });
    }

    if(this.TipoComprobanteControl == 99){
      this.formGenerales.get('proceso')?.setValue(this.procesos[0]);
    }else{
      this.formGenerales.get('proceso')?.setValue(this.procesos[1]);
    }

    this.CalcularTotalGeneral();
  }
  
  //#region CLIENTES
  ObtenerClientes(){
    this.clientesService.SelectorClientes()
      .subscribe(response => {
        this.clientes = response;
      });
  }
  
  FiltrarClientes(event: any) {
    const query = event.query.toLowerCase();
    this.clientesFiltrados = this.clientes.filter(c => {
      const nombre = c.nombre!.toLowerCase();
      const dni = c.documento!.toString(); 
      const razon = c.razonSocial!.toLowerCase();
      return nombre.includes(query) || dni.includes(query) || razon.includes(query);
    });
  }

  SeleccionarCliente(comprobante?:number){
    const seleccionado = this.formGenerales.get('cliente')?.value;
    this.clientesService.ObtenerCliente(seleccionado.id)
        .subscribe(response => {
          this.clienteSeleccionado = response;
          this.PrepararFacturacionCliente(this.clienteSeleccionado?.idCondicionIva!, comprobante);
          
          //Obtenemos sus ventas relacionadas
          let nroVenta = this.modificando ? this.venta.id : 0;
          this.ventasService.ObtenerVentasCliente(this.clienteSeleccionado?.id!, nroVenta!)
          .subscribe(response => {
            this.ventasCliente = response;
          });
          
          if(!this.modificando){
            if(this.clienteSeleccionado!.idCategoria == 2 && this.productosFactura.length > 0){
              this.productosFactura.forEach(element => {
                element.unitario = this.CalcularPrecioCliente(element.precio!);
                element.total = element.unitario! * element.cantidad!;
              });
            }
            this.CalcularTotalGeneral();
          }

        });
  }

  PrepararFacturacionCliente(condIvaCliente: number, comprobanteExistente?: number) {
    let seleccionada = this.empresas.find(e => e.id == this.formFacturacion.get('empresa')?.value);

    if(!seleccionada){
      seleccionada = this.empresas[0];
      this.formFacturacion.get('empresa')?.setValue(seleccionada.id);
    } 

    this.miscService.ObtenerComprobantes(seleccionada.abrevCondicion!, condIvaCliente)
      .subscribe(response => {
        this.comprobantes = response;

        if(this.ProcesoControl.descripcion != "COTIZACION"){
          const comprobanteFinal =
          comprobanteExistente ??
          this.DEFAULT_COMPROBANTE_POR_CONDICION[condIvaCliente];

          this.formFacturacion.get('tComprobante')?.setValue(comprobanteFinal);
          if(this.clienteSeleccionado && this.clienteSeleccionado!.idCategoria == 2 && this.productosFactura.length > 0){
            this.productosFactura.forEach(element => {
              element.unitario = this.CalcularPrecioCliente(element.precio!);
              element.total = element.unitario! * element.cantidad!;
            });
          }
          this.CalcularTotalGeneral();
        }
        else{
          this.formFacturacion.get('tComprobante')?.setValue(99);
        }
      });
  }


  // ObtenerComprobantes(empresa:string,idCondCliente:number){
  //   this.miscService.ObtenerComprobantes(empresa,idCondCliente)
  //     .subscribe(response => {
  //       this.comprobantes = response;
  //     });
  // }

  ObtenerToolTip(idProceso: number): string {
      if ((idProceso === 5 && this.ProcesoControl.id === 6) || (idProceso === 5 && this.ProcesoControl.id === 7)) {
        return 'Click para Relacionar';
      }

      if (idProceso === 6 && [1, 2, 3].includes(this.ProcesoControl.id)) {
          return 'click para Facturar';
      }

      if (idProceso === this.ProcesoControl.id) {
          return 'Click para Editar';
      }
      return '';
  }

  RelacionarActualizarProceso(venta:Venta){
    if(venta.nroProceso == this.nroRelacionado) return;

    this.nroRelacionado = venta.nroProceso!;

    if (venta.idProceso === this.ProcesoControl.id) {
      this.confirmationService.confirm({
        key: 'cerrarDialog',
        message: '¿Estas seguro de pasar a editar el nro de proceso ' + venta.nroProceso + "?",
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
          this.venta = venta;
          this.CompletarCampos();
          this.modificando = true;
          this.Notificaciones.Info("Proceso cargado correctamente para edición.");
        },
        reject: () => {},
      });
      return;
    }

    if(venta.idProceso == 5){
      this.Notificaciones.Info("Se relacionará con el presupuesto Nro: " + venta.nroProceso);
      this.tipoRelacionado = "PRESUPUESTO";
    }

    if(venta.idProceso == 6){
      this.tipoRelacionado = "PEDIDO";
      this.ConfirmarFacturacionRelacionado(venta);
      return;
    }

    if(venta.idProceso == 7){
      this.tipoRelacionado = "NOTA DE EMPAQUE";
      this.ConfirmarFacturacionRelacionado(venta);
      return;
    }
  }

  ConfirmarFacturacionRelacionado(venta:Venta){
    this.confirmationService.confirm({
      key: 'cerrarDialog',
      message: '¿Estas seguro de pasar a facturar el proceso nro ' + venta.nroProceso + "?",
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
        this.venta = venta;
        if(this.venta.productos) this.productosFactura = this.venta.productos;
        if(this.venta.servicios) this.serviciosFactura = this.venta.servicios;
        this.formGenerales.get('punto')?.setValue(this.puntos.find(p => p.id == this.venta.idPunto));
        this.formFacturacion.get('descuento')?.setValue(0);
        this.formFacturacion.get('tDescuento')?.setValue(1);
        this.CalcularTotalGeneral();

        if(venta.idProceso == 6){
          this.Notificaciones.Info("Se facturará el pedido Nro: " + venta.nroProceso);
        }
        if(venta.idProceso == 7){
          this.formGenerales.get('nroNota')?.setValue(venta.nroProceso);
          this.Notificaciones.Info("Se relacionará con la nota de empaque Nro: " + venta.nroProceso);
        }

      },
      reject: () => {},
    });
  }


  Actualizar(valor:boolean){
    if(valor)
      this.ObtenerClientes();

    this.modalAddClienteVisible = false;
  }

  //#endregion

  //#region PRODUCTOS, FILTROS Y AGREGAR
  FiltrarProductos(event: any) {
    const query = event.query.toLowerCase();
    if(query.length == 0){
      this.productosFiltrados = [];
      this.productoSeleccionado = new Producto();
      return;
    }
    
    if(this.ProcesoControl.descripcion === 'PRESUPUESTO'){
      this.productosService.BuscarProductosPresupuesto(query)
      .subscribe(response => {
        this.productosPreFiltrados = response;
      });
    }else{
      this.productosService.BuscarProductos(query)
      .subscribe(response => {
        this.resultadoBusqueda = response;
        this.productosFiltrados = this.AgruparProductos(this.resultadoBusqueda);
      });
    }
    
  }

  AgruparProductos(productos: Producto[]) {
      const mapa = new Map<string, { codigo: string, nombre: string }>();

      for (const p of productos) {
          const key = `${p.codigo}|${p.nombre}`;
          if (!mapa.has(key)) {
              mapa.set(key, {
                  codigo: p.codigo ?? "",
                  nombre: p.nombre ?? ""
              });
          }
      }

      return Array.from(mapa.values());
  }


  SeleccionarProducto(){
    const seleccionado = this.formProductos.get('producto')?.value;
    if(this.ProcesoControl.descripcion === "PRESUPUESTO"){
      this.productoSeleccionado = seleccionado;
      return;
    }

    this.variantesDisponibles = this.resultadoBusqueda.filter(p=> p.codigo == seleccionado.codigo)
    this.coloresDisponibles = this.variantesDisponibles.map(p => {
        const cd = new ColorDisponible();
        cd.idProducto = p.id;
        cd.color = p.color?.descripcion ?? 'Sin color';
        cd.hexa = p.color?.hexa ?? '#000000';
        return cd;
    })
    .sort((a, b) => a.color.localeCompare(b.color));

    if(this.coloresDisponibles.length == 1){
      this.productoSeleccionado = this.variantesDisponibles.find(v=>v.id === this.coloresDisponibles[0].idProducto)!;
      this.formProductos.get('colorSeleccionado')?.setValue(this.coloresDisponibles[0]);
      this.SeleccionarVariante(this.productoSeleccionado.id!)
    }
  }

  SeleccionarVariante(idProducto){
    this.productoSeleccionado = this.variantesDisponibles.find(v=>v.id === idProducto)!;
    let linea = this.lineasTalles.find(l => l.id === this.productoSeleccionado.talles![0].idLineaTalle);
    if(!linea) return;
    this.tallesProducto = linea.talles!;

    //Para nota de empaque buscamos la disponibilidad actual
    if(this.ProcesoControl.descripcion === 'NOTA DE EMPAQUE'){
      this.productosService.ObtenerStockDisponiblePorProducto(this.productoSeleccionado.id!.toString())
      .subscribe(response => {
        this.productoSeleccionado.talles = response;
      });
    }
  }

  ObtenerCantidad(talle: string, proceso:string) {
    if (!this.productoSeleccionado?.talles) return 0;

    const encontrado = this.productoSeleccionado.talles.find((t: any) => t.talle === talle);
    if(proceso=="stock")
      return encontrado ? encontrado.cantidad : 0;
    else if(proceso=="agregar")
      return encontrado && encontrado.cantAgregar! > 0 ? encontrado.cantAgregar : 0;
    else if(proceso=="disponible")
      return encontrado ? encontrado.disponible : 0;

    return 0;
  }

  DefinirCantidadAgregarTalle(talle:string){
    if (!this.productoSeleccionado?.talles) return 0;
    
    let encontrado = this.productoSeleccionado.talles.find((t: any) => t.talle === talle);
    if (encontrado) {
      if(encontrado && encontrado.cantidad == 0) return;
      if(encontrado && encontrado.cantAgregar! >= encontrado.cantidad!) return; //Si la cantidad a agregar es mayor o igual a lo disponible no agregamos

      encontrado.cantAgregar = (encontrado.cantAgregar || 0) + 1;
    }

    return;
  }
  //#endregion

  //#region PRODUCTOS VENTA
  async AgregarProducto() {
    if (this.tablaProductos) this.tablaProductos.editingCell = null;

    if(this.ProcesoControl.descripcion === 'PRESUPUESTO'){
      if (!this.productoSeleccionado) return;
      if(this.venta.estado == "Asociado"){
        this.Notificaciones.Warn("No puedes editar un presupuesto en estado asociado.");
        return;
      }

      const cantidad = this.formProductos.get('cantidad')?.value != '' ? this.formProductos.get('cantidad')?.value : 1;
      const precio = this.globalesService.EstandarizarDecimal(this.formProductos.get('precio')?.value);
      const nuevo = new ProductosFactura({
        idProducto: this.productoSeleccionado.id,
        codProducto: this.productoSeleccionado.codigo,
        nomProducto: this.productoSeleccionado.nombre,
        cantidad: cantidad,
        unitario: precio,
        total: precio * cantidad,
      });

      if(nuevo.unitario === 0){
        nuevo.unitario = this.ProductoControl.sugerido;
        nuevo.total = nuevo.unitario! * nuevo.cantidad!;
      }

      this.productosFactura.push(nuevo);
    }
    else{
      if(this.venta.estado == "Facturado" || this.venta.estado == "Facturada"){
        this.Notificaciones.Warn("No puedes editar una en estado facturada.");
        return;
      }
      
      const codigo = this.formProductos.get('codigoBarras')?.value ?? "";
      if (!codigo.trim() && !this.productoSeleccionado?.talles) return;

      let idTalle = 0;
      if(codigo != ""){
        const response = await firstValueFrom(this.productosService.ValidarCodigo(codigo));
        if(response){
          idTalle = parseInt(codigo.slice(6, 9));
          this.productoSeleccionado = response;
        }else{
          this.Notificaciones.Warn("No se encontraron productos con este código");
          this.inputCodigo.nativeElement.select();
          return
        }
      }
     

      let tallesSeleccionados:any[] = [];
      if(this.ProcesoControl.descripcion == 'PEDIDO'){
        // Tomar todos los talles disponibles
        tallesSeleccionados = this.productoSeleccionado.talles!;
      }else{
        if(idTalle === 0){
          // Tomar solo los talles que el usuario seleccionó
          tallesSeleccionados = this.productoSeleccionado.talles!.filter((t: any) => t.cantAgregar > 0);
          if(tallesSeleccionados.length === 0) {
            this.Notificaciones.Warn("Asegurate de seleccionar al menos un talle.");
            return;
          }
        }else{
          // Tomar solo el talle seleccionado
          tallesSeleccionados.push(this.productoSeleccionado.talles!.find((t: any) => t.idTalle === idTalle));
          tallesSeleccionados[0].cantAgregar = 1;
        }
      }

      tallesSeleccionados.forEach((talleSel: any) => {
        const cantidad = talleSel.cantAgregar ?? 0;
        let precio = talleSel.precio;

        if(this.clienteSeleccionado && this.clienteSeleccionado.idCategoria == 2){
          precio = this.CalcularPrecioCliente(precio);
        }
        
        // Ver si ya existe ese producto con ese precio en el detalle
        let existente = this.productosFactura.find(
          (p: ProductosFactura) =>
            p.idProducto === this.productoSeleccionado.id && p.unitario === precio
        );

        if (existente) {
          // Sumar cantidad y total
          existente.cantidad = (existente.cantidad ?? 0) + cantidad;
          existente.total = (existente.unitario ?? 0) * (existente.cantidad ?? 0);

          // Asignar cantidad a tX
          this.AsignarTalle(existente, talleSel.talle, cantidad, talleSel.idLineaTalle);

          // Agregar el talle si no estaba ya en tallesSeleccionados
          const tallesExistentes = existente.tallesSeleccionados ? existente.tallesSeleccionados.split(",").map(t => t.trim()) : [];
          if (!tallesExistentes.includes(talleSel.talle)) {
            tallesExistentes.push(talleSel.talle);
            existente.tallesSeleccionados = tallesExistentes.join(", ");
          }
        } else {
          // Crear nueva línea de producto
          const nuevo = new ProductosFactura({
            idProducto: this.productoSeleccionado.id,
            codProducto: this.productoSeleccionado.codigo,
            nomProducto: this.productoSeleccionado.nombre,
            topeDescuento: this.productoSeleccionado.topeDescuento,
            talles: this.productoSeleccionado.talles,
            idColor: this.productoSeleccionado.color!.id,
            color: this.productoSeleccionado.color!.descripcion,
            hexa: this.productoSeleccionado.color!.hexa,
            idLineaTalle: talleSel.idLineaTalle,
            cantidad: cantidad,
            precio: talleSel.precio,
            unitario: precio,
            total: precio * cantidad,
            tallesSeleccionados: talleSel.talle
          });

          // Asignar cantidad a tX
          this.AsignarTalle(nuevo, talleSel.talle, cantidad, talleSel.idLineaTalle);
          this.productosFactura.push(nuevo);

        }
      });
    }
    
    this.CalcularTotalGeneral();
    this.productoSeleccionado = new Producto();
    this.formProductos.reset();
    setTimeout(() => {
        if (this.tablaProductos) this.tablaProductos.editingCell = null;
        this.inputCodigo.nativeElement.focus();
    }, 0);
  }

  getPrecioMostrado(precioBase: number): number {
    return this.TipoComprobanteControl === 6
      ? precioBase * 1.21
      : precioBase;
  }

  CalcularPrecioCliente(precio:number){
    switch (this.clienteSeleccionado!.idListaPrecio) {
      case 2: //Lista 3 40% descuento
        precio = precio * 0.60 
        break;
      case 3: // Lista 4 45% descuento
        precio = precio * 0.55
        break;
      case 4: // Lista 5 50% descuento
        precio = precio * 0.50
        break;
      default: // Lista Consumidor Final
        break;
    }
    return precio;
  }

  AsignarTalle(productoFactura: ProductosFactura, talle: string, cantidad: number, idLineaTalle: number) {
    const linea = this.lineasTalles.find(l => l.id === idLineaTalle);
    if (!linea) return;

    const index = linea.talles!.indexOf(talle);
    if (index === -1) return;

    const campo = `t${index + 1}` as keyof ProductosFactura;
    (productoFactura as any)[campo] = ((productoFactura as any)[campo] ?? 0) + cantidad;
  }

  //#region Actualizar Cantidad input tabla
  ActualizarCantidad(producto: any, field: string, event: any) {
    const input = event.target as HTMLInputElement;
    const value = Number(input.value) || 0;

    const talleReal = this.ObtenerTalleDesdeField(producto, field);
    if (!talleReal) return;

    const talleEncontrado = producto.talles.find((t: any) => t.talle === talleReal);
    if (!talleEncontrado) {
      this.Notificaciones.Warn(
        `No está habilitado el talle ${talleReal} para el producto ${producto.nomProducto}.`
      );
      return;
    }

    if (talleEncontrado.precio !== producto.precio) {
      this.Notificaciones.Warn(
        'No coincide el precio del talle con el unitario del producto.'
      );
      return;
    }

    if (
      this.ProcesoControl.descripcion !== 'PEDIDO' &&
      value > talleEncontrado.cantidad
    ) {
      this.Notificaciones.Warn(
        `La cantidad ingresada supera el stock disponible (${talleEncontrado.cantidad}) para el talle ${talleReal}.`
      );
      input.value = producto[field];
      return;
    }

    producto[field] = value;

    this.AgregarTalleSeleccionado(producto, talleReal);
    this.RecalcularProducto(producto);
  }

  private ObtenerTalleDesdeField(producto: any, field: string): string | null {
    if (producto[field] !== undefined) {
      return this.ObtenerTalleReal(field, producto);
    }

    const linea = this.lineasTalles.find(l => l.id === producto.idLineaTalle);
    if (!linea) return null;

    const index = parseInt(field.replace('t', '')) - 1;
    return linea.talles?.[index] ?? null;
  }

  private AgregarTalleSeleccionado(producto: any, talle: string) {
    const talles = producto.tallesSeleccionados
      ? producto.tallesSeleccionados.split(',').map((t: string) => t.trim())
      : [];

    if (!talles.includes(talle)) {
      talles.push(talle);
      producto.tallesSeleccionados = talles.join(', ');
    }
  }

  private RecalcularProducto(producto: any) {
    producto.cantidad = Array.from({ length: 10 }, (_, i) => producto[`t${i + 1}`] || 0)
      .reduce((a, b) => a + b, 0);

    producto.total = producto.cantidad * producto.unitario;
    this.CalcularTotalGeneral();
  }


  ActualizarValoresPresupuesto(producto: any, event: any, tipo: 'cantidad' | 'precio') {
    const input = event.target as HTMLInputElement;
    const value = this.globalesService.EstandarizarDecimal(input.value);
    if(value <= 0) return;

    if(tipo === 'cantidad')
      producto.cantidad = value;

    if(tipo === 'precio')
      producto.unitario = value;

    producto.total = producto.cantidad * producto.unitario;
    this.CalcularTotalGeneral();
  }

  ObtenerTalleReal(tx: string, objeto: any): string | null {
    const talles = objeto.tallesSeleccionados.split(',').map(t => t.trim());
    const clavesConValor = Object.keys(objeto)
    .filter(k => /^t\d+$/.test(k) && objeto[k] != null && objeto[k] !== undefined)
    .sort((a,b) => Number(a.replace('t','')) - Number(b.replace('t','')));
    const index = clavesConValor.indexOf(tx);
    return talles[index] ?? null;
  }

  //#endregion
  
  EliminarProducto(event: Event, idProducto:number){
    this.confirmationService.confirm({
      target: event.target as EventTarget, 
      message: '¿Borrar el registro?',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Sí',
      rejectLabel: 'No',
      rejectButtonProps: {
          severity: 'secondary',
          outlined: true
      },
      accept: () => {
        //Quitamos del array
        const indice = this.productosFactura.findIndex(p => p.idProducto == idProducto);
        if(indice != -1) this.productosFactura.splice(indice, 1);
        this.CalcularTotalGeneral();
        this.Notificaciones.Success("Producto quitado correctamente");
      }
    });
  }
  //#endregion

  //#region SERVICIOS VENTA
  FiltrarServicios(event: any) {
    const query = event.query.toLowerCase();
    this.serviciosFiltrado = this.servicios.filter(c => {
      const nombre = c.descripcion!.toLowerCase();
      const codigo = c.codigo!.toLowerCase();
      return nombre.includes(query) || codigo.includes(query);
    });
  }

  AgregarServicio() {
    if(this.venta.estado == "Facturado" || this.venta.estado == "Facturada"){
      this.Notificaciones.Warn("No puedes editar una en estado facturada.");
      return;
    }
    if(this.venta.estado == "Asociado" || this.venta.idProceso == 5){
      this.Notificaciones.Warn("No puedes editar un presupuesto en estado asocaido.");
      return;
    }

    const nuevoServicio:ServiciosFactura = new ServiciosFactura();
    const seleccionado = this.formServicios.get('servicio')?.value;

    nuevoServicio.idServicio = seleccionado.id;
    nuevoServicio.codServicio = seleccionado.codigo;
    nuevoServicio.nomServicio = seleccionado.descripcion;
    nuevoServicio.cantidad = this.formServicios.get('cantidad')?.value != '' ? this.formServicios.get('cantidad')?.value : 1;
    nuevoServicio.unitario = this.globalesService.EstandarizarDecimal(this.formServicios.get('precio')?.value);
    if(nuevoServicio.unitario === 0){
      nuevoServicio.unitario = seleccionado.sugerido;
    }
    nuevoServicio.total = nuevoServicio.cantidad! * nuevoServicio.unitario!;
    nuevoServicio.topeDescuento = seleccionado.topeDescuento;

    this.serviciosFactura.push(nuevoServicio);
    this.CalcularTotalGeneral();
    this.formServicios.reset();
  }

  EliminarServicio(event: Event, idServicio:number){
    this.confirmationService.confirm({
      target: event.target as EventTarget, 
      message: '¿Borrar el registro?',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Sí',
      rejectLabel: 'No',
      rejectButtonProps: {
          severity: 'secondary',
          outlined: true
      },
      accept: () => {
        //Quitamos del array
        const indice = this.serviciosFactura.findIndex(p => p.idServicio == idServicio);
        if(indice != -1) this.serviciosFactura.splice(indice, 1);
        this.CalcularTotalGeneral();
        this.Notificaciones.Success("Servicio quitado correctamente");
      }
    });
  }
  //#endregion

  //#region PAGOS VENTA
  AgregarPagoContado(){
    if(this.totalAPagar == 0) return;

    const nuevoPago = new PagosFactura();
    const seleccionado = this.metodosPago[0];
    nuevoPago.idMetodo = seleccionado.id;
    nuevoPago.metodo = seleccionado.descripcion;
    nuevoPago.monto = this.totalAPagar;
    this.pagosFactura.push(nuevoPago);
  }

  get montoRestante(): number {
    const entregado = this.pagosFactura?.reduce(
      (acc, item) => acc + (item.monto || 0),
      0
    ) || 0;

    return Math.max(this.totalAPagar - entregado, 0);
  }

  AgregarPago() {
    if (this.formPagos.invalid) return;

    const montoIngresado = this.formPagos.get('monto')?.value;
    const montoFinal = montoIngresado
      ? this.globalesService.EstandarizarDecimal(montoIngresado)
      : this.montoRestante;

    if (montoFinal <= 0) return;

    if (montoFinal > this.montoRestante) {
      this.Notificaciones.Warn(
        "La entrega por pago no puede superar el total a pagar."
      );
      return;
    }

    const seleccionado = this.formPagos.get('metodo')?.value;

    const nuevoPago = new PagosFactura();
    nuevoPago.idMetodo = seleccionado.id;
    nuevoPago.metodo = seleccionado.descripcion;
    nuevoPago.monto = montoFinal;

    this.pagosFactura.push(nuevoPago);
    this.formPagos.reset();
  }

  EliminarPago(event: Event, idMetodo:number){
    this.confirmationService.confirm({
      target: event.target as EventTarget, 
      message: '¿Borrar el registro?',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Sí',
      rejectLabel: 'No',
      rejectButtonProps: {
          severity: 'secondary',
          outlined: true
      },
      accept: () => {
        //Quitamos del array
        const indice = this.pagosFactura.findIndex(p => p.idMetodo == idMetodo);
        if(indice != -1) this.pagosFactura.splice(indice, 1);
        this.Notificaciones.Success("Metodo de pago quitado correctamente");
      }
    });
  }
  //#endregion

  Guardar(factura?:FacturaVenta, finalizando:boolean = false){
    if(this.modificando){
      if(this.venta.estado == "Facturado" || this.venta.estado == "Facturada"){
        this.Notificaciones.Warn("No puedes editar una venta en estado facturada.");
        return;
      }
      if(this.venta.estado == "Asociado" || this.venta.idProceso == 5){
        this.Notificaciones.Warn("No puedes editar un presupuesto en estado asocaido.");
        return;
      }
    }

    this.markFormTouched(this.formGenerales);
    if(this.formGenerales.invalid){
      this.Notificaciones.Warn("Falta completar datos obligatorios.")
      return;
    } 

    this.ArmarObjetoVenta();
    if(factura && factura.estado == "Aprobado")
      this.venta.factura = factura;
      
    if(this.venta.factura)
      this.venta.estado = "Facturada";

    if(this.ProcesoControl.descripcion == "COTIZACION")
      this.venta.estado = "Finalizada"

    if(!this.modificando){
      this.ventasService.Agregar(this.venta)
      .subscribe(response => {
        if(response){
          if(!finalizando){
            this.Notificaciones.Success(this.venta.proceso + " agregado/a correctamente");
            this.venta.id = parseInt(response);
            this.venta.hora = new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false });
            this.router.navigateByUrl("/ventas?tipo=" + this.tipo)
          }else{
            this.Notificaciones.Success("Se guardaron los cambios y se facturó correctamente");
            this.router.navigateByUrl("/ventas?tipo=" + this.tipo)
          }          
        }
      });
    }else{
      this.ventasService.Modificar(this.venta)
      .subscribe(response => {
        if(response){

          if(!finalizando){
            this.Notificaciones.Success(this.venta.proceso + " actualizado/a correctamente");
            this.router.navigateByUrl("/ventas?tipo=" + this.tipo)
          }else{
            this.Notificaciones.Success("Venta actualizada y facturada correctamente");
            this.router.navigateByUrl("/ventas?tipo=" + this.tipo)
          } 
        }   
      });
    }
  }
  
  Cerrar(){
    if (
    this.venta.id === 0 && (
        (this.ProcesoControl?.id > 0 && this.clienteSeleccionado)
        || this.productosFactura.length > 0
    )
    ) {
      this.confirmationService.confirm({
        key: 'cerrarDialog',
        message: 'Si cierras ahora la ventana vas a perder los cambios no guardados. <br> ¿Estas seguro que deseas cerrar?',
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
          this.router.navigateByUrl("/ventas?tipo=" + this.tipo)
        },
        reject: () => {},
      });
    } else {
      this.router.navigateByUrl("/ventas?tipo=" + this.tipo)
    }
  }

  get pagoCompleto(): boolean {
    if(this.pagosFactura.length > 0){
      const totalPagos = this.pagosFactura.reduce(
        (acc, p) => acc + (p.monto || 0),
        0
      );
      return totalPagos >= this.totalAPagar;
    }

    return false;
  }

  ConfirmarFacturacion(){
    this.markFormTouched(this.formGenerales);
    if(this.formGenerales.invalid){
      this.Notificaciones.Warn("Falta completar datos obligatorios.")
      return;
    } 

    this.markFormTouched(this.formFacturacion);
      if(this.formFacturacion.invalid) {
        this.Notificaciones.Warn("Falta completar datos obigatorios de facturación.")
        return;
      };

    if(this.clienteSeleccionado!.idCondicionPago != 2){
      if(this.pagosFactura.length == 0){
        this.Notificaciones.Warn("No se registraron métodos de pago.");
        return;
      }
      if(!this.pagoCompleto){
        this.Notificaciones.Warn("Este cliente no admite cuenta corriente. Para continuar, debés registrar el pago total de la venta.");
        return;
      }
    }

    if(this.formGenerales.invalid) return;
    if(this.formFacturacion.invalid) return;

    this.objFacturar.total = Number(this.totalGeneral.toFixed(2));
    this.objFacturar.neto = Number(this.subtotal.toFixed(2));
    this.objFacturar.iva = Number(this.totalIva.toFixed(2));
    this.objFacturar.tipoFactura = this.formFacturacion.get('tComprobante')?.value;
    this.objFacturar.tipoFacturaDesc = this.comprobantes.find(c => c.id == this.formFacturacion.get('tComprobante')?.value)?.descripcion;
    this.objFacturar.docNro = this.clienteSeleccionado!.documento;
    this.objFacturar.docTipo = this.clienteSeleccionado!.idTipoDocumento;
    this.objFacturar.docTipoDesc = this.clienteSeleccionado!.tipoDocumento;
    this.objFacturar.condReceptor = this.clienteSeleccionado!.idCondicionIva;
    this.objFacturar.condicion = this.clienteSeleccionado!.condicionIva;
    this.objFacturar.cliente = this.clienteSeleccionado!.nombre;
    this.objFacturar.empresa = this.empresas.find(e => e.id == this.formFacturacion.get('empresa')?.value)?.razonSocial;
    this.objFacturar.idEmpresa = this.formFacturacion.get('empresa')?.value;
    this.objFacturar.pagos = this.pagosFactura;
    this.modalFacturarVisible = true;
  }

  GuardarFacturar(factura?:FacturaVenta){
    if(factura && factura!=undefined){
      console.log(factura)
      if(factura.estado == "Aprobado" || factura.estado == "Cotizacion"){
        this.Guardar(factura, true);
      }else{
        this.Notificaciones.Error("No se pudo realizar la facturación electrónica, consulte los registros.")
      }

    }

    this.modalFacturarVisible = false;
  }

  ArmarObjetoVenta(){
    this.venta.idProceso = this.formGenerales.get('proceso')?.value.id;
    this.venta.proceso = this.formGenerales.get('proceso')?.value.descripcion;
    this.venta.idPunto = this.formGenerales.get('punto')?.value.id;
    this.venta.punto = this.formGenerales.get('punto')?.value.descripcion;
    this.venta.fecha = this.formGenerales.get('fecha')?.value;

    this.venta.cliente = this.clienteSeleccionado;
    // this.venta.idCliente = this.formGenerales.get('cliente')?.value.id;
    // this.venta.cliente = this.clienteSeleccionado?.nombre;
    // this.venta.condCliente = this.clienteSeleccionado?.condicionIva!;
    this.venta.nroRelacionado = this.nroRelacionado;
    this.venta.tipoRelacionado = this.tipoRelacionado;

    if(this.venta.idProceso == 7)
      this.venta.estado = "Pendiente";
    else
      this.venta.estado = "Aprobado";


    const idLista = this.formGenerales.get('lista')?.value;

    if(idLista == null || idLista == ""){
      this.venta.idListaPrecio = 1;
      this.venta.listaPrecio = "CONSUMIDOR FINAL";
    }
    else
    {
      this.venta.idListaPrecio = this.formGenerales.get('lista')?.value.id;
      this.venta.listaPrecio = this.formGenerales.get('lista')?.value.descripcion;
    }
      
    if(this.tipo === 'factura'){
      this.venta.idEmpresa = this.formFacturacion.get('empresa')?.value;
      this.venta.idTipoComprobante = this.formFacturacion.get('tComprobante')?.value;
      this.venta.idTipoDescuento = this.formFacturacion.get('tDescuento')?.value;
      const descuento = this.formFacturacion.get('descuento')?.value;
      this.venta.descuento = descuento == '' ? 0 : descuento;
      this.venta.codPromocion = 0;
      this.venta.redondeo = this.globalesService.EstandarizarDecimal(this.redondeo.value);

      this.venta.empresa = this.empresas.find(e => e.id == this.formFacturacion.get('empresa')?.value)?.razonSocial;
      this.venta.tipoComprobante = this.comprobantes.find(c => c.id == this.formFacturacion.get('tComprobante')?.value)?.descripcion;
      this.venta.tipoDescuento = this.tiposDescuento.find(t => t.id == this.formFacturacion.get('tDescuento')?.value)?.descripcion;

      this.venta.estado = "Pendiente";
      if(this.pagoCompleto == false){
        this.venta.impaga = 1;
      }
    }

    this.venta.total = this.totalAPagar;
    this.venta.productos = this.productosFactura;
    this.venta.servicios = this.serviciosFactura;
    this.venta.pagos = this.pagosFactura;
  }

  //Marca los campos del formulario como tocados para validar
  markFormTouched(control: AbstractControl) {
    if (control instanceof FormGroup || control instanceof FormArray) {
      Object.values(control.controls).forEach(c => this.markFormTouched(c));
    } else {
      control.markAsTouched();
      control.markAsDirty();
    }
  }
}
