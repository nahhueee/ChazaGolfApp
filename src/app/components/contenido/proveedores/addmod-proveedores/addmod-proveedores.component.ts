import { Component, EventEmitter, Input, Output } from '@angular/core';
import { Proveedor } from '../../../../models/Proveedor';
import { AbstractControl, FormArray, FormControl, FormGroup, Validators } from '@angular/forms';
import { NotificacionesService } from '../../../../services/notificaciones.service';
import { ProveedoresService } from '../../../../services/proveedores.service';
import { CondicionesIva } from '../../../../models/CondicionesIva';
import { FORMS_IMPORTS } from '../../../../imports/forms.import';
import { DireccionesService } from '../../../../services/direcciones.service';
import { MiscService } from '../../../../services/misc.service';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  selector: 'app-addmod-proveedores',
  standalone: true,
  imports: [
    ...FORMS_IMPORTS
  ],
  templateUrl: './addmod-proveedores.component.html',
  styleUrl: './addmod-proveedores.component.scss',
})
export class AddModProveedoresComponent {
  @Output() cerrar = new EventEmitter<boolean>(); //True: si hay que actualizar, False: si no hay que actualizar
  @Input() set proveedorEditar(value: Proveedor | undefined) { //Proveedor a editar
    if (value){
      this.proveedor = value;
      this.CompletarCampos(value);
    }
    else this.formulario.reset(); //Si no hay valores reiniciamos el formulario
  }

  formulario:FormGroup;
  proveedor:Proveedor;
  desdeRouting:boolean;

  condicionesIVAReceptor: CondicionesIva[] = [];
  tiposDocumento = [
    { id: 80, descripcion: 'CUIT' },
    { id: 86, descripcion: 'CUIL' },
    { id: 96, descripcion: 'DNI' }
  ];

  tiposDocumentoFiltrados = [...this.tiposDocumento];

  provincias : any[] = [];
  provinciasFiltrado : any[] = [];
  ciudades: any[] = [];
  calles: any[] = [];

  private cuitcuilPattern: any = /^[2037][0-9]{9}[0-9]$/;
  private dniPattern = /^[0-9]{7,8}$/;
  private emailPattern: any = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;

  constructor(
    private Notificaciones: NotificacionesService,
    private proveedoresService: ProveedoresService,
    private direccionesService: DireccionesService,
    private miscService:MiscService,
    private rutaActiva: ActivatedRoute,
    private router: Router,
  ) {
    this.formulario = new FormGroup({
      razonSocial: new FormControl('', [Validators.required]),

      telefono: new FormControl(''),
      celular: new FormControl(''),
      contacto: new FormControl(''),
      email: new FormControl('',[Validators.pattern(this.emailPattern)]),

      condIva: new FormControl([null]),
      tDocumento: new FormControl('', [Validators.required]),
      documento: new FormControl('', [Validators.required]),

      calle: new FormControl(''),
      numero: new FormControl(''),
      ciudad: new FormControl(''),
      provincia: new FormControl(''),
      pais: new FormControl('Argentina'),
      codPostal: new FormControl(''),
    });
  }

  get documento() {
    return this.formulario.get('documento');
  }

  get calleControl() {return this.formulario.get('calle');}
  get ciudadControl() {return this.formulario.get('ciudad');}
  get provinciaControl() {return this.formulario.get('provincia');}
  get nroControl() {return this.formulario.get('numero');}
  get codPostalControl() {return this.formulario.get('codPostal');}

  ngOnInit(): void {
    const path = this.rutaActiva.snapshot.routeConfig?.path;
    if(path === 'proveedores/add'){
      this.desdeRouting = true;
    }

    this.ObtenerCondiciones();
    this.ObtenerProvincias();

    //valida DNI o CUIT CUIL respectivamente
    this.formulario.get('tDocumento')?.valueChanges.subscribe(valor => {
      const docCtrl = this.formulario.get('documento');
      docCtrl?.clearValidators();

      if (valor.id === 96) { //DNI
        docCtrl?.setValidators([Validators.required, Validators.pattern(this.dniPattern)]);
      } else if (valor.id === 80 || valor.id === 86) { //CUIT CUIL
        docCtrl?.setValidators([Validators.required, Validators.pattern(this.cuitcuilPattern)]);
      }

      docCtrl?.updateValueAndValidity();
    });
  }

  //#region VARIOS
  CompletarCampos(proveedor){
    this.formulario.get('razonSocial')?.setValue(proveedor.razonSocial);
    this.formulario.get('celular')?.setValue(proveedor.celular);
    this.formulario.get('contacto')?.setValue(proveedor.contacto);
    this.formulario.get('telefono')?.setValue(proveedor.telefono);
    this.formulario.get('email')?.setValue(proveedor.email);
    this.formulario.get('documento')?.setValue(proveedor.documento);

    let condicionIva = this.condicionesIVAReceptor.find(c => c.id == proveedor.idCondicionIva);
    if(condicionIva) this.formulario.get('condIva')?.setValue(condicionIva);

    let tipoDocumento = this.tiposDocumento.find(c => c.id == proveedor.idTipoDocumento);
    if(tipoDocumento) this.formulario.get('tDocumento')?.setValue(tipoDocumento);

    if(proveedor.direcciones && proveedor.direcciones.length>0){
      const direccion = proveedor.direcciones[0];
      this.formulario.get('calle')?.setValue(direccion.calle);
      this.formulario.get('numero')?.setValue(direccion.numero);
      this.formulario.get('ciudad')?.setValue(direccion.localidad);
      this.formulario.get('provincia')?.setValue(direccion.provincia);
      this.formulario.get('codPostal')?.setValue(direccion.codPostal);
    }
  }

