import { Component, OnInit } from '@angular/core';
import {
  AlertService,
  CloudAppRestService, CloudAppSettingsService,
  HttpMethod,
  Request,
  RestErrorResponse
} from "@exlibris/exl-cloudapp-angular-lib";
import {Settings} from "../models/settings";
import {FormArray, FormBuilder, FormControl, FormGroup, Validators} from "@angular/forms";
import {AppService} from "../app.service";
import {isNumeric} from "rxjs/internal-compatibility";
import {TranslateService} from "@ngx-translate/core";

@Component({
  selector: 'app-receive-bulk',
  templateUrl: './receive-bulk.component.html',
  styleUrls: ['./receive-bulk.component.scss']
})
export class ReceiveBulkComponent implements OnInit {
  vendorSearchString: string = "";
  pageLoading: boolean;
  showSearchVendorResult: boolean;
  vendorSearchLimitExceeded: boolean;
  settings: Settings;
  vendorsForm: FormGroup;
  bulkTypesForm: FormGroup;
  noVendorsFoundText: string ;
  vendorsFound = false;
  private selectedVendorLink: any;
  vendorIsSelected: boolean = false;
  selectedVendorDetailsJson: any;
  showSearchVendor: boolean = true;
  bulkIsEmpty: boolean = true;
  minDate: Date;
  maxDate: Date;
  registerDate: FormControl;

  constructor(
    private appService: AppService,
    private restService: CloudAppRestService,
    private formBuilder: FormBuilder,
    private alert: AlertService,
    private translate: TranslateService,
    private settingsService: CloudAppSettingsService,
  ) {
  }

  ngOnInit(): void {
    this.settingsService.get().subscribe((settings)=>{
      this.settings = settings as Settings;
      this.translate.use(this.settings.language).subscribe(()=> {
      this.initBulktypes();
      this.appService.setTitle(this.translate.instant('Title.ReceiveBulk'));
      this.noVendorsFoundText = this.translate.instant('ReceiveBulk.NoVendorsFoundText');
      });
    });
    this.initVendors();
    this.initGuiSettings();
  }

  private initGuiSettings() {
    this.showSearchVendor = true;
    this.showSearchVendorResult = false;
    this.vendorIsSelected = false;
    this.vendorSearchString = '';
    this.bulkIsEmpty = true;
    this.initDatePicker();
  }

  private initDatePicker() {
    const currentYear = new Date().getFullYear();
    this.minDate = new Date(currentYear - 1, 1, 1);
    this.maxDate = new Date();
    this.registerDate = new FormControl(new Date(), Validators.required);
  }

  search(vendorNameSearchString: string) {
    this.pageLoading = true;
    this.vendorSearchString = vendorNameSearchString;
    this.vendorSearchLimitExceeded = false;
    this.searchVendors(vendorNameSearchString);
  }

  private searchVendors(vendorNameSearchString: string) {
    this.vendorsFound = false;
    let url = "/acq/vendors/";
    let queryParamValue= "name~"+vendorNameSearchString;
    var request: Request = {
      url: url,
      method: HttpMethod.GET,
      queryParams: {
        ["q"]: queryParamValue,
        ["limit"]: 100
      }
    };
    this.restService.call(request).subscribe({
      next: result => {
        this.initVendors();
        this.showSearchVendorResult = true;
        const total_record_count = parseInt(result.total_record_count)
        const vendorCodeFilter = this.settings.vendorCodeFilter;
        if(total_record_count > 0){
          let foundVendorsCounter = 0;
          for (let i = 0; i < result.vendor.length; i++) {
            const tmpVendorCode = result.vendor[i].code;
            if(((!vendorCodeFilter||vendorCodeFilter.length===0) || tmpVendorCode.toLowerCase().includes(vendorCodeFilter.toLowerCase())) && this.vendors().controls.length < this.settings.vendorSearchLimit){
              this.vendors().push(this.newVendor(tmpVendorCode, result.vendor[i].name, result.vendor[i].link));
              this.vendorsFound = true;
              foundVendorsCounter++;
            }
          }
        }
        if(vendorCodeFilter && this.vendorsFound) {
          if(this.vendors().controls.length >= this.settings.vendorSearchLimit){
            this.vendorSearchLimitExceeded = true;
          }
        } else if(this.vendorsFound){
          if(result.vendor.length === 100){
            this.vendorSearchLimitExceeded = true;
          }
        }
        if(!this.vendorsFound){
        }
      },
      error: (e: RestErrorResponse) => {
        this.alert.error('Failed to get data from search: ' + vendorNameSearchString);
        console.error(e);
        this.pageLoading = false;
      },
      complete: () => {
        this.pageLoading = false;
      }
    });
  }

