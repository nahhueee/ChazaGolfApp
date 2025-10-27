import { CommonModule } from "@angular/common";
import { FormsModule, ReactiveFormsModule } from "@angular/forms";


//PrimeNG
import { InputTextModule } from 'primeng/inputtext';
import { CheckboxModule } from 'primeng/checkbox';
import { RadioButtonModule } from 'primeng/radiobutton';
import { ToggleButtonModule } from 'primeng/togglebutton';
import { ButtonModule } from 'primeng/button';
import { FloatLabel } from 'primeng/floatlabel';
import { SelectModule } from 'primeng/select';

//Otros
import { IMaskModule } from 'angular-imask';
import { DecimalFormatPipe } from "../pipes/decimal-format.pipe";

export const FORMS_IMPORTS = [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,

    //Otros
    IMaskModule,
    DecimalFormatPipe,
    
    //PrimeNG
    InputTextModule,
    SelectModule,
    FloatLabel,
    CheckboxModule,
    RadioButtonModule,
    ToggleButtonModule,
    ButtonModule,
]