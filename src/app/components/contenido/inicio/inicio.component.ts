import { Component } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { Subscription } from 'rxjs';
import { TemaService } from '../../../services/tema.service';

@Component({
  selector: 'app-inicio',
  standalone: true,
  imports: [],
  templateUrl: './inicio.component.html',
  styleUrl: './inicio.component.scss',
})
export class InicioComponent {
  private titlepage:Title;
  esDark:boolean = false;
  pathIcon:string;
  sub!: Subscription;

  constructor(
    private temaService: TemaService
  ){
    //this.titlepage.setTitle('INICIO');
    this.esDark = localStorage.getItem('theme') === 'dark';
  }

  ngOnInit(): void {
    this.sub = this.temaService.theme$.subscribe(theme => {
      this.esDark = theme === 'dark';
      if(this.esDark){
        this.pathIcon = "IconoWhite.png"
      }else{
        this.pathIcon = "IconoBlack.png"
      }
    });
  }

  ngOnDestroy(): void {
    this.sub.unsubscribe();
  }
}