  updateVendor(newVendor: any) {
    this.pageLoading = true;
    let request: Request = {
      url: this.selectedVendorLink.toString(),
      method: HttpMethod.PUT,
      requestBody: newVendor,
    };
    this.restService.call(request).subscribe({
      next: () => {
        this.pageLoading = false;
        this.alert.info(this.translate.instant('ReceiveBulk.BulkReceivedInfo') +' : ' + this.selectedVendorDetailsJson.name + ".", {delay :10000} );
        this.clear()
        this.initBulktypes();
      },
      error: (e: RestErrorResponse) => {
        this.alert.error(e.message.split(";")[0]);
        console.error("Vendor Link: " + this.selectedVendorLink + ' ErrorMessage: ' + e.message.split(";")[0]);
        this.pageLoading = false;
      }
    });
  }


  vendors(): FormArray {
    return this.vendorsForm.get("vendors") as FormArray
  }

  initVendors() {
    this.vendorsForm = this.formBuilder.group({
      vendors: this.formBuilder.array([]),
    });
  }

  newVendor(code: string, name: string, link: (url: string) => string): FormGroup {
    return this.formBuilder.group({
      code: code,
      name: name,
      link: link,
    })
  }

  vendorSelected(vendorIndex: number) {
    this.showSearchVendor = false;
    this.showSearchVendorResult = false;
    this.vendorIsSelected = true;
    const abstractControl = this.vendors().get([vendorIndex]);
    const link = abstractControl.get('link').value;
    this.selectedVendorLink = link;
    this.getSelectedVendorDetails(link)
  }

  private getSelectedVendorDetails(link: any) {
    var request: Request = {
      url: link.toString(),
      method: HttpMethod.GET
    };
    this.restService.call(request).subscribe({
      next: result => {
        this.selectedVendorDetailsJson = result;
      },
      error: (e: RestErrorResponse) => {
        this.alert.error('Failed to get data from ' + link);
        console.error(e);
        this.pageLoading = false;
      }
    });
  }

  clear() {
    this.initGuiSettings();
  }

  bulkTypes(): FormArray {
    return this.bulkTypesForm.get("bulkTypes") as FormArray
  }

  initBulktypes() {
    this.bulkTypesForm = this.formBuilder.group({
      bulkTypes: this.formBuilder.array([]),
    });
    this.bulkTypes().push(this.newBulkType(this.translate.instant('Materialtype.BOOKLET_SHORT'), this.translate.instant('Materialtype.BOOKLET')));
    this.bulkTypes().push(this.newBulkType(this.translate.instant('Materialtype.BOX_SHORT'), this.translate.instant('Materialtype.BOX')));
    this.bulkTypes().push(this.newBulkType(this.translate.instant('Materialtype.ENVELOPE_SHORT'), this.translate.instant('Materialtype.ENVELOPE')));
    this.bulkTypes().push(this.newBulkType(this.translate.instant('Materialtype.PARCEL_SHORT'), this.translate.instant('Materialtype.PARCEL')));
    this.bulkTypes().push(this.newBulkType(this.translate.instant('Materialtype.PALLET_SHORT'), this.translate.instant('Materialtype.PALLET')));
    this.bulkTypes().push(this.newBulkType(this.translate.instant('Materialtype.TUBE_SHORT'), this.translate.instant('Materialtype.TUBE')));
    this.bulkTypes().push(this.newBulkType(this.translate.instant('Materialtype.PICK_UP_SHELF_SHORT'), this.translate.instant('Materialtype.PICK_UP_SHELF')));
  }

