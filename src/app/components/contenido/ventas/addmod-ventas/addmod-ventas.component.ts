import { Component } from '@angular/core';
import { FORMS_IMPORTS } from '../../../../imports/forms.import';
import { NavegacionComponent } from '../../../compartidos/navegacion/navegacion.component';
import { AccordionModule } from 'primeng/accordion';
import { TableModule } from 'primeng/table';
import { DatePickerModule } from 'primeng/datepicker';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { Cliente } from '../../../../models/Cliente';
import { ClientesService } from '../../../../services/clientes.service';
import { LineasTalle, Producto } from '../../../../models/Producto';
import { ProductosService } from '../../../../services/productos.service';
import { MiscService } from '../../../../services/misc.service';
import { BadgeModule } from 'primeng/badge';
import { OverlayBadgeModule } from 'primeng/overlaybadge';
import { PagosFactura, ProductosFactura, ServiciosFactura, Venta } from '../../../../models/Factura';
import { ConfirmPopupModule } from 'primeng/confirmpopup';
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

@Component({
  selector: 'app-addmod-ventas',
  standalone: true,
  imports: [
    ...FORMS_IMPORTS,
    NavegacionComponent,
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
    FacturarVentaComponent
  ],
  providers: [ConfirmationService],
  templateUrl: './addmod-ventas.component.html',
  styleUrl: './addmod-ventas.component.scss',
})
export class AddModVentasComponent {
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
  listaPrecios = [
    {id: 1, descripcion: 'CONSUMIDOR FINAL'},
    {id: 2, descripcion: 'LISTA 3'},
    {id: 3, descripcion: 'LISTA 4'},
    {id: 4, descripcion: 'LISTA 5'}
  ];

  clienteSeleccionado:Cliente | undefined;
  clientes:Cliente[]=[];
  clientesFiltrados:Cliente[]=[];

  //PANTALLA 2
  formProductos:FormGroup;
  productosFiltrados:Producto[]=[];
  productoSeleccionado:Producto = new Producto();
  tallesBase:string[] = ["X","X","X","X","X","X","X","X","X","X"]
  tallesProducto:string[] = [];

