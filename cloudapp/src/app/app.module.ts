import { NgModule } from '@angular/core';
import {HttpClientModule} from '@angular/common/http';
import { BrowserModule, Title } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { MaterialModule, getTranslateModule, AlertModule, MenuModule } from '@exlibris/exl-cloudapp-angular-lib';
import {FormsModule, ReactiveFormsModule} from '@angular/forms';
import { SelectEntitiesModule } from 'eca-components';

import { AppComponent } from './app.component';
import { AppRoutingModule } from './app-routing.module';
import { MainComponent } from './main/main.component';
import { TopmenuComponent } from './topmenu/topmenu.component';
import {TruncatePipe} from "./pipes/truncate.pipe";
import {ReplaceVendorComponent} from "./replaceVendor/replace-vendor.component";
import { SettingsComponent } from './settings/settings.component';
import {CancelPolineComponent} from "./cancelPoline/cancelPoline.component";
import { ReceiveBulkComponent } from './recieve-bulk/receive-bulk.component';


@NgModule({
  declarations: [
    AppComponent,
    TruncatePipe,
    MainComponent,
    TopmenuComponent,
    ReplaceVendorComponent,
    CancelPolineComponent,
    SettingsComponent,
    ReceiveBulkComponent,
  ],
  imports: [
    MaterialModule,
    BrowserModule,
    BrowserAnimationsModule,
    AppRoutingModule,
    HttpClientModule,
    FormsModule,
    ReactiveFormsModule,
    getTranslateModule(),
    AlertModule,
    SelectEntitiesModule,
    MenuModule,
  ],
  providers: [
    Title
  ],
  bootstrap: [
    AppComponent
  ],
  entryComponents: [
  ]
})
export class AppModule { }
