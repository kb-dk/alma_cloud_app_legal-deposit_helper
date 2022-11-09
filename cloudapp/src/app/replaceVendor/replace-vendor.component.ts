import {Subscription} from 'rxjs';
import {Component, OnDestroy, OnInit} from '@angular/core';
import {
  AlertService,
  CloudAppEventsService,
  CloudAppRestService,
  CloudAppSettingsService,
  Entity,
  HttpMethod,
  PageInfo,
  Request,
  RestErrorResponse
} from '@exlibris/exl-cloudapp-angular-lib';
import {AppService} from "../app.service";
import {FormArray, FormBuilder, FormGroup} from "@angular/forms";
import {MatRadioChange} from "@angular/material/radio";
import {Settings} from "../models/settings";
import {TruncatePipe} from "../pipes/truncate.pipe";

@Component({
  selector: 'app-replace-vendor',
  templateUrl: './replace-vendor.component.html',
  styleUrls: ['./replace-vendor.component.scss']
})
export class ReplaceVendorComponent implements OnInit, OnDestroy {
  private pageLoad$: Subscription;
  pageEntities: Entity[];
  pageIsShowingPolines: boolean = false;
  filteredPolines: Entity[];
  noVendorsFoundText= "No vendors found. Please change search criterion and try again ";
  vendorsFound = false;
  showSearchVendorResult= false;
  private remainsToBeLoaded: number; //counter, helping to control pageLoading overlay.
  selectedVendorLink: String= '';
  vendorSearchString = ""
  showPoLines = true; //Styrer om poline vises/skjules
  showAllPolines: boolean = false; //Skal alle polines vises eller kun polines filtreret på settings name
  vendorsForm: FormGroup;
  pageLoading = false;
  selectedPoLine: Entity;
  private polineDetails: any;
  private selectedVendorDetailsJson: any;
  settings: Settings;
  vendorSearchLimitExceeded: boolean = false;

  constructor(
    private appService: AppService,
    private restService: CloudAppRestService,
    private eventsService: CloudAppEventsService,
    private formBuilder: FormBuilder,
    private alert: AlertService,
    private settingsService: CloudAppSettingsService,
  ) {
  }

  ngOnInit() {
    this.pageLoading = true;
    this.appService.setTitle('PO Lines - replace vendor');
    this.initSettings();
  }

  ngOnDestroy(): void {
    this.pageLoad$.unsubscribe();
  }

  private initSettings() {
    this.settingsService.get().subscribe(settings => {
      this.settings = settings as Settings;
      this.showAllPolines = !(this.settings.polineVendorNameFilter && this.settings.polineVendorNameFilter.length > 0);
      this.pageLoad$ = this.eventsService.onPageLoad(this.onPageLoad);
    });
  }

  onPageLoad = (pageInfo: PageInfo) => {
    this.filteredPolines = [];
    this.pageEntities = pageInfo.entities;
    if(this.pageEntities.length>0 && this.pageEntities[0].link.toString().includes('/acq/po-lines')) {
      this.pageIsShowingPolines = true;
      if(this.settings.polineVendorNameFilter && this.settings.polineVendorNameFilter.length > 0){ //if vendorName filter is defined in "Settings"
        this.remainsToBeLoaded = this.pageEntities.length;
        pageInfo.entities.forEach(tmpEntity => {
          this.filterPolineUsingVendorName(tmpEntity);
        })
      } else { //No filtersetting => pageloading is done.
        this.pageLoading = false;
      }
    } else {
      this.pageIsShowingPolines = false;
    }
  }

  private filterPolineUsingVendorName(entity: Entity) {
    let url = entity.link;
    let request: Request = {
      url: url,
      method: HttpMethod.GET
    };
    this.restService.call(request).subscribe({
      next: result => {
        this.remainsToBeLoaded--;
        const polineDesc = result.vendor.desc;
        if(polineDesc.includes(this.settings.polineVendorNameFilter)){
          this.filteredPolines.push(entity);
        }
        if(this.remainsToBeLoaded === 0){
          this.pageLoading= false;
        }
      },
      error: (e: RestErrorResponse) => {
        this.alert.error('getPolineDetails; Failed to get data');
        console.error(e);
        if(this.remainsToBeLoaded === 0){
          this.pageLoading= false;
        }
      }
    });
  }

//***************************************************************************************************************
// PO Line selected

  poLineSelected($event: MatRadioChange, entity: Entity) {
    this.selectedPoLine = entity;
    if(this.settings.searchUsingBib260B){ //flag from settingsMenu
      this.getPolineDetails(entity);
    }else{
      this.vendorSearchString = '';
    }
    this.showPoLines = false;
  }

  private getPolineDetails(entity: Entity) {
    let url = entity.link;
    let request: Request = {
      url: url,
      method: HttpMethod.GET
    };
    this.restService.call(request).subscribe({
      next: result => {
          this.polineDetails = result;
          this.getBibPost(result);
      },
      error: (e: RestErrorResponse) => {
        this.alert.error('getPolineDetails; Failed to get data');
        console.error(e);
        this.pageLoading = false;
      }
    });
  }

