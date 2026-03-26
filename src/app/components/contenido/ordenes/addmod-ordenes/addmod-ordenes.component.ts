import { Component, OnInit, ViewChild } from '@angular/core';
import { AbstractControl, FormArray, FormControl, FormGroup, Validators } from '@angular/forms';
import { FORMS_IMPORTS } from '../../../../imports/forms.import';
import { ActivatedRoute, Router } from '@angular/router';
import { TextareaModule } from 'primeng/textarea';
import { DatePickerModule } from 'primeng/datepicker';
import { Table, TableModule } from 'primeng/table';
import { ColorDisponible, LineasTalle, Producto, ProductoBusqueda } from '../../../../models/Producto';
import { ProductosService } from '../../../../services/productos.service';
import { NotificacionesService } from '../../../../services/notificaciones.service';
import { ProductoOrden } from '../../../../models/ProductoOrden';
import { MiscService } from '../../../../services/misc.service';
import { BadgeModule } from 'primeng/badge';
import { DividerModule } from 'primeng/divider';
import { OrdenIngreso } from '../../../../models/OrdenIngreso';
import { OrdenIngresoService } from '../../../../services/orden-ingreso.service';
import { UsuariosService } from '../../../../services/usuarios.service';
import { TagModule } from 'primeng/tag';
import { ConfirmationService } from 'primeng/api';
import { ConfirmPopupModule } from 'primeng/confirmpopup';
import { Tooltip } from 'primeng/tooltip';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ProductoImprimir } from '../../../../models/ProductoImprimir';
import { EtiquetasService } from '../../../../services/etiquetas.service';


interface TalleUI {
  idTalle: number | null;
  talle: string;
  disponible: boolean;
  cantidad: number;
  cantAgregar: number;
  linea: number;
}

@Component({
  selector: 'app-addmod-ordenes',
  standalone: true,
  imports: [
    ...FORMS_IMPORTS,
    TextareaModule,
    DatePickerModule,
    TableModule,
    BadgeModule,
    DividerModule,
    TagModule,
    ConfirmPopupModule,
    ConfirmDialogModule,
    Tooltip
  ],
  templateUrl: './addmod-ordenes.component.html',
  styleUrls: ['./addmod-ordenes.component.scss'],
  providers: [ConfirmationService],
})
export class AddmodOrdenesComponent implements OnInit {
  proveedores = [
    {id: 1, descripcion: 'SUCEDE SRL'},
  ];
  
  formulario:FormGroup;
  formProductos:FormGroup;
  productosFiltrados:ProductoBusqueda[]=[];
  resultadoBusqueda:Producto[]=[];
  variantesDisponibles:Producto[]=[];
  coloresDisponibles: ColorDisponible[] = [];

  productosOrden:ProductoOrden[] = []
  productoSeleccionado:Producto = new Producto();
  tallesBase:string[] = ["X","X","X","X","X","X","X","X","X","X"]
  tallesProducto: TalleUI[] = []; 

  lineasTalles: LineasTalle[] = [];
  columnasFijas = Array(10).fill(0);
  @ViewChild('tablaProductos') tablaProductos: Table | undefined;

  ordenIngreso:OrdenIngreso = new OrdenIngreso();

  constructor(
    private router:Router,
    private rutaActiva: ActivatedRoute,
    private productosService:ProductosService,
    private miscService:MiscService,
    private ordenesIngresoService:OrdenIngresoService,
    private Notificaciones: NotificacionesService,
    private usuariosService: UsuariosService,
    private confirmationService: ConfirmationService,
    private etiquetasService: EtiquetasService
  ) { 
    this.formulario = new FormGroup({
      proveedor: new FormControl('', [Validators.required]),
      corte: new FormControl('', [Validators.required]),
      fecha: new FormControl('', [Validators.required]),
      observaciones: new FormControl(''),
    });

    this.formProductos = new FormGroup({
      producto: new FormControl([null]),
      colorSeleccionado: new FormControl([null]),
    });
  }

  ngOnInit() {
    this.rutaActiva.paramMap.subscribe(params => {
      const id = Number(params.get('idOrden'));

      if (id && id !== 0) {
        this.ordenIngreso.id = id;
        this.ObtenerOrdenIngreso();
      } else {
        this.ordenIngreso = new OrdenIngreso();
        this.ordenIngreso.id = 0;
      } 
    });

    this.ObtenerLineasTalle();
  }

  ngAfterViewInit(){
    setTimeout(() => {
      this.formulario.get('fecha')?.setValue(new Date());
      this.formulario.get('proveedor')?.setValue(this.proveedores[0].id);
    }, 0);
  }

  ObtenerLineasTalle(){
    this.miscService.ObtenerLineasTalle()
      .subscribe(response => {
        this.lineasTalles = response;
        this.lineasTalles = this.lineasTalles.filter(l => l.mostrar == 1)
      });
  }

