import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { MainComponent } from './main/main.component';
import {POlineComponent} from "./poline/poline.component";

const routes: Routes = [
  { path: '', component: MainComponent },
  { path: 'app-poline', component: POlineComponent },
];

@NgModule({
  imports: [RouterModule.forRoot(routes, { useHash: true })],
  exports: [RouterModule]
})
export class AppRoutingModule { }
