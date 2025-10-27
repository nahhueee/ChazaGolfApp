import { Component } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { NavegacionComponent } from '../../compartidos/navegacion/navegacion.component';

@Component({
  selector: 'app-inicio',
  standalone: true,
  imports: [
    NavegacionComponent
  ],
  templateUrl: './inicio.component.html',
  styleUrl: './inicio.component.scss',
})
export class InicioComponent {
  private titlepage:Title;

  constructor(){
    //this.titlepage.setTitle('INICIO');
  }
}
