import { Component } from '@angular/core';
import { FORMS_IMPORTS } from '../../../../imports/forms.import';
import { NavegacionComponent } from '../../../compartidos/navegacion/navegacion.component';
import { AccordionModule } from 'primeng/accordion';
import { TableModule } from 'primeng/table';
import { DatePickerModule } from 'primeng/datepicker';
import { FormControl, FormGroup } from '@angular/forms';
import { Cliente } from '../../../../models/Cliente';
import { ClientesService } from '../../../../services/clientes.service';
import { LineasTalle, Producto } from '../../../../models/Producto';
import { ProductosService } from '../../../../services/productos.service';
import { MiscService } from '../../../../services/misc.service';
import { BadgeModule } from 'primeng/badge';
import { OverlayBadgeModule } from 'primeng/overlaybadge';
import { ProductosFactura, ServiciosFactura } from '../../../../models/Factura';
import { ConfirmPopupModule } from 'primeng/confirmpopup';
import { ConfirmationService } from 'primeng/api';
import { NotificacionesService } from '../../../../services/notificaciones.service';
import { Servicio } from '../../../../models/Servicio';
import { GlobalesService } from '../../../../services/globales.service';

@Component({
  selector: 'app-facturar',
  standalone: true,
  imports: [
    ...FORMS_IMPORTS,
    NavegacionComponent,
    AccordionModule,
    DatePickerModule,
    TableModule,
    BadgeModule,
    OverlayBadgeModule,
    ConfirmPopupModule
  ],
  providers: [ConfirmationService],
  templateUrl: './facturar.component.html',
  styleUrl: './facturar.component.scss',
})
export class FacturarComponent {
  decimal_mask: any;

  //PANTALLA 1
  formGenerales:FormGroup;
  procesos = [
    {id: 1, descripcion: 'FACTURA'},
    {id: 2, descripcion: 'COTIZACION'},
    {id: 3, descripcion: 'SHOWROOM'},
    {id: 4, descripcion: 'DIFUSION'},
    {id: 5, descripcion: 'CON NOTA EMPAQUE'},
  ];

  listaPrecios = [
    {id: 1, descripcion: 'CONSUMIDOR FINAL'},
    {id: 2, descripcion: 'LISTA 3'},
    {id: 3, descripcion: 'LISTA 4'},
    {id: 4, descripcion: 'LISTA 5'}
  ];

  clienteSeleccionado:Cliente
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
  redondeo:FormControl = new FormControl('');

  constructor(
    private clientesService:ClientesService,
    private productosService:ProductosService,
    private miscService:MiscService,
    private confirmationService: ConfirmationService,
    private Notificaciones: NotificacionesService,
    private globalesService:GlobalesService
  ){
    this.formGenerales = new FormGroup({
      proceso: new FormControl(''),
      nroNota: new FormControl({ value: '', disabled: true }),
      fecha: new FormControl(),
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
  }

  ngOnInit(): void {
    this.ObtenerClientes();
    this.ObtenerLineasTalle();
    this.ObtenerServicios();
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
    },0);

    //DEPENDIENDO EL PROCESO HABILITAMOS NOTA DE EMPAQUE
    this.formGenerales.get('proceso')?.valueChanges.subscribe((valor) => {
    const nroNotaControl = this.formGenerales.get('nroNota');
      if (valor.id != 5) {
        nroNotaControl?.disable({ emitEvent: false });
      } else {
        nroNotaControl?.enable({ emitEvent: false });
      }
    });
  }

  //#region CLIENTES
  ObtenerClientes(){
    this.clientesService.SelectorClientes()
      .subscribe(response => {
        this.clientes = response;
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
        });
  }

   NuevoCliente() { 
    // this.dialogConfig.width = "100wv";
    // let cliente = new Cliente();
    // cliente.id = 0;
    // this.dialogConfig.data = {cliente};
    // this.dialog.open(AddmodClientesComponent, this.dialogConfig)
    //         .afterClosed()
    //         .subscribe((actualizar:boolean) => {
    //           if (actualizar){
    //             this.ObtenerClientes();
    //           }
    //         });
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
        this.Notificaciones.Success("Servicio quitado correctamente");
      }
    });
  }
  //#endregion


}
