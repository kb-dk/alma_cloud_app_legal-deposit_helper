import { Component, OnInit } from '@angular/core';

import {
  AlertService,
  CloudAppEventsService,
  CloudAppRestService, Entity, HttpMethod,
  PageInfo, Request,
  RestErrorResponse
} from '@exlibris/exl-cloudapp-angular-lib';
import { map, catchError, switchMap, tap } from 'rxjs/operators';
import {of, forkJoin, Observable, Subscription} from 'rxjs';
import { AppService } from '../app.service';
import {AbstractControl, FormArray, FormBuilder, FormControl, FormGroup} from "@angular/forms";
import {JjComponent} from "../jj/jj.component";

@Component({
  selector: 'app-parallel',
  templateUrl: './parallel.component.html',
  styleUrls: ['./parallel.component.scss']
})
export class ParallelComponent implements OnInit {
  private REMOVE_STATUSES = ['CANCELLED', 'CLOSED'];
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

  constructor(private restService: CloudAppRestService,
              private appService: AppService,
              private formBuilder: FormBuilder,
              private alert: AlertService,
              private eventsService: CloudAppEventsService,) {
  }

  onSubmit() {
    console.log(this.allPolinesForm.value);
  }

  ngOnInit() {
    this.appService.setTitle('Cancel PoLines');
    this.allPolinesForm=this.formBuilder.group({
      allPolines: this.formBuilder.array([]) ,
    });
    this.deletePolinesForm=this.formBuilder.group({
      deletePolines: this.formBuilder.array([]) ,
    });
    this.loading = true;
    this.pageLoad$ = this.eventsService.onPageLoad(this.onPageLoad);
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
//        this.pageLoading = false; TODO: noget med noget complete
      }
    });  }

  cancelSelectedPolines() {
    const numberOfDeletePolines = this.deletePolines().length;
    for (let i = 0; i < numberOfDeletePolines; i++) {
      const abstractControl = this.deletePolines().get([i]);
      const tmpLink = abstractControl.get('link').value;
      const tmpDescription = abstractControl.get('description').value;
      /*
            console.log('detailsLink: ' + detailsLink);TODO: Det er dette link, der skal kaldes med til deletePoline. Der kan ryddes op!
            var polineToBeCancelled = this.poLineDetails.filter(tmpDetail => {
              if(detailsLink.includes(tmpDetail.number)){
                return tmpDetail;
              }
              return undefined;
            });
            if(polineToBeCancelled!== undefined){
              let poLineCode = polineToBeCancelled[0].number;
              console.log('polineToBeCancelled.number: ' + poLineCode);
              let url = "/acq/po-lines/" + poLineCode;
      */
        this.deletePoline(tmpLink, tmpDescription);
      }
    // }
    this.allPolines().clear()
    this.deletePolines().clear();
    // this.refreshPage();
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
      complete: () => {
        // this.alert.success("PO-lines deleted: " + this.deletedEntities.length + " Id's are: " + this.deletedEntities);
      }
    });
  }

  refreshPage = () => {
    this.loading = true;
    this.eventsService.refreshPage().subscribe({
      next: () => this.alert.success('Page refreshed!'),
      error: e => {
        console.error(e);
        this.alert.error('Failed to refresh page');
      },
      complete: () => this.loading = false
    });
  }

  allPolines(): FormArray {
    return this.allPolinesForm.get("allPolines") as FormArray
  }

  deletePolines(): FormArray {
    return this.deletePolinesForm.get("deletePolines") as FormArray
  }

  newAllPoline(id: string, description: string, link: string): FormGroup {
    console.log('initNewAllPoLine: ' + id);
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
}
