import {NgModule} from '@angular/core';
import {RouterModule, Routes} from '@angular/router';
import {MainComponent} from './main/main.component';
import {ReplaceVendorComponent} from "./replaceVendor/replace-vendor.component";
import {SettingsComponent} from "./settings/settings.component";
import {CancelPolineComponent} from "./cancelPoline/cancelPoline.component";
import {RecieveBulkComponent} from "./recieve-bulk/recieve-bulk.component";

const routes: Routes = [
  { path: '', component: MainComponent },
  { path: 'app-replace-vendor', component: ReplaceVendorComponent },
  { path: 'app-cancel-poline', component: CancelPolineComponent },
  { path: 'app-recieve-bulk', component: RecieveBulkComponent },
  { path: 'settings', component: SettingsComponent },
];

@NgModule({
  imports: [RouterModule.forRoot(routes, { useHash: true })],
  exports: [RouterModule]
})
export class AppRoutingModule { }
