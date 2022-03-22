import {Component, OnInit} from '@angular/core';

import {
  AlertService,
  CloudAppEventsService,
  CloudAppRestService, CloudAppSettingsService,
  Entity,
  HttpMethod,
  PageInfo,
  Request,
  RestErrorResponse
} from '@exlibris/exl-cloudapp-angular-lib';
import {Subscription} from 'rxjs';
import {AppService} from '../app.service';
import {FormArray, FormBuilder, FormGroup} from "@angular/forms";
import SettingStatusClass from "../models/settings.constants";
import {Settings} from "../models/settings";

@Component({
  selector: 'app-cancel-poline',
  templateUrl: './cancelPoline.component.html',
  styleUrls: ['./cancelPoline.component.scss']
})
export class CancelPolineComponent implements OnInit {
  private REMOVE_STATUSES = [];
  private selectPolinesSubtitle: String
  private allPolinesForm: FormGroup;
  private deletePolinesForm: FormGroup;
  poLineProcessed = 0;
  private polinesNumberOfErrors: 0;
  loading = false;
  private pageLoad$: Subscription;
  private pageEntities: Entity[];
  private pageIsShowingPolines: boolean = false;
  private poLineDetails: any[] =[];//All polineDetails objects.
  private deletedOK: string[] = [];
  private deletedError: string[] = [];
  private settings: Settings;

  constructor(private restService: CloudAppRestService,
              private appService: AppService,
              private formBuilder: FormBuilder,
              private alert: AlertService,
              private eventsService: CloudAppEventsService,
              private settingsService: CloudAppSettingsService) {
  }

  onSubmit() {
    console.log(this.allPolinesForm.value);
  }

  ngOnInit() {
    this.initSettings();
    this.appService.setTitle('PO Lines - cancel');
    this.allPolinesForm=this.formBuilder.group({
      allPolines: this.formBuilder.array([]) ,
    });
    this.deletePolinesForm=this.formBuilder.group({
      deletePolines: this.formBuilder.array([]) ,
    });
    this.loading = true;
    this.pageLoad$ = this.eventsService.onPageLoad(this.onPageLoad);
  }

  private initSettings() {
    this.settingsService.get().subscribe(settings => {
      this.settings = settings as Settings;
      SettingStatusClass.statusses.forEach(tmpStatus => {
        if(settings[tmpStatus.status]){ //if found and true, we use the status as filter in REMOVE_STATUSES
          this.REMOVE_STATUSES.push(tmpStatus.status);
        }
      });
      if(this.REMOVE_STATUSES.length===1){
        this.selectPolinesSubtitle= 'PO Lines having status ' +  this.REMOVE_STATUSES[0] + ' are not shown!';
      }
      else if(this.REMOVE_STATUSES.length>1){
        var statusListString:string = 'PO Lines having status ' + this.REMOVE_STATUSES[0];
        for (let i = 1; i < this.REMOVE_STATUSES.length; i++) {
          if(i === this.REMOVE_STATUSES.length-1){
            statusListString += ' and ';
            statusListString += this.REMOVE_STATUSES[i];
            statusListString += '.';
          } else {
            statusListString += ' ,';
            statusListString += this.REMOVE_STATUSES[i];
          }
        }
        statusListString += ' are not shown!';
        this.selectPolinesSubtitle= statusListString;
      }
    });
  }

onPageLoad = (pageInfo: PageInfo) => {
    this.pageEntities = pageInfo.entities;
    this.loadPolineDetails();
    this.loading = false;
  }

  loadPolineDetails() {
    this.loading = true;
    this.poLineProcessed = 0;
    this.polinesNumberOfErrors = 0
    if(this.pageEntities.length>0 && this.pageEntities[0].link.toString().includes('/acq/po-lines')) {
      this.pageEntities.forEach(poline => {
        this.getAndFilterPolinesByStatus(poline);
      });
      this.pageIsShowingPolines = true;
    } else {
      this.pageIsShowingPolines = false;
    }
  }

