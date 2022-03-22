import { Component, OnInit } from '@angular/core';
import { AppService } from '../app.service';
import {FormArray, FormGroup} from '@angular/forms';
import { AlertService, CloudAppSettingsService, FormGroupUtil } from '@exlibris/exl-cloudapp-angular-lib';
import { Settings } from '../models/settings';

@Component({
  selector: 'app-settings',
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.scss']
})
export class SettingsComponent implements OnInit {
  form: FormGroup;
  formArray: FormArray;
  saving = false;

  constructor(
      private appService: AppService,
      private settingsService: CloudAppSettingsService,
      private alert: AlertService,
  ) { }

  ngOnInit() {
    this.appService.setTitle('Settings');
    this.settingsService.get().subscribe( settings => {
      this.form = FormGroupUtil.toFormGroup(Object.assign(new Settings(), settings))
    });
  }

  save() {
    this.saving = true;
    console.log('this.form.value: ' + JSON.stringify(this.form.value));
    this.settingsService.set(this.form.value).subscribe(
        response => {
          this.alert.success('Settings saved. Please restart the cloudApp to avoid rendering problems!', { autoClose: false });
          this.form.markAsPristine();
        },
        err => this.alert.error(err.message),
        ()  => this.saving = false
    );
  }

  remove() {
    this.settingsService.remove().subscribe( () => console.log('removed') );
  }
}