  ObtenerOrdenIngreso(){
    this.ordenesIngresoService.ObtenerOrdenIngreso(this.ordenIngreso.id!)
      .subscribe(response => {
        this.ordenIngreso = response;
        console.log(this.ordenIngreso)
        this.formulario.get('proveedor')?.setValue(this.ordenIngreso.idProveedor);
        this.formulario.get('fecha')?.setValue(new Date(this.ordenIngreso.fecha ?? ''));
        this.formulario.get('observaciones')?.setValue(this.ordenIngreso.observaciones);
        this.formulario.get('corte')?.setValue(this.ordenIngreso.corte);
        this.productosOrden = this.ordenIngreso.productos;
      });
  }

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
        this.resultadoBusqueda = response;
        this.productosFiltrados = this.AgruparProductos(this.resultadoBusqueda);
      });
    
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

    const tallesProductoMap = new Map(
      this.productoSeleccionado.talles!.map(t => [t.talle, t])
    );

    this.tallesProducto = linea.talles!.map((talleStr: string) => {
      const talleData = tallesProductoMap.get(talleStr);

      return {
        idTalle: talleData?.idTalle ?? null,
        talle: talleStr,
        disponible: !!talleData,
        cantidad: talleData?.cantidad ?? 0,
        precio: talleData?.precio ?? 0,
        cantAgregar: 0,
        linea: talleData?.idLineaTalle!
      };
    });
  }

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
    producto[field] = value;

    this.AgregarTalleSeleccionado(producto, talleReal);
    producto.cantidad = Array.from({ length: 10 }, (_, i) => producto[`t${i + 1}`] || 0).reduce((a, b) => a + b, 0);  
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

  ObtenerTalleReal(tx: string, objeto: any): string | null {
    const talles = objeto.tallesSeleccionados.split(',').map(t => t.trim());
    const clavesConValor = Object.keys(objeto)
    .filter(k => /^t\d+$/.test(k) && objeto[k] != null && objeto[k] !== undefined)
    .sort((a,b) => Number(a.replace('t','')) - Number(b.replace('t','')));
    const index = clavesConValor.indexOf(tx);
    return talles[index] ?? null;
  }


  async AgregarProducto() {
    if (this.tablaProductos) this.tablaProductos.editingCell = null;

      let tallesDisponibles:TalleUI[] = [];

      tallesDisponibles = this.tallesProducto!.filter((t: any) => t.disponible);
      if(tallesDisponibles.length === 0) {
        this.Notificaciones.Warn("No hay talles disponibles para el producto.");
        return;
      }

      tallesDisponibles.forEach((talleSel: TalleUI) => {
        const cantidad = talleSel.cantAgregar ?? 0;
                
        // Ver si ya existe ese producto con ese precio en el detalle
        let existente = this.productosOrden.find((p: ProductoOrden) => p.idProducto === this.productoSeleccionado.id);

        if (existente) {
          // Sumar cantidad y total
          existente.cantidad = (existente.cantidad ?? 0) + cantidad;
         
          // Asignar cantidad a tX
          this.AsignarTalle(existente, talleSel.talle, cantidad, talleSel.linea);

          // Agregar el talle si no estaba ya en tallesSeleccionados
          const tallesExistentes = existente.tallesSeleccionados ? existente.tallesSeleccionados.split(",").map(t => t.trim()) : [];
          if (!tallesExistentes.includes(talleSel.talle)) {
            tallesExistentes.push(talleSel.talle);
            existente.tallesSeleccionados = tallesExistentes.join(", ");
          }
        } else {
          // Crear nueva línea de producto
          const nuevo = new ProductoOrden({
            idProducto: this.productoSeleccionado.id,
            codProducto: this.productoSeleccionado.codigo,
            nomProducto: this.productoSeleccionado.nombre,
            topeDescuento: this.productoSeleccionado.topeDescuento,
            talles: this.productoSeleccionado.talles,
            idColor: this.productoSeleccionado.color!.id,
            color: this.productoSeleccionado.color!.descripcion,
            hexa: this.productoSeleccionado.color!.hexa,
            idLineaTalle: talleSel.linea,
            cantidad: cantidad,
            tallesSeleccionados: talleSel.talle,
            estado: "Pendiente"
          });

          // Asignar cantidad a tX
          this.AsignarTalle(nuevo, talleSel.talle, cantidad, talleSel.linea);
          this.productosOrden.push(nuevo);

        }

    });
   
    this.productoSeleccionado = new Producto();
    this.formProductos.reset();
    setTimeout(() => {
        if (this.tablaProductos) this.tablaProductos.editingCell = null;
        //this.inputCodigo.nativeElement.focus();
    }, 0);
  }

  AsignarTalle(productoOrden: ProductoOrden, talle: string, cantidad: number, idLineaTalle: number) {
    const linea = this.lineasTalles.find(l => l.id === idLineaTalle);
    if (!linea) return;

    const index = linea.talles!.indexOf(talle);
    if (index === -1) return;

    const campo = `t${index + 1}` as keyof ProductoOrden;
    (productoOrden as any)[campo] = ((productoOrden as any)[campo] ?? 0) + cantidad;
  }

  EliminarProducto(event: Event, indice:number){
    const producto = this.productosOrden[indice];
    if(producto.id == 0 || producto.id == undefined){
      if(indice != -1) this.productosOrden.splice(indice, 1);
    }else{
      this.productosOrden[indice].estado = "Eliminado";
    }
    
    this.Notificaciones.Success("Producto quitado correctamente");
  }

  GetSeverity(estado: string): 'danger' | 'warn' | 'success' {
    const value = estado.toLowerCase();
    if (value === 'eliminado') {
      return 'danger';
    }
    if (value === 'pendiente') {
      return 'warn';
    }
    if (value === 'Ingresado') {
      return 'success';
    }

    return 'success';
  }


  MarcarComoIngresado(event: Event, idProducto:number, ingreso:boolean){
    this.confirmationService.confirm({
      target: event.target as EventTarget, 
      message: ingreso ? "¿Marcar como mercaderia ingresada?" : '¿Revertir ingreso de mercaderia?',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Sí',
      rejectLabel: 'No',
      rejectButtonProps: {
          severity: 'secondary',
          outlined: true
      },
      accept: () => {
        //Quitamos del array
        const indice = this.productosOrden.findIndex(p => p.idProducto == idProducto);
        if(indice != -1) this.productosOrden[indice].estado = ingreso ? "Ingresado" : "Pendiente";
        this.Notificaciones.Success("Estado actualizado correctamente");
      }
    });
  }
  //#endregion



  campoInvalido(campo: string): boolean {
    const control = this.formulario.get(campo);
    return !!(control && control.invalid && control.dirty);
  }
  SelectContent(event: FocusEvent) {
    const input = event.target as HTMLInputElement;
    input.select();
  }

  Finalizar(){
    this.markFormTouched(this.formulario);
    if(!this.formulario.valid) return;

    if(this.productosOrden.length == 0){
      this.Notificaciones.Warn("Debe agregar al menos un producto.");
      return
    }

    this.confirmationService.confirm({
      key: 'confirmarDialog',
      message: '¿Estas seguro que deseas finalizar esta orden de ingreso?.<br> Se van a marcar como "ingresado" todos los productos',
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
        this.productosOrden.forEach(p => p.estado = "Ingresado");
        this.Guardar(true);
      },
      reject: () => {},
    });
  }

  Guardar(finalizando:boolean){
    this.markFormTouched(this.formulario);
    if(!this.formulario.valid) return;

    this.ordenIngreso.idProveedor = this.formulario.get('proveedor')?.value;
    this.ordenIngreso.fecha = this.formulario.get('fecha')?.value;
    this.ordenIngreso.observaciones = this.formulario.get('observaciones')?.value;
    this.ordenIngreso.corte = this.formulario.get('corte')?.value;
    this.ordenIngreso.usuario = this.usuariosService.GetUsuarioSesion()!;
    this.ordenIngreso.productos = this.productosOrden;

    if(finalizando)
      this.ordenIngreso.estado = "Finalizada";
    else
      this.ordenIngreso.estado = this.CalcularEstado();

    if(this.ordenIngreso.id == 0){
      this.ordenesIngresoService.Agregar(this.ordenIngreso)
      .subscribe(response => {
        if(response=='OK'){
          
          if(finalizando)
            this.Notificaciones.Success("Orden de ingreso creada y finalizada correctamente");
          else
            this.Notificaciones.Success("Orden de ingreso creada correctamente");

          this.router.navigateByUrl("/ordenes-ingreso");
        }else{
          this.Notificaciones.Warn(response);
        }
      });
    }else{
      this.ordenesIngresoService.Modificar(this.ordenIngreso)
      .subscribe(response => {
        if(response=='OK'){

          if(finalizando)
            this.Notificaciones.Success("Orden de ingreso modificada y finalizada correctamente");
          else
            this.Notificaciones.Success("Orden de ingreso modificada correctamente");

          this.router.navigateByUrl("/ordenes-ingreso");
        }else{
          this.Notificaciones.Warn(response);
        }
      });
    }
  }

  CalcularEstado(): "Pendiente" | "Nueva" {
    const hayIngresados = this.productosOrden.some(
      p => p.estado === "Ingresado"
    );

    return hayIngresados ? "Pendiente" : "Nueva";
  }

  Cerrar(){
    this.router.navigateByUrl("/ordenes-ingreso")
  }

  Etiquetas(){
    if(this.productosOrden.length == 0){
      this.Notificaciones.Warn('Seleccione al menos un producto.');
      return;
    }

    const resultado: ProductoImprimir[] = [];
    this.productosOrden.forEach((prod) => {
      const cantidadesValidas = Array.from({ length: 10 }, (_, i) =>
        prod[`t${i + 1}` as keyof ProductoOrden] as number | null
      ).filter(v => v != null);

      prod.codigosBarra.forEach((item: any, index: number) => {
        const cantidad = cantidadesValidas[index];

        if (!cantidad || cantidad <= 0) return;

        resultado.push(
          ...Array.from({ length: cantidad }, () => ({
            codigo: item.codigo_barra,
            nombre: prod.nomProducto,
            color: prod.color,
            talle: item.talle
          }))
        );
      });
    });

    this.etiquetasService.GenerarEtiquetas(resultado);
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
