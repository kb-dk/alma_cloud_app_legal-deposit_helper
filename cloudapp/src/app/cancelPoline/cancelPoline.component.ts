import {Component, OnInit} from '@angular/core';
import {Subscription} from 'rxjs';
import {AppService} from '../app.service';
import {FormArray, FormBuilder, FormGroup} from "@angular/forms";


import {
  AlertService,
  CloudAppEventsService,
  CloudAppRestService,
  Entity,
  HttpMethod,
  PageInfo,
  Request,
  RestErrorResponse
} from '@exlibris/exl-cloudapp-angular-lib';
@Component({
  selector: 'app-cancel-poline',
  templateUrl: './cancelPoline.component.html',
  styleUrls: ['./cancelPoline.component.scss']
})
export class CancelPolineComponent implements OnInit {
  private REMOVE_STATUSES = [];
  selectPolinesSubtitle: String
  allPolinesForm: FormGroup;
  deletePolinesForm: FormGroup;
  private poLineProcessed = 0;
  private polinesNumberOfErrors: 0;
  private remainsToBeLoaded: number; //counter, helping to control pageLoading overlay.
  pageLoading: boolean;
  private pageLoad$: Subscription;
  private pageEntities: Entity[];
  pageIsShowingPolines: boolean = false;
  private poLineDetails: any[] =[];//All polineDetails objects.
  deletedOK: string[] = [];
  deletedError: string[] = [];

  constructor(private restService: CloudAppRestService,
              private appService: AppService,
              private formBuilder: FormBuilder,
              private alert: AlertService,
              private eventsService: CloudAppEventsService) {
  }

  onSubmit() {
    console.log(this.allPolinesForm.value);
  }

  ngOnInit() {
    this.pageLoading = true;
    this.appService.setTitle('PO Lines - cancel');
    this.REMOVE_STATUSES = ["DELETED", "CLOSED", "CANCELLED"];//Pointless to mess with these
    this.selectPolinesSubtitle= 'PO Lines having status DELETED ,CLOSED and CANCELLED are not shown!';
    this.allPolinesForm=this.formBuilder.group({
      allPolines: this.formBuilder.array([]) ,
    });
    this.deletePolinesForm=this.formBuilder.group({
      deletePolines: this.formBuilder.array([]) ,
    });
    this.pageLoad$ = this.eventsService.onPageLoad(this.onPageLoad);
  }

  onPageLoad = (pageInfo: PageInfo) => {
    this.pageEntities = pageInfo.entities;
    this.deletedOK = [];
    this.deletedError = []
    this.clearPolinesFromFormArrays();
    this.loadPolineDetails();
  }

  clearPolinesFromFormArrays() {
    this.allPolines().clear();
    this.deletePolines().clear();
  }

  loadPolineDetails() {
    this.remainsToBeLoaded = this.pageEntities.length;
    this.pageLoading = true;
    this.poLineProcessed = 0;
    this.polinesNumberOfErrors = 0;
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
        this.remainsToBeLoaded--;
        const polineStatus = result.status.value;
        if(!(this.REMOVE_STATUSES.some(status => polineStatus === status))){//filter by status
          this.addAllPoLine(entity.id,entity.description, entity.link);
          this.poLineDetails.push(result); //Save full polineDetail
        }
        if(this.remainsToBeLoaded === 0){
          this.pageLoading= false;
        }
      },
      error: (e: RestErrorResponse) => {
        console.error(e);
        if(this.remainsToBeLoaded === 0){
          this.pageLoading= false;
        }
      },
    });
  }

  cancelSelectedPolines() {
    this.pageLoading = true;
    const numberOfDeletePolines = this.deletePolines().length;
    this.remainsToBeLoaded = numberOfDeletePolines;
    for (let i = 0; i < numberOfDeletePolines; i++) {
      const abstractControl = this.deletePolines().get([i]);
      const tmpLink = abstractControl.get('link').value;
      const tmpDescription = abstractControl.get('description').value;
      this.deletePoline(tmpLink, tmpDescription);
    }
    this.allPolines().clear()
    this.deletePolines().clear();
  }


  private deletePoline(url: string, description) {
    var deleteRequest: Request = {
      url: url,
      method: HttpMethod.DELETE,
      queryParams: {["reason"]: "LIBRARY_CANCELLED", ["override"]: "true"}
    };
    this.restService.call(deleteRequest).subscribe({
      next: () => {
        this.remainsToBeLoaded--;
        this.deletedOK.push(description);
        if(this.remainsToBeLoaded === 0){
          this.pageLoading = false;
        }
      },
      error: (e: RestErrorResponse) => {
        this.remainsToBeLoaded--;
        const descAndErrorMessage = description.substring(0,25) + 'Error: ' + e.message;
        this.deletedError.push(descAndErrorMessage);
        if(this.remainsToBeLoaded === 0){
          this.pageLoading = false;
        }
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

  clear(){
    this.pageLoad$ = this.eventsService.onPageLoad(this.onPageLoad);
  }

}

