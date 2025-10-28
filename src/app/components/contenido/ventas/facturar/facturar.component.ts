import { Component } from '@angular/core';
import { FORMS_IMPORTS } from '../../../../imports/forms.import';
import { NavegacionComponent } from '../../../compartidos/navegacion/navegacion.component';
import { AccordionModule } from 'primeng/accordion';
import { TableModule } from 'primeng/table';
import { DatePickerModule } from 'primeng/datepicker';
import { FormControl, FormGroup } from '@angular/forms';
import { Cliente } from '../../../../models/Cliente';
import { ClientesService } from '../../../../services/clientes.service';
import { Producto, TalleSeleccionable } from '../../../../models/Producto';
import { ProductosService } from '../../../../services/productos.service';
import { MiscService } from '../../../../services/misc.service';
import { BadgeModule } from 'primeng/badge';
import { OverlayBadgeModule } from 'primeng/overlaybadge';
import { ProductosFactura } from '../../../../models/Factura';

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
    OverlayBadgeModule
  ],
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

  constructor(
    private clientesService:ClientesService,
    private productosService:ProductosService,
    private miscService:MiscService
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
  }

  ngOnInit(): void {
    this.ObtenerClientes();
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

    if(this.productoSeleccionado.talles?.length){
      this.miscService.ObtenerLineaDeTalle(this.productoSeleccionado.talles![0].idLineaTalle!)
      .subscribe(response => {
        this.tallesProducto = response.talles;
        console.log(response)
      });
    }
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
  
  GenerarProductoFactura() {
    const productosFactura: ProductosFactura[] = [];

    // Agrupar talles por precio unitario
    const gruposPorPrecio = new Map<number, any[]>();

    for (const t of this.productoSeleccionado.talles!) {
      if (!gruposPorPrecio.has(t.precio!)) {
        gruposPorPrecio.set(t.precio!, []);
      }
      gruposPorPrecio.get(t.precio!)!.push(t);
    }

    // Crear un ProductoFactura por cada grupo de precio
    gruposPorPrecio.forEach((talles, precio) => {
      const nuevo = new ProductosFactura({
        idProducto: this.productoSeleccionado.id,
        codProducto: this.productoSeleccionado.codigo,
        producto: this.productoSeleccionado.nombre,
        cantidad: talles.reduce((sum, t) => sum + t.cantAgregar, 0),
        unitario: precio,
        total: precio * talles.reduce((sum, t) => sum + t.cantAgregar, 0),
      });

      // Asignar talles dinámicamente
      talles.forEach((t, index) => {
        const prop = `t${index + 1}` as keyof ProductosFactura;
        (nuevo as any)[prop] = t.cantAgregar;
      });

      this.productosFactura.push(nuevo);
    });

    //return productosFactura;
  }

  // AgregarProductoAlCarrito() {
  //   // Generamos los ProductosFactura según los talles seleccionados
  //   const nuevos = this.GenerarProductoFactura();

  //   nuevos.forEach(nuevo => {
  //     // Buscar si ya existe ese producto con el mismo precio
  //     const existente = this.carrito.find(p =>
  //       p.idProducto === nuevo.idProducto && p.unitario === nuevo.unitario
  //     );

  //     if (existente) {
  //       // Sumar cantidad y total
  //       existente.cantidad = (existente.cantidad ?? 0) + (nuevo.cantidad ?? 0);
  //       existente.total = (existente.unitario ?? 0) * (existente.cantidad ?? 0);

  //       // Unir talles (evitando duplicados)
  //       const tallesExistentes = existente.obs ? existente.obs.split(',').map(t => t.trim()) : [];
  //       const tallesNuevos = nuevo.obs ? nuevo.obs.split(',').map(t => t.trim()) : [];
  //       const tallesFusionados = Array.from(new Set([...tallesExistentes, ...tallesNuevos]));
  //       existente.obs = tallesFusionados.join(', ');

  //       // Opcional: sumar cantidades por talle (si usás t1, t2, etc.)
  //       for (let i = 1; i <= 10; i++) {
  //         const prop = `t${i}` as keyof ProductosFactura;
  //         existente[prop] = ((existente[prop] ?? 0) as number) + ((nuevo[prop] ?? 0) as number);
  //       }
  //     } else {
  //       // Si no existe, agregar nuevo producto
  //       this.carrito.push(nuevo);
  //     }
  //   });
  // }

  //#endregion
}
