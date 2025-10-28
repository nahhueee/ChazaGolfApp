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
import { AutoCompleteModule } from 'primeng/autocomplete';
import { InputGroupModule } from 'primeng/inputgroup';
import { InputGroupAddonModule } from 'primeng/inputgroupaddon';

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
    AutoCompleteModule,
    InputGroupModule,
    InputGroupAddonModule
]