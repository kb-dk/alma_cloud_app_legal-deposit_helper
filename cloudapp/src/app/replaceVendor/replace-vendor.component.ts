import { Subscription } from 'rxjs';
import { Component, OnInit, OnDestroy } from '@angular/core';
import {
  CloudAppRestService, CloudAppEventsService, Request, HttpMethod,
  Entity, PageInfo, RestErrorResponse, AlertService
} from '@exlibris/exl-cloudapp-angular-lib';
import {AppService} from "../app.service";
import {ToastrService} from "ngx-toastr";
import {VendorFields} from "../poline/vendorFields";
import {FormArray, FormBuilder, FormGroup} from "@angular/forms";
import {MatCheckboxChange} from "@angular/material/checkbox";
import {MatRadioChange} from "@angular/material/radio";
import * as url from "url";

@Component({
  selector: 'app-replace-vendor',
  templateUrl: './replace-vendor.component.html',
  styleUrls: ['./replace-vendor.component.scss']
})
export class ReplaceVendorComponent implements OnInit, OnDestroy {
  private count = 0;
  private pageLoad$: Subscription;
  private pageEntities: Entity[];
  private foundVendors = new Array<VendorFields>(); //data,der vises i tabel
  private noVendorsFoundText= "No vendors found. Please change search criterion and try again ";
  private vendorsFound = false;
  private showSearchVendorResult= false;


  private _apiResult: any;
  private selectedEntities = new Array<Entity>();
  private selectedNewVendorLink: url = '';
  private vendorSearchString = ""
  private showPoLines = true;
  poLineForm: FormGroup;
  vendorsForm: FormGroup;
  hasApiResult: boolean = false;
  loading = false;
  private selectedPoLine: Entity;
  private selectedVendorType: string = "";
  private polineDetails: any;
  private newVendorDetailsJson: any;

  constructor(
    private appService: AppService,
    private restService: CloudAppRestService,
    private eventsService: CloudAppEventsService,
    private formBuilder: FormBuilder,
    private alert: AlertService ) {
  }

  ngOnInit() {
    this.poLineForm = this.formBuilder.group({
      selectedCountries:  new FormArray([])
    });
    this.vendorsForm = this.formBuilder.group({
      selectedCountries:  new FormArray([])
    });
    this.pageLoad$ = this.eventsService.onPageLoad(this.onPageLoad);
    this.appService.setTitle('Change PO-line vendor');
  }

  ngOnDestroy(): void {
    this.pageLoad$.unsubscribe();
  }

  get apiResult() {
    return this._apiResult;
  }

  set apiResult(result: any) {
    this._apiResult = result;
    this.hasApiResult = result && Object.keys(result).length > 0;
  }

  onPageLoad = (pageInfo: PageInfo) => {
    this.pageEntities = pageInfo.entities;
    if ((pageInfo.entities || []).length == 1) {
      const entity = pageInfo.entities[0];
      this.restService.call(entity.link).subscribe(result => this.apiResult = result);
    } else {
      this.apiResult = {};
    }
  }

  update(value: any) {//TODO: RequestBody er der ikke styr på.
    this.loading = true;
    let requestBody = this.tryParseJson(value);
    if (!requestBody) {
      this.loading = false;
      return this.alert.error('Failed to parse json');
    }
    this.sendUpdateRequest(requestBody, this.selectedPoLine);
  }

  refreshPage = () => {
    this.loading = true;
    this.eventsService.refreshPage().subscribe({
      next: () => this.alert.success('Success!'),
      error: e => {
        console.error(e);
        this.alert.error('Failed to refresh page');
      },
      complete: () => this.loading = false
    });
  }


  //kaldes med poLine og opdaterer vendor ud fra requestBody
  private sendUpdateRequest(requestBody: any, selectedPoLine: Entity,  ) {
    let request: Request = {
      url: selectedPoLine.link,
      method: HttpMethod.PUT,
      requestBody
    };
    this.restService.call(request).subscribe({
      next: result => {
        this.apiResult = result;
        this.refreshPage();
      },
      error: (e: RestErrorResponse) => {
        this.alert.error('Failed to update data');
        console.error(e);
        this.loading = false;
      }
    });
  }

