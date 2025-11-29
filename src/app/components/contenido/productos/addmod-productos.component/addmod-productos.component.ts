import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FORMS_IMPORTS } from '../../../../imports/forms.import';
import { NavegacionComponent } from '../../../compartidos/navegacion/navegacion.component';
import { AbstractControl, FormArray, FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { MiscService } from '../../../../services/misc.service';
import { ClientesService } from '../../../../services/clientes.service';
import { ProductosService } from '../../../../services/productos.service';
import { GlobalesService } from '../../../../services/globales.service';
import { Cliente } from '../../../../models/Cliente';
import { Color, Genero, LineasTalle, Material, Producto, SubtipoProducto, TalleSeleccionable, Temporada, TipoProducto } from '../../../../models/Producto';
import { NotificacionesService } from '../../../../services/notificaciones.service';
import { ActivatedRoute, Router } from '@angular/router';
import { Tooltip } from "primeng/tooltip";
import { SelectButtonModule } from 'primeng/selectbutton';
import { forkJoin, Observable } from 'rxjs';
import { ConfirmationService } from 'primeng/api';
import { ConfirmPopupModule } from 'primeng/confirmpopup';
import { Dialog } from 'primeng/dialog';
import { AddModClientesComponent } from '../../clientes/addmod-clientes/addmod-clientes.component';

@Component({
  selector: 'app-addmod-productos',
  standalone: true,
  imports: [
    ...FORMS_IMPORTS,
    NavegacionComponent,
    Tooltip,
    SelectButtonModule,
    ConfirmPopupModule,
    Dialog,
    AddModClientesComponent
],
  providers: [ConfirmationService],
  templateUrl: './addmod-productos.component.html',
  styleUrl: './addmod-productos.component.scss',
})
export class AddmodProductosComponent {
  @Output() cerrar = new EventEmitter<boolean>(); //True: si hay que actualizar, False: si no hay que actualizar
  @Input() set productoEditar(value: number | undefined) { //Cliente a editar
    if (value){
      this.ObtenerProducto(value);
    } 
    else this.formulario.reset(); //Si no hay valores reiniciamos el formulario
  }

  producto:Producto;
  desdeRouting:boolean;

  decimal_mask: any;
  formulario: FormGroup;
  modalAddClienteVisible: boolean = false;

  empresas:string[] = ['SUCEDE', 'SERVICIOS'];
  clientes:Cliente[]=[];
  clientesFiltrados:Cliente[]=[];
  temporadas: Temporada[] = [];
  tiposProducto: TipoProducto[] = [];
  subtiposProducto: SubtipoProducto[] = [];
  generos: Genero[] = [];
  materiales: Material[] = [];
  coloresMaterial: Color[] = [];
  coloresSeleccionadosDescriptions: string = '';
  coloresExistentes: number[] = [];
  lineasTalles: LineasTalle[] = [];
  tallesSeleccionables: TalleSeleccionable[] = [];

  constructor(
    private rutaActiva: ActivatedRoute,
    private router:Router,
    private miscService:MiscService,
    private fb: FormBuilder,
    private clientesService:ClientesService,
    private productosService:ProductosService,
    private Globales:GlobalesService,
    private Notificaciones:NotificacionesService,
    private confirmationService: ConfirmationService,
  ){
     this.formulario = new FormGroup({
      empresa: new FormControl(''),
      cliente: new FormControl(''),
      temporada: new FormControl(''),
      producto: new FormControl(''),
      tipo: new FormControl(''),
      genero: new FormControl(''),
      material: new FormControl(''),
      lineaTalle: new FormControl(''),
      codigo: new FormControl('', [Validators.required, Validators.maxLength(30)]),
      nombre: new FormControl('', [Validators.required, Validators.maxLength(100)]),
      moldeleria: new FormControl(''),
      tallesProducto: this.fb.array([])
    });

    //#region VALUE CHANGES
    // Suscripción para cuando cambia cliente
    this.formulario.get('cliente')?.valueChanges.subscribe((value) => {
      setTimeout(() => {
        if(value){
          const clienteId: string = this.clienteControl ? (this.clienteControl.id?.toString() ?? "") : "";
          const cliente: string = this.clienteControl ? (this.clienteControl.nombre?.toString().split(' ')[0] ?? "") : "";
          const tipoAbrev:string = this.tipoControl ? this.tipoControl.abreviatura?.toString() ?? "" : "";
          const subtipoAbrev:string = this.subtipoControl ? this.subtipoControl.abreviatura?.toString() ?? "" : "";

          // Actualiza efectivo sin disparar su valueChanges
          this.formulario.get('codigo')?.setValue(clienteId + "-" + this.clienteControl.id?.toString(), { emitEvent: false });
          this.formulario.get('nombre')?.setValue(cliente + "-" + tipoAbrev + "-" + subtipoAbrev , { emitEvent: false });
        }
        
      }, 10);
    });

    // Suscripción para cuando cambia tipo de producto
    this.formulario.get('producto')?.valueChanges.subscribe((value) => {
      setTimeout(() => {
        if(value){
          const clienteId: string = this.clienteControl ? (this.clienteControl.id?.toString() ?? "") : "";
          const cliente: string = this.clienteControl ? (this.clienteControl.nombre?.toString().split(' ')[0] ?? "") : "";
          const tipoAbrev:string = this.tipoControl ? this.tipoControl.abreviatura?.toString() ?? "" : "";
          const subtipoAbrev:string = this.subtipoControl ? this.subtipoControl.abreviatura?.toString() ?? "" : "";

          // Actualiza efectivo sin disparar su valueChanges
          this.formulario.get('codigo')?.setValue(clienteId + "-" + value.id, { emitEvent: false });
          this.formulario.get('nombre')?.setValue(cliente + "-" + tipoAbrev + "-" + subtipoAbrev , { emitEvent: false });
        }       
      }, 10);
    });

    // Suscripción para cuando cambia subtipo de producto
    this.formulario.get('tipo')?.valueChanges.subscribe((value) => {
      setTimeout(() => {
        if(value){
          const cliente: string = this.clienteControl ? (this.clienteControl.nombre?.toString().split(' ')[0] ?? "") : "";
          const tipoAbrev:string = this.tipoControl ? this.tipoControl.abreviatura?.toString() ?? "" : "";
          const subtipoAbrev:string = this.subtipoControl ? this.subtipoControl.abreviatura?.toString() ?? "" : "";

          // Actualiza efectivo sin disparar su valueChanges
          this.formulario.get('nombre')?.setValue(cliente + "-" + tipoAbrev + "-" + subtipoAbrev , { emitEvent: false });
        }        
      }, 10);
    });
    //#endregion
  }

  ngOnInit(): void {
    const path = this.rutaActiva.snapshot.routeConfig?.path;
    if(path === 'productos/add'){
      this.desdeRouting = true;
    }

    this.miscService.ObtenerLineasTalle()
    .subscribe(response => {
      this.lineasTalles = response;
    });

    this.miscService.ObtenerGeneros()
    .subscribe(response => {
      this.generos = response;
    });

    this.miscService.ObtenerMateriales()
    .subscribe(response => {
      this.materiales = response;
    });

    this.miscService.ObtenerTiposProducto()
    .subscribe(response => {
      this.tiposProducto = response;
    });

    this.miscService.ObtenerSubtiposProducto()
    .subscribe(response => {
      this.subtiposProducto = response;
    });

    this.miscService.ObtenerTemporadas()
    .subscribe(response => {
      this.temporadas = response;
    });

    this.clientesService.SelectorClientes()
    .subscribe(response => {
      this.clientes = response;
    });
  }

  ngAfterViewInit() {
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
  }

  //#region CONTROLES DEL FORMULARIO
  get codigoControl() {return this.formulario.get('codigo');}
  get nombreControl() {return this.formulario.get('nombre');}
  get temporadaControl() {return this.formulario.get('temporada')?.value;}
  get generoControl() {return this.formulario.get('genero')?.value;}
  get clienteControl() {return this.formulario.get('cliente')?.value;}
  get materialControl() {return this.formulario.get('material')?.value;}
  get tipoControl() {return this.formulario.get('producto')?.value;}
  get subtipoControl() {return this.formulario.get('tipo')?.value;}
  get lineaTalleControl() {return this.formulario.get('lineaTalle')?.value;}
  get tallesProductoControl(): FormArray {
    return this.formulario.get('tallesProducto') as FormArray;
  }

  SelectContent(event: FocusEvent) {
    const input = event.target as HTMLInputElement;
    input.select();
  }

  campoInvalido(campo: string): boolean {
    const control = this.formulario.get(campo);
    return !!(control && control.invalid && control.dirty);
  }

  ObtenerProducto(idProducto){
    this.productosService.ObtenerProducto(idProducto)
    .subscribe(response => {
      this.producto = new Producto(response);

      this.formulario.get('empresa')?.setValue(this.producto.empresa);
      this.formulario.get('temporada')?.setValue(this.temporadas.find(t=> t.id == this.producto.temporada?.id) ?? new Temporada());
      this.formulario.get('producto')?.setValue(this.tiposProducto.find(t=> t.id == this.producto.tipo?.id) ?? new TipoProducto());
      this.formulario.get('tipo')?.setValue(this.subtiposProducto.find(t=> t.id == this.producto.subtipo?.id) ?? new SubtipoProducto());
      this.formulario.get('genero')?.setValue(this.generos.find(t=> t.id == this.producto.genero?.id) ?? new Genero());
      this.formulario.get('material')?.setValue(this.producto.material?.id);
      this.MaterialChange();
      this.formulario.get('moldeleria')?.setValue(this.producto.moldeleria);
      this.formulario.get('cliente')?.setValue(this.clientes.find(c=> c.id == this.producto.cliente) ?? new Cliente());
      

      const idLineaTalle = this.producto.talles && this.producto.talles.length > 0 ? this.producto.talles[0].idLineaTalle : null
      this.formulario.get('lineaTalle')?.setValue(this.lineasTalles.find(l=> l.id == idLineaTalle) ?? new LineasTalle());
      this.LineaTalleChange();

      setTimeout(() => {
        this.formulario.get('nombre')?.setValue(this.producto.nombre);
        this.formulario.get('codigo')?.setValue(this.producto.codigo);
      }, 1000);


      //Marcamos los colores relacionados
      this.coloresExistentes = this.producto.relacionados!.map(r => r.color?.id!);
      this.coloresExistentes.push(this.producto.color?.id!); //Agregamos tambien el color del producto actual

      this.coloresMaterial.forEach(c => {
        c.seleccionado = this.coloresExistentes.includes(c.id!);
      });

      //Armamos la descripcion de seleccionados
      this.coloresSeleccionadosDescriptions = this.coloresMaterial
      .filter(c => c.seleccionado)
      .map(c => c.descripcion)
      .join(', ');
      
      this.producto.talles?.forEach(pTalle => {
        const talleSeleccionado = this.tallesSeleccionables.find(t=> t.talle == pTalle.talle);
        if(talleSeleccionado){
          talleSeleccionado.seleccionado = true;
          const indice = this.tallesSeleccionables.indexOf(talleSeleccionado);

          this.tallesProductoControl.push(
            this.ConstruirRow(talleSeleccionado, indice)
          );

          setTimeout(() => {
            const indexInForm = this.tallesProductoControl.controls.findIndex(
              ctrl => ctrl.get('talle')?.value === talleSeleccionado.talle
            );
            if (indexInForm !== -1) {
              this.tallesProductoControl.at(indexInForm).get('id')?.setValue(pTalle.id);
              this.tallesProductoControl.at(indexInForm).get('cantidad')?.setValue(pTalle.cantidad);
              this.tallesProductoControl.at(indexInForm).get('precio')?.setValue(pTalle.precio!.toString().replace('.', ','));
            }
          }, 100);
        }
      });
    });
  }
  //#endregion

  Actualizar(valor:boolean){
    if(valor){
      this.clientesService.SelectorClientes()
      .subscribe(response => {
        this.clientes = response;
      });
    }
      
    this.modalAddClienteVisible = false;
  }


  //#region EVENTOS DE SELECCION
  MaterialChange(){
    const materialSeleccionado = this.materiales.find(m=> m.id == this.materialControl);
    this.coloresMaterial = materialSeleccionado?.colores!;
  }

  LineaTalleChange(){
    const lineaTalleSeleccionada = this.lineasTalles.find(l=> l.id == this.lineaTalleControl.id);
    this.formulario.setControl('tallesProducto', this.fb.array([]));
    this.tallesSeleccionables = (lineaTalleSeleccionada?.talles ?? []).map(talle => {
                                  return new TalleSeleccionable(
                                    {talle, seleccionado:false}
                                  )
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

  SeleccionarColor(event: Event, idColor: number) {
    const color = this.coloresMaterial.find(c => c.id === idColor) ?? new Color();

    if(this.coloresExistentes.length > 0){
      if(this.producto.color?.id == idColor){
        this.Notificaciones.Warn("No puedes quitar el color del producto actual.")
        return;
      }

      if(color.seleccionado){
        this.confirmationService.confirm({
          target: event.target as EventTarget, 
          message: '¿Seguro que deseas desmarcar este color? \nSe eliminará el producto relacionado a dicho color',
          icon: 'pi pi-exclamation-triangle',
          acceptLabel: 'Sí',
          rejectLabel: 'No',
          rejectButtonProps: {
              severity: 'secondary',
              outlined: true
          },
          accept: () => {
            const productoEliminar = this.producto.relacionados.find(p=> p.color!.id === idColor);
            this.productosService.Eliminar(productoEliminar?.idProducto!)
            .subscribe(response => {
              if(response == 'OK'){
                color.seleccionado = false;
                this.Notificaciones.Success("Color quitado correctamente");
              }else{
                this.Notificaciones.Warn("Ocurrió un error al intentar quitar el color.")
              }
            });

          }
        });
      }else{
        color.seleccionado = true;
      }
    }else{
      color.seleccionado = !color?.seleccionado;
    }

    this.coloresSeleccionadosDescriptions = this.coloresMaterial
      .filter(c => c.seleccionado)
      .map(c => c.descripcion)
      .join(', ');
  }

  SeleccionarTalle(indice:number) {
    this.tallesSeleccionables[indice].seleccionado = !this.tallesSeleccionables[indice].seleccionado;

    if(this.tallesSeleccionables[indice].seleccionado){
      this.tallesProductoControl.push(
        this.ConstruirRow(this.tallesSeleccionables[indice], indice)
      );
    }else{
      // buscar índice real dentro del FormArray
      const indexInForm = this.tallesProductoControl.controls.findIndex(
        ctrl => ctrl.get('talle')?.value === this.tallesSeleccionables[indice].talle
      );

      if (indexInForm !== -1) {
        this.tallesProductoControl.removeAt(indexInForm);
      }
    }
  }
  
  ConstruirRow(item: any, indice:number): FormGroup {
    return this.fb.group({
      id: 0,
      ubicacion: indice,
      talle: [item.talle],
      precio: [''],
      idLineaTalle: [this.lineaTalleControl.id]
    });
  }
  //#endregion

  Guardar(){
    this.markFormTouched(this.formulario);
    if(this.formulario.invalid) return;

    if(!this.producto){
      this.producto = new Producto();
    }

    this.tallesProductoControl.value.forEach(element => {
      element.precio = this.Globales.EstandarizarDecimal(element.precio.toString());
    });

    this.producto.empresa = this.formulario.get('empresa')?.value;
    this.producto.cliente = this.clienteControl.id;
    this.producto.temporada = this.temporadaControl.id;
    this.producto.tipo = this.tipoControl.id;
    this.producto.subtipo = this.subtipoControl.id;
    this.producto.genero = this.generoControl.id;
    this.producto.material = this.materialControl;
    this.producto.codigo = this.formulario.get('codigo')?.value;
    this.producto.nombre = this.formulario.get('nombre')?.value;
    this.producto.moldeleria = this.formulario.get('moldeleria')?.value == '' ? 0 : this.formulario.get('moldeleria')?.value;
    this.producto.talles = this.tallesProductoControl.value;
    
    let operaciones$: Observable<any>[] = [];
        
    //Agregando
    if(this.producto.id == 0){
       //Obtenemos los relacionados
      const coloresSeleccionados = this.coloresMaterial.filter(c => c.seleccionado);

      operaciones$ = coloresSeleccionados.map(color => {
        const productoAInsertar = { ...this.producto };

        productoAInsertar.color = color;
        productoAInsertar.proceso = 1;
        return this.productosService.Agregar(productoAInsertar);      
      });
    }
    //Modificando
    else{
      const idsModificar = this.producto.relacionados!.map(r => r.idProducto);
      idsModificar.push(this.producto.id);

      idsModificar.forEach(idProd => {
        let productoAModificar = { ...this.producto };
        productoAModificar.id = idProd!;

        operaciones$.push(this.productosService.Modificar(productoAModificar))
      });
    }
   

    forkJoin(operaciones$).subscribe(respuestas => {
      const ok = respuestas.filter(r => r === 'OK').length;

      if (ok === respuestas.length) {
        this.Notificaciones.Success("Los productos fueron procesados correctamente");
      } else {
        this.Notificaciones.Warn(`Solo ${ok} de ${respuestas.length} productos se procesaron correctamente.`);
      }

      if(this.desdeRouting)
        this.router.navigateByUrl('/productos');
      else
        this.CerrarModal(true);    
    });
  }

  CerrarModal(actualizar:boolean) {
    this.cerrar.emit(actualizar);
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