  private getBibPost(polineDetails) {
    let linkToBibPost = polineDetails.resource_metadata.mms_id.link;//TODO: Bruges til at gafle felt 280b
    let request: Request = {
      url: linkToBibPost,
      method: HttpMethod.GET
    };
    this.restService.call(request).subscribe({
      next: result => {
        this.vendorSearchString = this.extract260bText(result);
      },
      error: (e: RestErrorResponse) => {
        this.alert.error('sendGetBibPostFromLink failed to get data');
        console.error(e);
        this.pageLoading = false;
      }
    });
  }

  private extract260bText(bibData){
    let regExp = new RegExp("\<datafield.*tag\=\"260.*?\"b\"\>(.*?)\<\/subfield\>");//Find: <datafield....tag="260  -> Find first "b">GRAB FROM HERE UNTIL</subfield>
    var field260b = regExp[Symbol.match](bibData.anies)[1];
    if(field260b){
      if(field260b.endsWith(',') || field260b.endsWith(';')){
        const editedText = field260b.slice(0, -1);
        field260b = editedText.trim();
      }
    }
    return field260b;
  }


//****************************************************************************************************************************
//Vendors
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

  search(vendorNameSearchString: string) {
    this.pageLoading = true;
    this.vendorSearchLimitExceeded = false;
    this.showSearchVendorResult = true;
    const vendorCodeFilter = this.settings.vendorCodeFilter;
    const queryParamString= "all~"+vendorNameSearchString + ' ' + vendorCodeFilter;
    this.searchVendors(queryParamString);
  }

  private searchVendors(queryParamString: string) {
    this.vendorsFound = false;
    let url = "/acq/vendors/";
    var request: Request = {
      url: url,
      method: HttpMethod.GET,
      queryParams: {
        ["q"]: queryParamString,
        ["status"]: "active",
        ["limit"]: 100
      }
    };
    this.restService.call(request).subscribe({
      next: result => {
        this.initVendors();
        const total_record_count = parseInt(result.total_record_count);
        if(total_record_count > 0){
          let foundVendorsCounter = 0;
          for (let i = 0; i < result.vendor.length; i++) {
            const tmpVendorCode = result.vendor[i].code;
            if(this.vendors().controls.length < this.settings.vendorSearchLimit){
              this.vendors().push(this.newVendor(tmpVendorCode, result.vendor[i].name, result.vendor[i].link));
              this.vendorsFound = true;
              foundVendorsCounter++;
            }
          }
        }
        if(this.vendorsFound) {
          if(this.vendors().controls.length >= this.settings.vendorSearchLimit){
            this.vendorSearchLimitExceeded = true;
          }
        } else if(this.vendorsFound){
          if(result.vendor.length === 100){
            this.vendorSearchLimitExceeded = true;
          }
        }
      },
      error: (e: RestErrorResponse) => {
        this.alert.error('Failed to get data from search: ' + queryParamString);
        console.error(e);
        this.pageLoading = false;
      },
      complete: () => {
        this.pageLoading = false;
      }
    });
  }

  vendorSelected(vendorIndex: number) {
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

//*************************************************************************************************************************************
//Replace vendor
  replaceVendorForPoline() {
    let request: Request = {
      url: this.selectedPoLine.link,
      method: HttpMethod.GET
    };
    this.restService.call(request).subscribe({
      next: result => {
        result.vendor.value = this.selectedVendorDetailsJson.code;
        result.vendor.desc = this.selectedVendorDetailsJson.name;
        result.vendor_account = this.selectedVendorDetailsJson.account[0].code;
        this.updatePoline(result);
//        this.refreshPage();TODO: Skal det ske???
      },
      error: (e: RestErrorResponse) => {
        this.alert.error('Failed to get vendorDetails ');
        console.error(e);
        this.pageLoading = false;
      }
    });
  }

  updatePoline(updatedPolineDetails: any) {
    this.pageLoading = true;
    let request: Request = {
      url: this.selectedPoLine.link,
      method: HttpMethod.PUT,
      requestBody: updatedPolineDetails
    };
    this.restService.call(request).subscribe({
      next:() => {
        this.pageLoading = false;
        let truncate = new TruncatePipe();
        this.alert.info('Vendor updated for PO Line' + truncate.transform(updatedPolineDetails.vendor.desc.toString(), 25), {delay :10000} );
        this.clear()
        // this.refreshPage();
      },
      error: (e: RestErrorResponse) => {
        this.alert.error(e.message.split(";")[0]);
        console.error("PoLine Link: " + this.selectedPoLine.link + ' ErrorMessage: ' + e.message.split(";")[0]);
        this.pageLoading = false;
      }
    });
  }

//*******************************************************************************************************************
//TODO: Not working: https://developers.exlibrisgroup.com/forums/topic/refreshpage-function-challenge/#post-73315
  refreshPage = () => {
    this.pageLoading = true;
    this.eventsService.refreshPage().subscribe({
      next: () => this.alert.success('Success!'),
      error: e => {
        console.error(e);
        this.alert.error('Failed to refresh page');
      },
      complete: () => this.pageLoading = false
    });
  }

  clear() {
    this.showPoLines = true;
    this.vendorSearchString = "";
    this.selectedPoLine = null;
    this.initVendors();
    this.showSearchVendorResult = false;
  }

}
