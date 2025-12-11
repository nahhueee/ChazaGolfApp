
import { Component, HostListener } from '@angular/core';
import { FORMS_IMPORTS } from '../../../../imports/forms.import';
import { NavegacionComponent } from '../../../compartidos/navegacion/navegacion.component';
import { AccordionModule } from 'primeng/accordion';
import { TableModule } from 'primeng/table';
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
    ConfirmDialogModule
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
  totalGeneral:number = 0;
  totalAPagar:number = 0;
  cantItems:number = 0;

  itemsMenu: MenuItem[];
  vistaPreviaVisible:boolean = false;
  modalClienteVisible:boolean = false;
  modalAddClienteVisible:boolean = false;
  modalFacturarVisible:boolean = false;

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
  redondeo:FormControl = new FormControl('');
  pagosFactura:PagosFactura[]=[];
  empresas=[
    {id: 1, descripcion: 'SUCEDE SRL'},
    {id: 2, descripcion: 'GABEL MARIELA'},
    {id: 3, descripcion: 'OMAR CHAZA'},
  ];
  tiposDescuento:TipoDescuento[]=[];
  comprobantes:TipoComprobante[]=[];
  metodosPago:MetodoPago[]=[];

  objFacturar:ObjFacturar = new ObjFacturar();

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
      tDescuento: new FormControl([null]),
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
  get ProductoControl(){return this.formProductos.get('producto')?.value ?? '';}
  get esPresupuesto(): boolean {
    return this.ProcesoControl?.descripcion === 'PRESUPUESTO';
  }

  ngOnInit(): void {
    this.rutaActiva.queryParams.subscribe(params => {
      this.tipo = params['tipo'] ?? 'factura';

      this.ReiniciarTodo();
      this.ObtenerProcesosVenta();
    });

    this.ObtenerPuntosVenta();
    this.ObtenerClientes();
    this.ObtenerLineasTalle();
    this.ObtenerServicios();
    this.ObtenerMetodosPago();
    this.ObtenerTiposDescuento();
  }

  ngAfterViewInit(){
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

    //DEPENDIENDO EL PROCESO HABILITAMOS NOTA DE EMPAQUE
    this.formGenerales.get('punto')?.valueChanges.subscribe((valor) => {
    const nroNotaControl = this.formGenerales.get('nroNota');
      if (valor.id != 5) {
        nroNotaControl?.disable({ emitEvent: false });
      } else {
        nroNotaControl?.enable({ emitEvent: false });
      }
    });

    //Calcula el total general cuando se aplica un descuento
    this.formFacturacion.get('descuento')?.valueChanges.subscribe((value) => {
      this.CalcularTotalGeneral();
    });

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
     this.ventasService.ObtenerProximoNroProceso(this.ProcesoControl.id)
    .subscribe(response => {
      this.proximoNroVenta = response;

      if(this.venta.id == 0){
        let antelacion = this.ProcesoControl.descripcion == "PRESUPUESTO" || this.ProcesoControl.descripcion == "PEDIDO" ? "Nuevo " : "Nueva ";
        this.titulo = antelacion + this.ProcesoControl.descripcion + " Nro: " + this.proximoNroVenta;
      }
    });
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
    this.formFacturacion.get('tDescuento')?.setValue(this.tiposDescuento.find(t => t.id == this.venta.idTipoDescuento));
    this.formFacturacion.get('descuento')?.setValue(this.venta.descuento);
    this.formFacturacion.get('codPromo')?.setValue(this.venta.codPromocion);
    this.redondeo.setValue(this.venta.redondeo?.toLocaleString('es-AR'));

    this.nroRelacionado = this.venta.nroRelacionado!;
    this.tipoRelacionado = this.venta.tipoRelacionado!;

    this.formGenerales.get('cliente')?.setValue(this.clientes.find(c => c.id == this.venta.idCliente));
    this.SeleccionarCliente();

    if(this.venta.productos) this.productosFactura = this.venta.productos;
    if(this.venta.servicios) this.serviciosFactura = this.venta.servicios;
    if(this.venta.pagos) this.pagosFactura = this.venta.pagos;

    this.titulo = "Editar " + this.ProcesoControl.descripcion + " Nro: " + this.venta.nroProceso;
    this.CalcularTotalGeneral();
  }

  CalcularTotalGeneral() {
    const totalProductos = this.productosFactura?.reduce((acc, item) => acc + (item.total || 0), 0) || 0;
    const totalServicios = this.serviciosFactura?.reduce((acc, item) => acc + (item.total || 0), 0) || 0;
    this.totalItems = totalProductos + totalServicios;

    const descuento = parseFloat(this.DescuentoControl) || 0;

    if (descuento > 0) {
      this.totalDescuento = (this.totalItems * descuento) / 100;
    } else {
      this.totalDescuento = 0;
    }

    // Total final luego de aplicar el descuento
    this.totalGeneral = this.totalItems - this.totalDescuento

    //Total a pagar calculado con redondeo
    this.totalAPagar = this.totalGeneral + this.globalesService.EstandarizarDecimal(this.redondeo.value);

    //sumamos las cantidades
    const cantProductos = this.productosFactura?.reduce((acc, item) => acc + (item.cantidad || 0), 0) || 0;
    const cantServicios = this.serviciosFactura?.reduce((acc, item) => acc + (item.cantidad || 0), 0) || 0;
    this.cantItems = cantProductos + cantServicios;  
  }
  
  ObtenerProcesosVenta(){
    this.miscService.ObtenerProcesosVenta(this.tipo)
      .subscribe(response => {
        this.procesos = response;
      });
  }

  ObtenerPuntosVenta(){
    this.miscService.ObtenerPuntosVenta()
      .subscribe(response => {
        this.puntos = response;
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
      });
  }

  ObtenerTiposDescuento(){
    this.miscService.ObtenerTiposDescuento()
      .subscribe(response => {
        this.tiposDescuento = response;
      });
  }

  ObtenerComprobantes(condicionIva:number){
    this.miscService.ObtenerComprobantes(condicionIva)
      .subscribe(response => {
        this.comprobantes = response;
      });
  }

  SelectContent(event: FocusEvent) {
    const input = event.target as HTMLInputElement;
    input.select();
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
      return nombre.includes(query) || dni.includes(query);
    });
  }

  SeleccionarCliente(){
    const seleccionado = this.formGenerales.get('cliente')?.value;
    this.clientesService.ObtenerCliente(seleccionado.id)
        .subscribe(response => {
          this.clienteSeleccionado = response;

          //Obtenemos sus ventas relacionadas
          let nroVenta = this.modificando ? this.venta.id : 0;
          this.ventasService.ObtenerVentasCliente(this.clienteSeleccionado?.id!, nroVenta!)
          .subscribe(response => {
            console.log(response)
            this.ventasCliente = response;
          });
          
          //Obtnemos los comprobantes disponibles para el cliente
          this.miscService.ObtenerComprobantes(this.clienteSeleccionado!.idCondicionIva!)
          .subscribe(response => {
            this.comprobantes = response;
            if(this.venta.idTipoComprobante)
              this.formFacturacion.get('tComprobante')?.setValue(this.comprobantes.find(c => c.id == this.venta.idTipoComprobante));
          });
        });
  }

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
        this.formFacturacion.get('tDescuento')?.setValue(this.tiposDescuento.find(t => t.id == 1));

        if(venta.idProceso == 6){
          this.Notificaciones.Info("Se facturará el pedido Nro: " + venta.nroProceso);
        }
        if(venta.idProceso == 7){
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
  }

  SeleccionarVariante(event:any){
    this.productoSeleccionado = this.variantesDisponibles.find(v=>v.id === event.value.idProducto)!;
    
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
  AgregarProducto() {
    if(this.ProcesoControl.descripcion === 'PRESUPUESTO'){
      if (!this.productoSeleccionado) return;

      const cantidad = this.formProductos.get('cantidad')?.value;
      const precio = this.globalesService.EstandarizarDecimal(this.formProductos.get('precio')?.value);
      console.log(this.productoSeleccionado)
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
      if (!this.productoSeleccionado || !this.productoSeleccionado.talles) return;

      let tallesSeleccionados:any[] = [];

      if(this.ProcesoControl.descripcion == 'PEDIDO'){
        // Tomar todos los talles disponibles
        tallesSeleccionados = this.productoSeleccionado.talles;
      }else{
        // Tomar solo los talles que el usuario seleccionó
        tallesSeleccionados = this.productoSeleccionado.talles.filter((t: any) => t.cantAgregar > 0);
        if(tallesSeleccionados.length === 0) {
          this.Notificaciones.Warn("Asegurate de seleccionar al menos un talle.");
          return;
        }
      }

      tallesSeleccionados.forEach((talleSel: any) => {
        const cantidad = talleSel.cantAgregar ?? 0;
        const precio = talleSel.precio;

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
            talles: this.productoSeleccionado.talles,
            idColor: this.productoSeleccionado.color!.id,
            color: this.productoSeleccionado.color!.descripcion,
            hexa: this.productoSeleccionado.color!.hexa,
            idLineaTalle: talleSel.idLineaTalle,
            cantidad: cantidad,
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
  }

  AsignarTalle(productoFactura: ProductosFactura, talle: string, cantidad: number, idLineaTalle: number) {
    const linea = this.lineasTalles.find(l => l.id === idLineaTalle);
    if (!linea) return;

    const index = linea.talles!.indexOf(talle);
    if (index === -1) return;

    const campo = `t${index + 1}` as keyof ProductosFactura;
    (productoFactura as any)[campo] = ((productoFactura as any)[campo] ?? 0) + cantidad;
  }

  ActualizarCantidad(producto: any, field: string, event: any) {
    if(producto[field] === undefined) return;

    const talleReal = this.ObtenerTalleReal(field, producto);
        console.log(producto)
    const talleEncontrado = producto.talles.find((t: any) => t.talle === talleReal);
    const input = event.target as HTMLInputElement;
    const value = Number(input.value) || 0;

    if(value <= 0) return;
    console.log(value)

    if(this.ProcesoControl.descripcion !== 'PEDIDO'){
      if(value > talleEncontrado.cantidad){
        this.Notificaciones.Warn(`La cantidad ingresada supera el stock disponible (${talleEncontrado.cantidad}) para el talle ${talleReal}.`);
        input.value = producto[field];
        return;
      }
    }

    producto[field] = value;
   
    producto.cantidad =
      (producto.t1 || 0) +
      (producto.t2 || 0) +
      (producto.t3 || 0) +
      (producto.t4 || 0) +
      (producto.t5 || 0) +
      (producto.t6 || 0) +
      (producto.t7 || 0) +
      (producto.t8 || 0) +
      (producto.t9 || 0) +
      (producto.t10 || 0);

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
    const nuevoServicio:ServiciosFactura = new ServiciosFactura();
    const seleccionado = this.formServicios.get('servicio')?.value;

    nuevoServicio.idServicio = seleccionado.id;
    nuevoServicio.codServicio = seleccionado.codigo;
    nuevoServicio.nomServicio = seleccionado.descripcion;
    nuevoServicio.cantidad = this.formServicios.get('cantidad')?.value;
    nuevoServicio.unitario = this.globalesService.EstandarizarDecimal(this.formServicios.get('precio')?.value);
    if(nuevoServicio.unitario === 0){
      nuevoServicio.unitario = seleccionado.sugerido;
    }
    nuevoServicio.total = nuevoServicio.cantidad! * nuevoServicio.unitario!;

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
  AgregarPago(){
    if(this.formPagos.invalid) return;

    const entregaAnterior = this.pagosFactura?.reduce((acc, item) => acc + (item.monto || 0), 0) || 0;
    const totalEntregado = entregaAnterior + this.globalesService.EstandarizarDecimal(this.formPagos.get('monto')?.value);

    if(totalEntregado > this.totalAPagar){
      this.Notificaciones.Warn("La entrega por pago no puede superar el total a pagar.")
      return;
    }

    const nuevoPago = new PagosFactura();
    const seleccionado = this.formPagos.get('metodo')?.value;
    nuevoPago.idMetodo = seleccionado.id;
    nuevoPago.metodo = seleccionado.descripcion;
    nuevoPago.monto = this.globalesService.EstandarizarDecimal(this.formPagos.get('monto')?.value);

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
    this.markFormTouched(this.formGenerales);
    if(this.tipo === 'factura'){
      this.markFormTouched(this.formFacturacion);
      if(this.formFacturacion.invalid) return;
    }

    if(this.formGenerales.invalid) return;

    this.ArmarObjetoVenta();
    this.venta.factura = factura;
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

  ConfirmarFacturacion(){
    this.objFacturar.total = this.totalAPagar;
    this.objFacturar.tipoFactura = this.formFacturacion.get('tComprobante')?.value.id;
    this.objFacturar.tipoFacturaDesc = this.formFacturacion.get('tComprobante')?.value.descripcion;
    this.objFacturar.docNro = this.clienteSeleccionado!.documento;
    this.objFacturar.docTipo = this.clienteSeleccionado!.idTipoDocumento;
    this.objFacturar.docTipoDesc = this.clienteSeleccionado!.tipoDocumento;
    this.objFacturar.condReceptor = this.clienteSeleccionado!.idCondicionIva;
    this.objFacturar.condicion = this.clienteSeleccionado!.condicionIva;
    this.objFacturar.cliente = this.clienteSeleccionado!.nombre;
    this.objFacturar.empresa = this.formFacturacion.get('empresa')?.value.descripcion;
    this.objFacturar.idEmpresa = this.formFacturacion.get('empresa')?.value.id;
    
    this.modalFacturarVisible = true;
  }

  GuardarFacturar(factura?:FacturaVenta){
    if(factura && factura!=undefined){
      this.Guardar(factura, true);
    }

    this.modalFacturarVisible = false;
  }

  ArmarObjetoVenta(){
    this.venta.idProceso = this.formGenerales.get('proceso')?.value.id;
    this.venta.proceso = this.formGenerales.get('proceso')?.value.descripcion;
    this.venta.idPunto = this.formGenerales.get('punto')?.value.id;
    this.venta.punto = this.formGenerales.get('punto')?.value.descripcion;
    this.venta.fecha = this.formGenerales.get('fecha')?.value;
    this.venta.idCliente = this.formGenerales.get('cliente')?.value.id;
    this.venta.cliente = this.formGenerales.get('cliente')?.value.descripcion;
    this.venta.nroRelacionado = this.nroRelacionado;
    this.venta.tipoRelacionado = this.tipoRelacionado;

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
      this.venta.idEmpresa = this.formFacturacion.get('empresa')?.value.id;
      this.venta.empresa = this.formFacturacion.get('empresa')?.value.descripcion;
      this.venta.idTipoComprobante = this.formFacturacion.get('tComprobante')?.value.id;
      this.venta.tipoComprobante = this.formFacturacion.get('tComprobante')?.value.descripcion;
      this.venta.idTipoDescuento = this.formFacturacion.get('tDescuento')?.value.id;
      this.venta.tipoDescuento = this.formFacturacion.get('tDescuento')?.value.descripcion;
      this.venta.descuento = this.formFacturacion.get('descuento')?.value;
      this.venta.codPromocion = 0;
      this.venta.redondeo = this.globalesService.EstandarizarDecimal(this.redondeo.value);
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
