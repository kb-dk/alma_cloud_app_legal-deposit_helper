import { Subscription } from 'rxjs';
import { Component, OnInit, OnDestroy } from '@angular/core';
import {
  CloudAppRestService, CloudAppEventsService, Request, HttpMethod,
  Entity, PageInfo, RestErrorResponse, AlertService
} from '@exlibris/exl-cloudapp-angular-lib';
import {AppService} from "../app.service";
import {ToastrService} from "ngx-toastr";

@Component({
  selector: 'app-poline',
  templateUrl: './poline.component.html',
  styleUrls: ['./poline.component.scss']
})
export class POlineComponent implements OnInit, OnDestroy {
  private count = 0;
  private pageLoad$: Subscription;
  private pageEntities: Entity[];
  private _apiResult: any;
  private selectedEntities = new Array<Entity>();
  private deletedEntities = new Array<String>();

  hasApiResult: boolean = false;
  loading = false;

  constructor(
    private appService: AppService,
    private restService: CloudAppRestService,
    private eventsService: CloudAppEventsService,
   // private toastr: ToastrService,
    private alert: AlertService ) { }

  ngOnInit() {
    this.pageLoad$ = this.eventsService.onPageLoad(this.onPageLoad);
    this.appService.setTitle('Select PO-lines and press Delete Selected');
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

  update(value: any) {
    this.loading = true;
    let requestBody = this.tryParseJson(value);
    if (!requestBody) {
      this.loading = false;
      return this.alert.error('Failed to parse json');
    }
    this.sendUpdateRequest(requestBody);
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

  private sendUpdateRequest(requestBody: any) {
    let request: Request = {
      url: this.pageEntities[0].link,
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

  private sendPoLineUpdateRequest(link: string, requestBody: any) {
    let request: Request = {
      url: link,
      method: HttpMethod.PUT,
      requestBody
    };
    this.restService.call(request).subscribe({
      next: result => {
        this.alert.success("PO-line updated")
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
    //TODO: work in progress
    console.log("sendGetRequest -> Link: " + entity.link);
    let url = entity.link;
    let request: Request = {
      url: url,
      method: HttpMethod.GET
    };
    this.restService.call(request).subscribe({
      next: result => {
        if(url.includes("po-lines")){
          this.poLineStuff(result);
        } else{
          this.apiResult = result;
        }
        // this.refreshPage();
      },
      error: (e: RestErrorResponse) => {
        this.alert.error('Failed to get data');
        console.error(e);
        this.loading = false;
      }
    });
  }

  private sendGetRequestFromLink(link: string) {
    //TODO: work in progress
    console.log("sendGetRequest -> Link: " + link);
    let request: Request = {
      url: link,
      method: HttpMethod.GET
    };
    this.restService.call(request).subscribe({
      next: result => {
        console.log("bibData fundet")
          this.apiResult = result;
        // this.refreshPage();
      },
      error: (e: RestErrorResponse) => {
        this.alert.error('Failed to get data from ' + link);
        console.error(e);
        this.loading = false;
      },
      complete: () => {
        this.alert.error('Data OK from ' + link);
      }
    });
  }

  private sendTestPoLineUpdate(link: string) {
    //TODO: work in progress
    console.log("sendGetRequest -> Link: " + link);
    let request: Request = {
      url: link,
      method: HttpMethod.GET
    };
    this.restService.call(request).subscribe({
      next: result => {
        let jsonResultAsString = JSON.stringify(result);
        var parsedToJSON = JSON.parse(jsonResultAsString);
        var vendorMessage = "Vendor: " + parsedToJSON.vendor.value + ",  " + parsedToJSON.vendor.desc + "  Account: " + parsedToJSON.vendor_account;
        console.log("FØR: " +vendorMessage);
        parsedToJSON.vendor.value = "1AAKS";
        parsedToJSON.vendor.desc = "Aalborg Kommune";
        parsedToJSON.vendor_account = "1AAKS";
        vendorMessage = "Vendor: " + parsedToJSON.vendor.value + ",  " + parsedToJSON.vendor.desc + "  Account: " + parsedToJSON.vendor_account;
        console.log("EFTER: " +vendorMessage);
        let updatedJson = JSON.stringify(parsedToJSON);
        console.log('updatedJson: ' +updatedJson);
        this.update(updatedJson);//update parser selv til JSON...
        this.refreshPage();
      },
      error: (e: RestErrorResponse) => {
        this.alert.error('Failed to get data from ' + link);
        console.error(e);
        this.loading = false;
      },
      complete: () => {
        this.alert.error('Data OK from ' + link);
      }
    });
  }

/*
  private sendTestPoLineDelete(link: string) {
    //TODO: work in progress
    console.log("sendGetRequest -> Link: " + link);
    let request: Request = {
      url: link,
      method: HttpMethod.GET
    };
    this.restService.call(request).subscribe({
      next: result => {
        let jsonResultAsString = JSON.stringify(result);
        var parsedToJSON = JSON.parse(jsonResultAsString);
        this.sendDeleteRequestString("");//update parser selv til JSON...
        this.refreshPage();
      },
      error: (e: RestErrorResponse) => {
        this.alert.error('Failed to get data from ' + link);
        console.error(e);
        this.loading = false;
      },
      complete: () => {
        this.alert.error('Data OK from ' + link);
      }
    });
  }
*/

  private poLineStuff(result) {
    let jsonResultAsString = JSON.stringify(result);
    let parsedToJSON = JSON.parse(jsonResultAsString);
    let mmsId = parsedToJSON.resource_metadata.mms_id.value;//TODO: Bruges til at gafle felt 280b
    let linkToBibPost = parsedToJSON.resource_metadata.mms_id.link;//TODO: Bruges til at gafle felt 280b
    let mmsMessage = "MMS: " + mmsId + "  link: " + linkToBibPost;
    this.alert.success(mmsMessage);
    console.log(mmsMessage);
    let vendorMessage = "Vendor: " + parsedToJSON.vendor.value + ",  " + parsedToJSON.vendor.desc;
    this.alert.success(vendorMessage);
    this.sendGetRequestFromLink(linkToBibPost)
    // this.apiResult = result;
  }

  private sendDeleteRequest(entity: Entity) {
    let poLineString = "" + entity.description + ", Id: " + entity.id;
    console.log(poLineString);
    let id = entity.id;
    let url = "/acq/po-lines/" + entity.id;
    let request: Request = {
      url: url,
      method: HttpMethod.DELETE,
      queryParams: {["reason"]:"LIBRARY_CANCELLED"}
    };
    console.log("Request: " + request);
    this.restService.call(request).subscribe({
      next: result => {
        this.deletedEntities.push(id);
        this.alert.success("PO-line is deleted: " + poLineString, { autoClose: false });
        this.refreshPage();
      },
      error: (e: RestErrorResponse) => {
        this.alert.error('Failed to delete PO-line: ' + poLineString);
        console.error(e);
        this.loading = false;
      },
      complete: () => {
        this.alert.success("PO-lines deleted: " + this.deletedEntities.length + " Id's are: " + this.deletedEntities);
      }
    });
  }
  private RENAMEsendDeleteRequestString(entity: Entity ) {
    //TODO: work in progress
    console.log("sendGetRequest -> Link: " + entity.link);
    var request: Request = {
      url: entity.link,
      method: HttpMethod.GET
    };
    this.restService.call(request).subscribe({
      next: result => {
        console.log("po-line data fundet")
        this.apiResult = result;
        let jsonResultAsString = JSON.stringify(result);
        let parsedToJSON = JSON.parse(jsonResultAsString);
        let poLineCode = parsedToJSON.number;
        let url = "/acq/po-lines/" + poLineCode;
        var deleteRequest: Request = {
          url: url,
          method: HttpMethod.DELETE,
          queryParams: {["reason"]:"LIBRARY_CANCELLED"}
        };
        console.log("DeleteUrl: " + url);
        this.restService.call(deleteRequest).subscribe({
          next: () => {
            this.deletedEntities.push(poLineCode);
            this.alert.success("PO-line is deleted: " + poLineCode, { autoClose: false });
            this.refreshPage();
          },
          error: (e: RestErrorResponse) => {
            this.alert.error('Failed to delete PO-line: ' + poLineCode);
            console.error(e);
            this.loading = false;
          },
          complete: () => {
            this.alert.success("PO-lines deleted: " + this.deletedEntities.length + " Id's are: " + this.deletedEntities);
          }
        });



        /*
                let url = "/acq/po-lines/" + entityId;
                let request2: Request = {
                  url: url,
                  method: HttpMethod.DELETE,
                  queryParams: {["reason"]:"LIBRARY_CANCELLED"}
                };
                console.log("DeleteUrl: " + url);
                this.restService.call(request).subscribe({
                  next: result => {
                    this.deletedEntities.push(entityId);
                    this.alert.success("PO-line is deleted: " + entityId, { autoClose: false });
                    this.refreshPage();
                  },
                  error: (e: RestErrorResponse) => {
                    this.alert.error('Failed to delete PO-line: ' + entityId);
                    console.error(e);
                    this.loading = false;
                  },
                  complete: () => {
                    this.alert.success("PO-lines deleted: " + this.deletedEntities.length + " Id's are: " + this.deletedEntities);
                  }
                });
        */







        // this.refreshPage();
      },
      error: (e: RestErrorResponse) => {
        this.alert.error('Failed to get data from ' + entity.link);
        console.error(e);
        this.loading = false;
      },
      complete: () => {
        this.alert.error('Data OK from ' + entity.link);
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
      console.log(entity.id);
      console.log(entity.link);
      this.sendGetRequest(entity);
    })
  }

  DeleteSelected() {
    this.deletedEntities = new Array<String>();
    this.selectedEntities.forEach(entity => {
      this.RENAMEsendDeleteRequestString(entity);
    })
  }

  SetNewVendor() {
    this.selectedEntities.forEach(entity => {
      let link = entity.link;
      this.sendTestPoLineUpdate(link);
    })
  }

}
