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

  private sendGetRequest(entity: Entity) {
    //TODO: work in progress
    let url = entity.link;
    let request: Request = {
      url: url,
      method: HttpMethod.GET
    };
    this.restService.call(request).subscribe({
      next: result => {
        let jsonResultAsString =  JSON.stringify(result);
        let parsedToJSON = JSON.parse(jsonResultAsString);
        this.alert.success("Vendor: " + parsedToJSON.vendor.value + ",  "+ parsedToJSON.vendor.desc);
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

  private sendDeleteRequest(entity: Entity) {
    let poLineString = "" + entity.description + ", Id: " + entity.id;
    let id = entity.id;
    let url = "/acp/po-lines/" + entity.id;
    let request: Request = {
      url: url,
      method: HttpMethod.DELETE,
      queryParams: {["reason"]:"LIBRARY_CANCELLED"}
    };
    console.log("Request: " + request);//DELETE http://localhost:4200/almaws/v1/acp/po-lines/22993180260005763?reason=LIBRARY_CANCELLED&_=1639464026197 TODO:Why this: "&_=1639464026197 "
    this.restService.call(request).subscribe({ //TODO: FAILS
      next: result => {
        this.deletedEntities.push(id);
        this.alert.success("Vendor is deleted: " + poLineString, { autoClose: false });
        this.refreshPage();
      },
      error: (e: RestErrorResponse) => {
        this.alert.error('Failed to delete vendor: ' + poLineString);
        console.error(e);
        this.loading = false;
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
      this.sendDeleteRequest(entity);
    })
    this.alert.success("Id's deleted: " + this.deletedEntities);
  }


}
