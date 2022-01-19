import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { MainComponent } from './main/main.component';
import {POlineComponent} from "./poline/poline.component";
import {ReplaceVendorComponent} from "./replaceVendor/replace-vendor.component";
import {ParallelComponent} from "./parallel/parallel.component";
import {SettingsComponent} from "./settings/settings.component";
import {JjComponent} from "./jj/jj.component";

const routes: Routes = [
  { path: '', component: MainComponent },
  { path: 'app-poline', component: POlineComponent },
  { path: 'app-replace-vendor', component: ReplaceVendorComponent },
  { path: 'settings', component: SettingsComponent },
  { path: 'app-parallel', component: ParallelComponent },
  { path: 'app-jj', component: JjComponent },
];

@NgModule({
  imports: [RouterModule.forRoot(routes, { useHash: true })],
  exports: [RouterModule]
})
export class AppRoutingModule { }
