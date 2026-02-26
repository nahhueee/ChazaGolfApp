import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FORMS_IMPORTS } from '../../../../imports/forms.import';
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
import { firstValueFrom, forkJoin, Observable } from 'rxjs';
import { ConfirmationService } from 'primeng/api';
import { ConfirmPopupModule } from 'primeng/confirmpopup';
import { Dialog } from 'primeng/dialog';
import { AddModClientesComponent } from '../../clientes/addmod-clientes/addmod-clientes.component';
import { ListboxModule } from 'primeng/listbox';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { Talle } from '../../../../models/Talle';

@Component({
  selector: 'app-addmod-productos',
  standalone: true,
  imports: [
    ...FORMS_IMPORTS,
    //Tooltip,
    SelectButtonModule,
    ConfirmPopupModule,
    ConfirmDialogModule,
    Dialog,
    AddModClientesComponent,
    ListboxModule    
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

  empresas:any[] = [{id:70, descripcion:'SUCEDE'}];
  clientes:Cliente[]=[];
  clientesFiltrados:Cliente[]=[];
  temporadas: Temporada[] = [];
  tiposProducto: TipoProducto[] = [];
  subtiposProducto: SubtipoProducto[] = [];
  generos: Genero[] = [];
  materiales: Material[] = [];
  coloresMaterial: Color[] = [];
  previousValue: any[] = [];

  //coloresSeleccionadosDescriptions: string = '';
  coloresExistentes: number[] = [];
  lineasTalles: LineasTalle[] = [];
  tallesSeleccionables: TalleSeleccionable[] = [];
  coloresSeleccionados: FormControl = new FormControl();

  talles:Talle[]=[];

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
      empresa: new FormControl(70),
      cliente: new FormControl(''),
      temporada: new FormControl(''),
      producto: new FormControl(''),
      tipo: new FormControl(''),
      genero: new FormControl(''),
      material: new FormControl(''),
      lineaTalle: new FormControl(''),
      codigo: new FormControl('', [Validators.required, Validators.maxLength(4)]),
      nombre: new FormControl('', [Validators.required, Validators.maxLength(100)]),
      moldeleria: new FormControl(''),
      topeDescuento: new FormControl(''),
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
          //this.formulario.get('codigo')?.setValue(clienteId + "-" + this.clienteControl.id?.toString(), { emitEvent: false });
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
          //this.formulario.get('codigo')?.setValue(clienteId + "-" + value.id, { emitEvent: false });
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
      this.formulario.get('material')?.setValue(this.materiales[0].id);
      this.MaterialChange();
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

    this.miscService.ObtenerColores()
    .subscribe(response => {
      this.coloresMaterial = response;
    });

    this.miscService.ObtenerTalles()
    .subscribe(response => {
      this.talles = response;
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
      this.formulario.get('topeDescuento')?.setValue(this.producto.topeDescuento?.toString().replace('.', ','));
      
      const clienteSeleccionado = this.clientes.find(c=> c.id == this.producto.cliente);
      if(clienteSeleccionado)
        this.formulario.get('cliente')?.setValue(clienteSeleccionado);
      

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

      const seleccionados = this.coloresMaterial.filter(color =>
        this.coloresExistentes.includes(color.id!)
      );

      this.coloresSeleccionados.setValue(seleccionados);
      this.previousValue = [...(this.coloresSeleccionados.value || [])];

      // this.coloresMaterial.forEach(c => {
      //   c.seleccionado = this.coloresExistentes.includes(c.id!);
      // });

      //Armamos la descripcion de seleccionados
      // this.coloresSeleccionadosDescriptions = this.coloresMaterial
      // .filter(c => c.seleccionado)
      // .map(c => c.descripcion)
      // .join(', ');
      
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
    //const materialSeleccionado = this.materiales.find(m=> m.id == this.materialControl);
    //this.coloresMaterial = materialSeleccionado?.colores!;
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

  SeleccionarColor(event: any) {
    const current = event.value || [];
    const removed = this.previousValue.filter(
      prev => !current.some(c => c.id === prev.id)
    );

    // Si no se removió nada → solo actualizar previous
    if (removed.length === 0) {
      this.previousValue = [...current];
      return;
    }

    const colorRemovido = removed[0];
    //const color = this.coloresMaterial.find(c => c.id === ) ?? new Color();

    if(this.coloresExistentes.length > 0){
      if(this.producto.color?.id == colorRemovido.id){
        this.Notificaciones.Warn("No puedes quitar el color del producto actual.");
        this.coloresSeleccionados.setValue(this.previousValue);
        return;
      }

      const fuePersistido = this.coloresExistentes.includes(colorRemovido.id);
      if(fuePersistido){
        this.confirmationService.confirm({
            key: 'borrarColor',
            message: '¿Seguro que deseas desmarcar este color? \nSe eliminará el producto relacionado a dicho color',
            header: 'Confirmación',
            closable: true,
            closeOnEscape: true,
            icon: 'pi pi-exclamation-triangle',
            rejectButtonProps: {
                label: 'No',
                severity: 'secondary',
                outlined: true,
            },
            acceptButtonProps: {
                label: 'Si',
            },
            accept: () => {
              const productoEliminar = this.producto.relacionados.find(p=> p.color!.id === colorRemovido.id);
              this.productosService.Eliminar(productoEliminar?.idProducto!)
              .subscribe(response => {
                if(response == 'OK'){
                  this.previousValue = [...current];
                  this.Notificaciones.Success("Color quitado correctamente");
                  return;
                }else{
                  this.Notificaciones.Warn("Ocurrió un error al intentar quitar el color.");
                  this.coloresSeleccionados.setValue(this.previousValue);
                  return;
                }
              });
            },
            reject: () => {
              this.coloresSeleccionados.setValue(this.previousValue);
              return;
            },
          });
        }
    }else{
      this.previousValue = [...current];
    }


      //if(colorRemovido.seleccionado){
        // this.confirmationService.confirm({
        //   target: event.target as EventTarget, 
        //   message: '¿Seguro que deseas desmarcar este color? \nSe eliminará el producto relacionado a dicho color',
        //   icon: 'pi pi-exclamation-triangle',
        //   acceptLabel: 'Sí',
        //   rejectLabel: 'No',
        //   rejectButtonProps: {
        //       severity: 'secondary',
        //       outlined: true
        //   },
        //   accept: () => {
        //     const productoEliminar = this.producto.relacionados.find(p=> p.color!.id === idColor);
        //     this.productosService.Eliminar(productoEliminar?.idProducto!)
        //     .subscribe(response => {
        //       if(response == 'OK'){
        //         color.seleccionado = false;
        //         this.Notificaciones.Success("Color quitado correctamente");
        //       }else{
        //         this.Notificaciones.Warn("Ocurrió un error al intentar quitar el color.")
        //       }
        //     });

        //   }
        // });
      // }else{
      //   color.seleccionado = true;
      // }
    //}else{
      //color.seleccionado = !color?.seleccionado;
    

    // this.coloresSeleccionadosDescriptions = this.coloresMaterial
    //   .filter(c => c.seleccionado)
    //   .map(c => c.descripcion)
    //   .join(', ');
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
      cantidad: [''],
      idLineaTalle: [this.lineaTalleControl.id]
    });
  }

  CopiarPrecioPrimerTalle() {
    const formArray = this.tallesProductoControl;
    if (!formArray.length) return;

    const precioBase = formArray.at(0).get('precio')?.value;
    if (!precioBase) return;

    formArray.controls.forEach((group, index) => {
      if (index !== 0) {
        group.get('precio')?.setValue(precioBase);
      }
    });

  }
  //#endregion

  async Guardar(){
    this.markFormTouched(this.formulario);
    if(this.formulario.invalid) return;

    // const codigoExiste = await firstValueFrom(this.productosService.ValidarCodigo(this.formulario.get('codigo')?.value))
    // if(codigoExiste){
    //   this.Notificaciones.Warn("Ya existe un producto con este código.");

    // }

    if(!this.producto){
      this.producto = new Producto();
    }

    this.tallesProductoControl.value.forEach(element => {
      element.precio = this.Globales.EstandarizarDecimal(element.precio.toString());
    });

    if(this.clienteControl) this.producto.cliente = this.clienteControl.id;
    if(this.temporadaControl) this.producto.temporada = this.temporadaControl.id;
    if(this.tipoControl) this.producto.tipo = this.tipoControl.id;
    if(this.subtipoControl) this.producto.subtipo = this.subtipoControl.id;
    if(this.generoControl) this.producto.genero = this.generoControl.id;
    if(this.materialControl) this.producto.material = this.materialControl;

    this.producto.codigo = this.formulario.get('codigo')?.value.padStart(4, '0');
    this.producto.empresa = this.formulario.get('empresa')?.value;
    this.producto.nombre = this.formulario.get('nombre')?.value;
    this.producto.moldeleria = this.formulario.get('moldeleria')?.value == '' ? 0 : this.formulario.get('moldeleria')?.value;
    this.producto.talles = this.tallesProductoControl.value;
    let topeDescuento = this.formulario.get('topeDescuento')?.value == "" ? 100 : this.Globales.EstandarizarDecimal(this.formulario.get('topeDescuento')?.value);
    this.producto.topeDescuento = topeDescuento;
    let operaciones$: Observable<any>[] = [];
        
    //Agregando
    if(this.producto.id == 0){
      operaciones$ = this.coloresSeleccionados.value.map(color => {
        const productoAInsertar = { ...this.producto };

        this.producto.talles!.forEach(elemento => {
          const idTalle = this.talles.find(x => x.descripcion === elemento.talle)?.id;
          elemento.codigoBarra = this.GenerarCodigo(this.producto.empresa!, this.producto.codigo!, idTalle!, color.id);
        });

        productoAInsertar.color = color;
        productoAInsertar.proceso = 1;
        return this.productosService.Agregar(productoAInsertar);      
      });
    }
    //Modificando
    else{
      if (this.producto.id && this.producto.color?.id) {
        const productoPrincipal = this.prepararProductoModificar(
          this.producto.id,
          this.producto.color.id
        );

        //Modificamos el producto
        operaciones$.push(
          this.productosService.Modificar(productoPrincipal)
        );

        //Modificamos los relacionados
        this.producto.relacionados?.forEach(rel => {
          if (!rel.idProducto || !rel.color?.id) return;

          const productoRelacionado = this.prepararProductoModificar(
            rel.idProducto,
            rel.color.id
          );

          operaciones$.push(
            this.productosService.Modificar(productoRelacionado)
          );
        });
      }
    }

    forkJoin(operaciones$).subscribe(respuestas => {
      const ok = respuestas.filter(r => r === 'OK').length;
      const existen = respuestas.filter(r => r === 'Ya existe un producto con el mismo código y color.').length;
      const fallos = respuestas.filter(r => r !== 'OK' && r !== 'Ya existe un producto con el mismo código y color.').length;

      if (ok === respuestas.length) {
        this.Notificaciones.Success("Los productos fueron procesados correctamente");
      } else if(existen === respuestas.length){
        this.Notificaciones.Warn("Ya existen productos con el mismo código y color seleccionado.");
        return;
      }else if(fallos === respuestas.length){
        this.Notificaciones.Warn("Los productos no pudieron ser procesados.");
        return;
      }else {
        this.Notificaciones.Warn(`Solo ${ok} de ${respuestas.length} productos se procesaron correctamente.`);
        if(existen > 0){
          this.Notificaciones.Warn(`Hay ${existen} productos con el mismo código y color seleccionado.`);
        }
      }

      if(this.desdeRouting)
        this.router.navigateByUrl('/productos');
      else
        this.CerrarModal(true);    
    });
  }

  private prepararProductoModificar(idProducto: number, colorId: number): Producto {

    const producto: Producto = {
      ...this.producto,
      id: idProducto,
      color: { id: colorId },
      talles: this.producto.talles?.map(t => ({ ...t })) ?? []
    };

    const mapaTalles = new Map(
      this.talles.map(t => [t.descripcion, t.id])
    );

    producto.talles!.forEach(elemento => {

      const idTalle = mapaTalles.get(elemento.talle);
      if (!idTalle) return;

      elemento.codigoBarra = this.GenerarCodigo(
        producto.empresa!,
        producto.codigo!,
        idTalle,
        colorId
      );
    });

    return producto;
  }

  GenerarCodigo(empresa:number, codigo:string, talle:number, color:number){
    const emp = empresa.toString().padStart(2, '0');
    const cod = codigo.toString().padStart(4, '0');
    const tal = talle.toString().padStart(3, '0');
    const col = color.toString().padStart(4, '0');

    return `${emp}${cod}${tal}${col}`;
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