  campoInvalido(campo: string): boolean {
    const control = this.formulario.get(campo);
    return !!(control && control.invalid && control.dirty);
  }

  SelectContent(event: FocusEvent) {
    const input = event.target as HTMLInputElement;
    input.select();
  }

  ObtenerProvincias(){
    this.direccionesService.ObtenerProvincias()
      .subscribe(response => {
        this.provincias = response;
      });
  }

  ObtenerCondiciones(){
    this.miscService.ObtenerCondicionesIva()
      .subscribe(response => {
        this.condicionesIVAReceptor = response;
        this.formulario.get('condIva')?.setValue(this.condicionesIVAReceptor[0]);
        this.CambioCondicion();
      });
  }

  CambioCondicion() {
    const condIva = this.formulario.get('condIva')?.value.id;
    if (!condIva) return;

    // Consumidor Final
    if (condIva === 5) {
      this.tiposDocumentoFiltrados = this.tiposDocumento.filter(t =>
        [96].includes(t.id)
      );
      this.formulario.get('tDocumento')?.setValue(
        this.tiposDocumentoFiltrados[0]
      );
    } else {
      // Solo CUIT
      this.tiposDocumentoFiltrados = this.tiposDocumento.filter(t =>
        t.id === 80
      );
      this.formulario.get('tDocumento')?.setValue(
        this.tiposDocumentoFiltrados[0]
      );
    }
  }

  FiltrarProvincias(event: any) {
    const query = event.query.toLowerCase();
    this.provinciasFiltrado = this.provincias.filter(p => {
      const nombre = p.nombre!.toLowerCase();
      return nombre.includes(query);
    });
  }

  FiltrarCiudades(event: any) {
    const query = event.query.toLowerCase();

    if (query.length < 3) {
      this.ciudades = [];
      return;
    }

    this.direccionesService.ObtenerLocalidades(this.provinciaControl?.value.nombre, query)
    .subscribe(response => {
      this.ciudades = response;
    });
  }

  FiltrarCalles(event: any) {
    const query = event.query.toLowerCase();

    if (query.length < 3) {
      this.calles = [];
      return;
    }

    this.direccionesService.ObtenerCalles(this.ciudadControl?.value.nombre, query)
    .subscribe(response => {
      this.calles = response;
    });
  }
  //#endregion

  Guardar(){
    this.markFormTouched(this.formulario);
    if(!this.formulario.valid) return;

    if(!this.proveedor){
      this.proveedor = new Proveedor();
    }

    this.proveedor.razonSocial =  this.formulario.get('razonSocial')?.value;
    this.proveedor.telefono =  this.formulario.get('telefono')?.value;
    this.proveedor.celular =  this.formulario.get('celular')?.value;
    this.proveedor.email =  this.formulario.get('email')?.value;
    this.proveedor.contacto =  this.formulario.get('contacto')?.value;
    this.proveedor.idTipoDocumento =  this.formulario.get('tDocumento')?.value.id;
    this.proveedor.idCondicionIva = this.formulario.get('condIva')?.value.id;
    this.proveedor.documento = this.formulario.get('documento')?.value;

    const v = (path: string, prop?: string) => {
      const val = this.formulario.get(path)?.value;
      return prop ? (val?.[prop] ?? '') : (val ?? '');
    };

    const calle = v('calle', 'nombre');
    const numero = v('numero');
    const ciudad = v('ciudad', 'nombre');
    const provincia = v('provincia', 'nombre');

    this.proveedor.direcciones = [{
      resumen: [calle, numero, ciudad, provincia].filter(Boolean).join(', '),
      calle,
      numero,
      codPostal: v('codPostal'),
      localidad: ciudad,
      provincia,
      observaciones: ''
    }];

    if(!this.proveedor.id){
      this.Agregar();
    }else{
      this.Modificar();
    }
  }

  Agregar(){
    this.proveedoresService.Agregar(this.proveedor)
      .subscribe(response => {
        if(response=='OK'){
          this.Notificaciones.Success("Proveedor creado correctamente");
          if(this.desdeRouting)
            this.router.navigateByUrl('/proveedores');
          else
            this.CerrarModal(true);
        }else{
          this.Notificaciones.Warn(response);
        }
      });
  }

  Modificar(){
    this.proveedoresService.Modificar(this.proveedor)
      .subscribe(response => {
        if(response=='OK'){
          this.Notificaciones.Success("Proveedor modificado correctamente");
          if(this.desdeRouting)
            this.router.navigateByUrl('/proveedores');
          else
            this.CerrarModal(true);
        }else{
          this.Notificaciones.Warn(response);
        }
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