  productosFactura:ProductosFactura[]=[];
  lineasTalles: LineasTalle[] = [];

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
  tiposDescuento=[
    {id: 1, descripcion: 'PORCENTAJE'},
    {id: 2, descripcion: 'VOUCHER'},
    {id: 3, descripcion: 'PROMOCION'},
  ];
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
    private rutaActiva:ActivatedRoute
  ){
    this.itemsMenu = [
        {
            label: 'Guardar',
            command: () => {
                this.Guardar();
            }
        },
        {
            label: 'Guardar y facturar',
            command: () => {
                this.ConfirmarFacturacion();
            }
        }
    ];

    this.formGenerales = new FormGroup({
      proceso: new FormControl(''),
      nroNota: new FormControl({ value: '', disabled: true }),
      fecha: new FormControl(new Date()),
      cliente: new FormControl([null]),
      lista: new FormControl(''),
    });

    this.formProductos = new FormGroup({
      producto: new FormControl([null]),
      descuento: new FormControl(''),
    });

    this.formServicios = new FormGroup({
      servicio: new FormControl([null]),
      cantidad: new FormControl(''),
      precio: new FormControl(''),
    });

    this.formFacturacion = new FormGroup({
      empresa: new FormControl(''),
      tComprobante: new FormControl(''),
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

  ngOnInit(): void {
    this.ObtenerProcesosVenta();
    this.ObtenerClientes();
    this.ObtenerLineasTalle();
    this.ObtenerServicios();
    this.ObtenerMetodosPago();
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
          this.modificando = false;
          this.venta = new Venta();
          this.venta.id = 0;
          this.redondeo.setValue('');
          this.productosFactura = [];
          this.serviciosFactura = [];
          this.pagosFactura = [];
          this.clienteSeleccionado = undefined;
          this.formGenerales.reset({}, { emitEvent: false });
          this.formFacturacion.reset({}, { emitEvent: false });
          this.formFacturacion.get('tDescuento')?.setValue(this.tiposDescuento[0]);
          this.formGenerales.get('fecha')?.setValue(new Date());
          this.CalcularTotalGeneral();
        }
      });
    },10);

    //DEPENDIENDO EL PROCESO HABILITAMOS NOTA DE EMPAQUE
    this.formGenerales.get('proceso')?.valueChanges.subscribe((valor) => {
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

  ObtenerVenta(idVenta){
    this.ventasService.ObtenerVenta(idVenta)
      .subscribe(response => {
        this.venta = response;
        this.formGenerales.get('proceso')?.setValue(this.procesos.find(p => p.id == this.venta.idProceso));
        this.formGenerales.get('nroNota')?.setValue(this.venta.nroNota);
        this.formGenerales.get('fecha')?.setValue(new Date(this.venta.fecha ?? ''));
        this.formGenerales.get('lista')?.setValue(this.listaPrecios.find(l => l.id == this.venta.idListaPrecio));
        this.formFacturacion.get('empresa')?.setValue(this.empresas.find(e => e.id == this.venta.idEmpresa));
        this.formFacturacion.get('tDescuento')?.setValue(this.tiposDescuento.find(t => t.id == this.venta.idTipoDescuento));
        this.formFacturacion.get('descuento')?.setValue(this.venta.descuento);
        this.formFacturacion.get('codPromo')?.setValue(this.venta.codPromocion);
        this.redondeo.setValue(this.venta.redondeo?.toLocaleString('es-AR'));

        this.formGenerales.get('cliente')?.setValue(this.clientes.find(c => c.id == this.venta.idCliente));
        this.SeleccionarCliente();

        if(this.venta.productos) this.productosFactura = this.venta.productos;
        if(this.venta.servicios) this.serviciosFactura = this.venta.servicios;
        if(this.venta.pagos) this.pagosFactura = this.venta.pagos;

        this.CalcularTotalGeneral();
      });
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
    this.totalAPagar = this.totalGeneral - this.globalesService.EstandarizarDecimal(this.redondeo.value);

    //sumamos las cantidades
    const cantProductos = this.productosFactura?.reduce((acc, item) => acc + (item.cantidad || 0), 0) || 0;
    const cantServicios = this.serviciosFactura?.reduce((acc, item) => acc + (item.cantidad || 0), 0) || 0;
    this.cantItems = cantProductos + cantServicios;  
  }
  
  ObtenerProcesosVenta(){
    this.miscService.ObtenerProcesosVenta()
      .subscribe(response => {
        this.procesos = response;
      });
  }


  ObtenerLineasTalle(){
    this.miscService.ObtenerLineasTalle()
      .subscribe(response => {
        this.lineasTalles = response;
      });
  }

  ObtenerServicios(){
    this.miscService.ObtenerServicios()
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
          
          //Obtnemos los comprobantes disponibles para el cliente
          this.miscService.ObtenerComprobantes(this.clienteSeleccionado!.idCondicionIva!)
          .subscribe(response => {
            this.comprobantes = response;
            if(this.venta.idTipoComprobante)
              this.formFacturacion.get('tComprobante')?.setValue(this.comprobantes.find(c => c.id == this.venta.idTipoComprobante));
          });
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
    
    this.productosService.BuscarProductos(query)
    .subscribe(response => {
      this.productosFiltrados = response;
    });
  }

  SeleccionarProducto(){
    const seleccionado = this.formProductos.get('producto')?.value;
    this.productoSeleccionado = seleccionado;

    let linea = this.lineasTalles.find(l => l.id === this.productoSeleccionado.talles![0].idLineaTalle);
    if(!linea) return;

    this.tallesProducto = linea.talles!;
  }

  ObtenerCantidad(talle: string, proceso:string) {
    if (!this.productoSeleccionado?.talles) return 0;

    const encontrado = this.productoSeleccionado.talles.find((t: any) => t.talle === talle);

    if(proceso=="stock")
      return encontrado ? encontrado.cantidad : 0;
    else
      return encontrado && encontrado.cantAgregar! > 0 ? encontrado.cantAgregar : 0;
  }

  DefinirCantidadAgregarTalle(talle:string){
    if (!this.productoSeleccionado?.talles) return 0;
    
    let encontrado = this.productoSeleccionado.talles.find((t: any) => t.talle === talle);
    if (encontrado) {
      if(encontrado && encontrado.cantAgregar! >= encontrado.cantidad!) return; //Si la cantidad a agregar es mayor o igual a lo disponible no agregamos

      encontrado.cantAgregar = (encontrado.cantAgregar || 0) + 1;
    }

    return;
  }
  //#endregion

  //#region PRODUCTOS VENTA
  AgregarProducto() {
    if (!this.productoSeleccionado || !this.productoSeleccionado.talles) return;

    // Tomar solo los talles que el usuario seleccionó
    const tallesSeleccionados = this.productoSeleccionado.talles.filter((t: any) => t.cantAgregar > 0);

    tallesSeleccionados.forEach((talleSel: any) => {
      const cantidad = talleSel.cantAgregar;
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

    const input = event.target as HTMLInputElement;
    const value = Number(input.value) || 0;
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
    if(this.formFacturacion.invalid) return;
    if(this.formGenerales.invalid) return;

    this.ArmarObjetoVenta();
    this.venta.factura = factura;

    if(!this.modificando){
      this.ventasService.Agregar(this.venta)
      .subscribe(response => {
        if(response){
          if(!finalizando){
            this.Notificaciones.Success("Venta guardada correctamente");
            this.venta.id = parseInt(response);
            this.venta.hora = new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false });
          }else{
            this.Notificaciones.Success("Venta guardada y facturada correctamente");
            this.router.navigateByUrl("/ventas")
          }          
        }
      });
    }else{
      this.ventasService.Modificar(this.venta)
      .subscribe(response => {
        if(response){

          if(!finalizando){
            this.Notificaciones.Success("Venta actualizada correctamente");
          }else{
            this.Notificaciones.Success("Venta actualizada y facturada correctamente");
            this.router.navigateByUrl("/ventas")
          } 
        }   
      });
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
    this.venta.nroNota = 0;
    this.venta.fecha = this.formGenerales.get('fecha')?.value;
    this.venta.idCliente = this.formGenerales.get('cliente')?.value.id;
    this.venta.cliente = this.formGenerales.get('cliente')?.value.descripcion;

    if(this.formGenerales.get('lista')?.value == "")
      this.venta.idListaPrecio = 1;
    else
      this.venta.idListaPrecio = this.formGenerales.get('lista')?.value.id;

    this.venta.listaPrecio = this.formGenerales.get('lista')?.value.descripcion;
    this.venta.idEmpresa = this.formFacturacion.get('empresa')?.value.id;
    this.venta.empresa = this.formFacturacion.get('empresa')?.value.descripcion;
    this.venta.idTipoComprobante = this.formFacturacion.get('tComprobante')?.value.id;
    this.venta.tipoComprobante = this.formFacturacion.get('tComprobante')?.value.descripcion;
    this.venta.idTipoDescuento = this.formFacturacion.get('tDescuento')?.value.id;
    this.venta.tipoDescuento = this.formFacturacion.get('tDescuento')?.value.descripcion;
    this.venta.descuento = this.formFacturacion.get('descuento')?.value;
    this.venta.codPromocion = 0;
    this.venta.redondeo = this.globalesService.EstandarizarDecimal(this.redondeo.value);
    this.venta.total = this.totalAPagar;
    this.venta.productos = this.productosFactura;
    this.venta.servicios = this.serviciosFactura;
    this.venta.pagos = this.pagosFactura;
  }
}
