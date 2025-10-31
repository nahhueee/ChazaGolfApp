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
  esDark:boolean = false;
  pathIcon:string;

  constructor(){
    //this.titlepage.setTitle('INICIO');
    this.esDark = localStorage.getItem('theme') === 'dark';
     if(this.esDark){
      this.pathIcon = "IconoWhite.png"
    }else{
      this.pathIcon = "IconoBlack.png"
    }
  }

  ngOnInit(){
    window.addEventListener('storage', (event) => {
      console.log(event)
      if (event.key === 'theme') {
        this.esDark = event.newValue === 'dark';
      }
    });
  }
}