  newBulkType(code: string, name: string): FormGroup {
    return this.formBuilder.group({
      code: code,
      name: name,
      input: new FormControl('', Validators.pattern('^([0-9]|[1-9][0-9]|100)$')),
    })
  }

  registrer() {
    this.pageLoading = true;
    const selectedDate:Date = this.registerDate.value;
    const newVendorCode = this.createNewVendorCode(selectedDate, this.selectedVendorDetailsJson.code);
    const newNoteObject = this.createNewNoteObject(selectedDate);
    this.selectedVendorDetailsJson.code = newVendorCode;
    this.selectedVendorDetailsJson['note'].push(newNoteObject);
    this.updateVendor(this.selectedVendorDetailsJson);
  }

  private createNewNoteObject(selectedDate: Date) {
    function formatDateForJson() {
      let ye = new Intl.DateTimeFormat('en', {year: 'numeric'}).format(selectedDate);
      let mo = new Intl.DateTimeFormat('en', {month: '2-digit'}).format(selectedDate);
      let da = new Intl.DateTimeFormat('en', {day: '2-digit'}).format(selectedDate);
      return `${ye}-${mo}-${da}`;
    }

    var newNote = this.createNewNote(selectedDate);
    let newNoteString = '{"content":"' + newNote + '" , "creation_date":"' + formatDateForJson() + 'Z" , "created_by": "Legal Deposit Helper CloudApp -> receive bulk", "type": null}';
    return JSON.parse(newNoteString);
  }

  private createNewNote(selectedDate: Date) {
    function formatDateForNote() {
      let ye = new Intl.DateTimeFormat('en', {year: 'numeric'}).format(selectedDate);
      let mo = new Intl.DateTimeFormat('en', {month: '2-digit'}).format(selectedDate);
      let da = new Intl.DateTimeFormat('en', {day: '2-digit'}).format(selectedDate);
      return `${da}-${mo}-${ye}`;
    }

    var newNote: String = '';
    if (this.bulkIsEmpty) {
      newNote = this.translate.instant('ReceiveBulk.NoDeliveryRecived')+ ' ' + formatDateForNote();
    } else {
      newNote = this.translate.instant('ReceiveBulk.BulkReceived') + ' ' + formatDateForNote() + ':';
      this.bulkTypes().controls.forEach(control => {
        if (control.value.input !== '') {
          newNote = newNote + control.value.input + ' ' + control.value.code + ', ';
        }
      });
    }
    return newNote;
  }

  private createNewVendorCode(selectedDate: Date, oldVendorCode: string) {
    function findHalfYear() {
      const month = selectedDate.getMonth();
      return month < 6 ? 1 : 2;
    }

    function formattedDate() {
      const year = String(selectedDate.getFullYear()).substring(2);
      let actualmonth = selectedDate.getMonth()+1;
      const month = actualmonth>9?''+ actualmonth : '0' + actualmonth;
      const day = selectedDate.getDate()>9?''+ selectedDate.getDate() : '0' + selectedDate.getDate();
      return year + month + day;
    }

    const fullYear: string = String(selectedDate.getFullYear());
    const halfYear: string = String(findHalfYear());
    const statusDivider = '_BULK_';
    let newVendorCode = '';
    if (oldVendorCode.includes(statusDivider)) {
      const startOfVendorcode = oldVendorCode.split(statusDivider)[0];
      newVendorCode = newVendorCode + startOfVendorcode + statusDivider + 'R' + fullYear.substring(2) + halfYear;
    } else {
      newVendorCode =  oldVendorCode + statusDivider + 'R' + fullYear.substring(2) + halfYear;
    }
    if (this.bulkIsEmpty) {
      return newVendorCode;
    } else {
      return newVendorCode + '_' + formattedDate();
    }
  }

  setEmptyBulk(bulkWithMaterials: boolean) {
    this.bulkIsEmpty = !bulkWithMaterials;
    // https://stackoverflow.com/questions/46362951/material-radio-button-change-event-angular-4
  }

  hasError(input: string) {
    return isNumeric(input)
  }
}