  private sendGetRequest(entity: Entity) {
    let url = entity.link;
    let request: Request = {
      url: url,
      method: HttpMethod.GET
    };
    this.restService.call(request).subscribe({
      next: result => {
          this.apiResult = result;
        // this.refreshPage();
      },
      error: (e: RestErrorResponse) => {
        this.alert.error('Failed to get data');
        console.error(e);
        this.loading = false;
      }
    });
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
          this.sendGetRequest_getBibPostNew(result);
        // this.refreshPage();
      },
      error: (e: RestErrorResponse) => {
        this.alert.error('getPolineDetails; Failed to get data');
        console.error(e);
        this.loading = false;
      }
    });
  }

  private sendGetBibPostFromLink(link: string) {
    let request: Request = {
      url: link,
      method: HttpMethod.GET
    };
    this.restService.call(request).subscribe({
      next: result => {
        this.apiResult = result;
        this.vendorSearchString = this.find260bText(result);
      },
      error: (e: RestErrorResponse) => {
        this.alert.error('sendGetBibPostFromLink failed to get data');
        console.error(e);
        this.loading = false;
      },
      complete: () => {
        // this.alert.info('Felt 260B hentet til søgefelt');
      }
    });
  }

  private find260bText(bibData){
    let jsonResultAsString = JSON.stringify(bibData);
    var parsedToJSON = JSON.parse(jsonResultAsString);
    let regExp = new RegExp("\<datafield.*tag\=\"260.*?\"b\"\>(.*?)\<\/subfield\>");//Find: <datafield....tag="260  -> Find first "b">GRAB FROM HERE UNTIL</subfield>
    var field260b = regExp[Symbol.match](parsedToJSON.anies)[1];
    console.log("Felt 260b: " + field260b);
    return field260b;
  }


  private sendGetRequestFromLink(link: string) {
    //TODO: work in progress
    let request: Request = {
      url: link,
      method: HttpMethod.GET
    };
    this.restService.call(request).subscribe({
      next: result => {
          this.apiResult = result;
        // this.refreshPage();
      },
      error: (e: RestErrorResponse) => {
        this.alert.error('Failed to get data from ' + link);
        console.error(e);
        this.loading = false;
      },
      complete: () => {
        this.alert.info('1. Data OK from ' + link);
      }
    });
  }

  private sendTestPoLineUpdate() {
    //TODO: work in progress
    let request: Request = {
      url: this.selectedPoLine.link,
      method: HttpMethod.GET
    };
    this.restService.call(request).subscribe({
      next: result => {
        let polineJsonResultAsString = JSON.stringify(result);
        var polineDetailsParsedToJSON = JSON.parse(polineJsonResultAsString);
        var vendorMessage = "Vendor: " + polineDetailsParsedToJSON.vendor.value + ",  " + polineDetailsParsedToJSON.vendor.desc + "  Account: " + polineDetailsParsedToJSON.vendor_account;
        polineDetailsParsedToJSON.vendor.value = this.newVendorDetailsJson.code;
        polineDetailsParsedToJSON.vendor.desc = this.newVendorDetailsJson.name;
        polineDetailsParsedToJSON.vendor_account = this.newVendorDetailsJson.account[0].code;
        let updatedJson = JSON.stringify(polineDetailsParsedToJSON);
        this.update(updatedJson);//update parser selv til JSON...
//        this.refreshPage();TODO: Skal det ske???
      },
      error: (e: RestErrorResponse) => {
        this.alert.error('Failed to get vendorDetails ');
        console.error(e);
        this.loading = false;
      },
      complete: () => {
        this.alert.error('2 Data OK from vendorDetails');
      }
    });
  }

  private sendGetRequest_getBibPostNew(result) {
    let jsonResultAsString = JSON.stringify(result);
    let parsedToJSON = JSON.parse(jsonResultAsString);
    let linkToBibPost = parsedToJSON.resource_metadata.mms_id.link;//TODO: Bruges til at gafle felt 280b
    this.sendGetBibPostFromLink(linkToBibPost)
  }

  private getPoLineDetailsAndCallDeletePoLine(entity: Entity ) {
    var request: Request = {
      url: entity.link,
      method: HttpMethod.GET
    };
    this.restService.call(request).subscribe({
      next: result => {
        this.apiResult = result;
        let jsonResultAsString = JSON.stringify(result);
        let parsedToJSON = JSON.parse(jsonResultAsString);
        let poLineCode = parsedToJSON.number;
        let url = "/acq/po-lines/" + poLineCode;
//       this.sendTestPoLineUpdate(url); //TODO SKAL TILRETTES MED DEN NYE VENFOR OG OPDATERES.
        // this.refreshPage();
      },
      error: (e: RestErrorResponse) => {
        this.alert.error('Failed to get data from ' + entity.link);
        console.error(e);
        this.loading = false;
      },
      complete: () => {
        this.alert.error('3. Data OK from ' + entity.link);
      }
    });
  }

  private getNewVendorDetails(link: url) {
    var request: Request = {
      url: link.toString(),
      method: HttpMethod.GET
    };
    this.restService.call(request).subscribe({
      next: result => {
        this.apiResult = result;
        const vendorDetailsResultAsString = JSON.stringify(result);
        this.newVendorDetailsJson = JSON.parse(vendorDetailsResultAsString);
      },
      error: (e: RestErrorResponse) => {
        this.alert.error('Failed to get data from ' + link);
        console.error(e);
        this.loading = false;
      },
      complete: () => {
        this.alert.error('3. Data OK from ' + link);
      }
    });
  }

  private tryParseJson(value: any) {
    try {
      return JSON.parse(value);
    } catch (e) {
      console.error(e);
    }
    return undefined;
  }

  ShowSelected() {
    this.selectedEntities.forEach(entity => {
      this.sendGetRequest(entity);
    })
  }

  GetVendorFromSelectedPoline() {
    this.selectedEntities.forEach(entity => {
      this.getPolineDetails(entity);
    })
  }


  SetNewVendor() {
      this.sendTestPoLineUpdate();
  }

  search(vendorNameSearchString: string) {
    this.showSearchVendorResult = true;
    this.searchVendors(vendorNameSearchString, '1LR');
  }

  private searchVendors(vendorNameSearchString: string, vendorType: string ) {
    this.foundVendors = new Array<VendorFields>();
    this.vendorsFound = false;
    let url = "/acq/vendors/";
    let queryParamValue= "name~"+vendorNameSearchString;
    // let queryParamValue= "code~1LR%20AND%20name~Ringhof";
    // let queryParamValue= "name~Ringhof"; OK
    // let queryParamValue= "code~1LR";     OK
    console.log('searchVendors: queryparam: ' + queryParamValue);
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
        this.apiResult = result;
        let jsonResultAsString = JSON.stringify(result);
        let parsedToJSON = JSON.parse(jsonResultAsString);
        const total_record_count = parseInt(parsedToJSON.total_record_count);
        const mandatoryVendorCodeSubstring = "1CE";
        if(total_record_count > 0){
          let foundVendorsCounter = 0;
          for (let i = 0; i < parsedToJSON.vendor.length; i++) {
            const tmpVendorCode = parsedToJSON.vendor[i].code;
            console.log("tmpVendorCode: " + tmpVendorCode);
            if(tmpVendorCode.includes(mandatoryVendorCodeSubstring)){
              let tempVendorFields = new VendorFields(tmpVendorCode, parsedToJSON.vendor[i].name, parsedToJSON.vendor[i].link);
              this.foundVendors[foundVendorsCounter]=tempVendorFields;
              this.vendorsFound = true;
              console.log("Fundet");
              foundVendorsCounter++;
            }
          }
        }
        if(this.vendorsFound) {
          console.log(this.foundVendors.length + " vendors found");
        }else {
          console.log("No vendors Found");
        }
      },
      error: (e: RestErrorResponse) => {
        this.alert.error('Failed to get data from search: ' + vendorNameSearchString);
        console.error(e);
        this.loading = false;
      },
      complete: () => {
        // this.alert.info('4. Data OK from search: ' + searchString);
      }
    });
  }

  submitJJ() {
    this.GetVendorFromSelectedPoline();
  }

  vendorSelected($event: MatRadioChange, link: url) {
    this.selectedNewVendorLink = link;
    this.getNewVendorDetails(link)
    console.log("vendorSelected: " + link);
  }

  poLineSelected($event: MatRadioChange, entity: Entity) {
    this.selectedPoLine = entity;
    console.log("PoLine selected: " + entity.description);
    this.getPolineDetails(entity);
    this.showPoLines = false;
  }

  clear() {
    this.showPoLines = true;
    this.vendorSearchString = "";
    this.selectedPoLine = null;
    this.foundVendors = new Array<VendorFields>();
    this.selectedVendorType = "";
    this.showSearchVendorResult = false;
  }

  vendorTypeSelected($event: MatRadioChange, typeName: string) {
      console.log("vendorTypeSelected: " + typeName);
      this.selectedVendorType = typeName;
  }
}