  getAndFilterPolinesByStatus(entity: Entity) {
    let url = entity.link;
    let request: Request = {
      url: url,
      method: HttpMethod.GET
    };
    this.restService.call(request).subscribe({
      next: result => {
        const polineStatus = result.status.value;
        if(!(this.REMOVE_STATUSES.some(status => polineStatus === status))){//filter by status
          this.addAllPoLine(entity.id,entity.description, entity.link);
          this.poLineDetails.push(result); //Save full polineDetail
        }
      },
      error: (e: RestErrorResponse) => {
        console.error(e);
        this.loading = false;
      },
      complete: () => this.loading = false,
    });
  }

  cancelSelectedPolines() {
    this.loading = true;
    const numberOfDeletePolines = this.deletePolines().length;
    for (let i = 0; i < numberOfDeletePolines; i++) {
      const abstractControl = this.deletePolines().get([i]);
      const tmpLink = abstractControl.get('link').value;
      const tmpDescription = abstractControl.get('description').value;
        this.deletePoline(tmpLink, tmpDescription);
      }
    this.allPolines().clear()
    this.deletePolines().clear();
    this.loading = false;
  }


  private deletePoline(url: string, description) {
    var deleteRequest: Request = {
      url: url,
      method: HttpMethod.DELETE,
      queryParams: {["reason"]: "LIBRARY_CANCELLED"}
    };
    console.log('Deleting; ' + deleteRequest.url + '  ' +  JSON.stringify(deleteRequest.queryParams))
    this.restService.call(deleteRequest).subscribe({
      next: () => {
        console.log('Cancelled: ' + description);
        this.deletedOK.push(description);
      },
      error: (e: RestErrorResponse) => {
        const descAndErrorMessage = description.substring(0,25) + 'Error: ' + e.message;
        this.deletedError.push(descAndErrorMessage);
        console.log('Cancelled Error: ' + descAndErrorMessage);
      },
    });
  }

  allPolines(): FormArray {
    return this.allPolinesForm.get("allPolines") as FormArray
  }

  deletePolines(): FormArray {
    return this.deletePolinesForm.get("deletePolines") as FormArray
  }

  newAllPoline(id: string, description: string, link: string): FormGroup {
    return this.formBuilder.group({
      id: id,
      description: description,
      link: link,
    })
  }

  newDeletePoline(id: string, description: string, link: string): FormGroup {
    console.log('newDeletePoline: ' + link);
    return this.formBuilder.group({
      id: id,
      description: description,
      link: link,
    })
  }

  addAllPoLine(id: string, description: string, link: string) {
    this.allPolines().push(this.newAllPoline(id, description, link));
  }

  addDeletePoLine(id: string, description: string, link: string) {
    console.log('addDelete: poLineDetailsLink: ' + link)
    this.deletePolines().push(this.newDeletePoline(id, description, link));
  }

  removeFromAllPoLine(allPolinesIndex:number) {
    const abstractControl = this.allPolines().get([allPolinesIndex]);
    this.addDeletePoLine(abstractControl.get('id').value,abstractControl.get('description').value, abstractControl.get('link').value);
    this.allPolines().removeAt(allPolinesIndex);
  }

  undoRemoveFromAllPoLine(deletePolinesIndex: number) {
    const abstractControl = this.deletePolines().get([deletePolinesIndex]);
    this.addAllPoLine(abstractControl.get('id').value,abstractControl.get('description').value, abstractControl.get('link').value);
    this.deletePolines().removeAt(deletePolinesIndex);
  }

  selectAllGui() {
    for (let i = 0; i < this.allPolines().length; i++) {
      const abstractControl = this.allPolines().get([i]);
      this.addDeletePoLine(abstractControl.get('id').value,abstractControl.get('description').value, abstractControl.get('link').value);
    }
    this.allPolines().clear();
  }

  deselectAllGui() {
    for (let i = 0; i < this.deletePolines().length; i++) {
      const abstractControl = this.deletePolines().get([i]);
      this.addAllPoLine(abstractControl.get('id').value,abstractControl.get('description').value, abstractControl.get('link').value);
    }
    this.deletePolines().clear();
  }

  refreshPage(){
    this.deletedOK = [];
    this.deletedError = []
    this.ngOnInit();
  }
}
