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

@Component({
  selector: 'app-parallel',
  templateUrl: './parallel.component.html',
  styleUrls: ['./parallel.component.scss']
})
export class ParallelComponent implements OnInit {
  private allPolinesForm: FormGroup;
  private deletePolinesForm: FormGroup;
  users: any[];
  usersNotLoaded: string[];
  poLineProcessed = 0;
  polinesNotLoaded: Entity[];
  private polinesNumberOfErrors: 0;
  selectedFormControls = [];
  num = 10;
  loading = false;
  processed = 0;
  showProgress = false;
  numberOfErrors: 0;
  private altNumberOfErrors: 0;
  myForm: FormGroup;
  private pageLoad$: Subscription;
  private pageEntities: Entity[];

  constructor(private restService: CloudAppRestService,
              private appService: AppService,
              private formBuilder: FormBuilder,
              private alert: AlertService,
              private eventsService: CloudAppEventsService,) {
    this.allPolinesForm=this.formBuilder.group({
      allPolines: this.formBuilder.array([]) ,
    })
    this.deletePolinesForm=this.formBuilder.group({
      deletePolines: this.formBuilder.array([]) ,
    })
/*
  this.myForm = this.formBuilder.group({
    firstName: new FormControl(''),
    lastName: new FormControl(''),
  })
*/

/*
    console.log("Yes JJ")
    this.myForm = this.formBuilder.group({
      myOptionsArray: this.formBuilder.array([
        this.formBuilder.group({id: 1, name: 'Option 1', selected: false, link: '/acq/po-lines/POL-97330'}),
        this.formBuilder.group({id: 2, name: 'Option 2', selected: false, link: '/acq/po-lines/POL-97331'}),
        this.formBuilder.group({id: 3, name: 'Option 3', selected: false, link: '/acq/po-lines/POL-97332'})
      ])
    })
    this.myForm.controls.myOptionsArray.value.forEach(tmpValue => {console.log(tmpValue.name)})
    console.log(this.myForm.controls.myOptionsArray.value);
*/
  }

//*****************************************************************'
  allPolines(): FormArray {
    return this.allPolinesForm.get("allPolines") as FormArray
  }

  deletePolines(): FormArray {
    return this.deletePolinesForm.get("deletePolines") as FormArray
  }

  newAllPoline(id: string, description: string, poLineDetailsLink: string): FormGroup {
    console.log('initNewAllPoLine: ' + id);
    return this.formBuilder.group({
      id: id,
      description: description,
      poLineDetailsLink: poLineDetailsLink,
    })
  }

  newDeletePoline(id: string, description: string, poLineDetailsLink: string): FormGroup {
    console.log('newDeletePoline: ' + poLineDetailsLink);
    return this.formBuilder.group({
      id: id,
      description: description,
      poLineDetailsLink: poLineDetailsLink,
    })
  }

  addAllPoLine(id: string, description: string, poLineDetailsLink: string) {
    this.allPolines().push(this.newAllPoline(id, description, poLineDetailsLink));
  }

  addDeletePoLine(id: string, description: string, poLineDetailsLink: string) {
    console.log('addDeletePoLine: ' + '  Id: ' + id + ' description: ' + description);
    this.deletePolines().push(this.newDeletePoline(id, description, poLineDetailsLink));
  }

  removeFromAllPoLine(allPolinesIndex:number) {
    const abstractControl = this.allPolines().get([allPolinesIndex]);
    this.addDeletePoLine(abstractControl.get('id').value,abstractControl.get('description').value, abstractControl.get('poLineDetailsLink').value);
    this.allPolines().removeAt(allPolinesIndex);
  }

  undoRemoveFromAllPoLine(deletePolinesIndex: number) {
    const abstractControl = this.deletePolines().get([deletePolinesIndex]);
    this.addAllPoLine(abstractControl.get('id').value,abstractControl.get('description').value, abstractControl.get('poLineDetailsLink').value);
    this.deletePolines().removeAt(deletePolinesIndex);
  }

  getAllPolineDescription(allPolinesIndex: number){
    const abstractControl = this.allPolines().get([allPolinesIndex]);
    console.log('allePolinesIndex: ' + allPolinesIndex);
    return abstractControl.get('description').value;
  }

  getDeletePolineDescription(deletePolinesIndex: number){
    const abstractControl = this.deletePolines().get([deletePolinesIndex]);
    console.log('deletePolinesIndex: ' + deletePolinesIndex);
    return abstractControl.get('description').value;
  }




  onSubmit() {
    console.log(this.allPolinesForm.value);
  }
//*****************************************************************'




  get myOptionsArray() {
    return this.myForm.get('myOptionsArray') as FormArray;
  }

  ngOnInit() {
    this.appService.setTitle('Cancel PoLines');
    this.loading = true;
    this.pageLoad$ = this.eventsService.onPageLoad(this.onPageLoad);
  }

  onPageLoad = (pageInfo: PageInfo) => {
    this.pageEntities = pageInfo.entities;
    this.loadPolineDetails();
    this.loading = false;
  }

  run() {
    this.users = [];
    this.usersNotLoaded = [];
    this.loadUsers();
  }

  loadUsers() {
    this.loading = true;
    this.processed = 0;
    this.numberOfErrors = 0;
    this.altNumberOfErrors = 0
    this.restService.call(`/users?limit=${this.num}`)                             //henter brugere fra alma
        .pipe(
            map(users=>map(user=>this.getUser(user))), //danner et map af requests (før det tilføjes fejlobjekter)
            switchMap(reqs=>forkJoin(reqs)),                                      //request sendes afsted parallelt
        )
        .subscribe({     //Vi behandler svaret fra request (getuser returnerer  enten en user eller et fejlobjekt)
          next: (s: any[])=>{
            s.forEach(user=>{
              if (isRestErrorResponse(user)) {  //fejlobjekt returneret
                console.log('Error retrieving user: ' + user.message);
                this.numberOfErrors++;
              } else {    //userObjekt returneret
                user.primary_id = 'false';
                this.users.push(user);
              }
            })
          },
          complete: () => this.loading=false,
        });
  }

  loadPolineDetails() {
    this.loading = true;
    this.poLineProcessed = 0;
    this.polinesNumberOfErrors = 0
    this.pageEntities.forEach(poline => this.getPolineDetails(poline))
  }

  clear() {
    this.users = [];
    this.usersNotLoaded =[];
  }

  //Returnerer et getUser request
  getUser(user: any) {
    return this.restService.call(`/users/${user.primary_id}?expand=fees`).pipe(
        tap(()=>this.processed++),        //Operator nr. 1 tæller processed op
        catchError(e => {              //Operator nr. 2
          this.altNumberOfErrors++;
          this.usersNotLoaded.push(user.primary_id);
          return of(e);                        //Wrapper eventuelle fejl i et  fejlobjekt
        }),
    )
  }

  //Returnerer et poLineDetails request
  getPolineDetails(entity: Entity) {
    const STATUS_CANCELLED = 'CANCELLED';
    let url = entity.link;
    let request: Request = {
      url: url,
      method: HttpMethod.GET
    };
    this.restService.call(request).subscribe({
      next: result => {
        const polineStatus = result.status.value;
        if(polineStatus !== STATUS_CANCELLED){
          console.log('Added!');
          this.addAllPoLine(entity.id,entity.description, entity.link);
        }
      },
      error: (e: RestErrorResponse) => {
        console.error(e);
//        this.pageLoading = false; TODO: noget med noget complete
      }
    });  }

  get percentComplete() {
    return Math.round((this.processed/this.num)*100)
  }

  onPoLineChecked(allPoLine: AbstractControl) {
    const checked = allPoLine.get('checked').value;
    const id = allPoLine.get('id').value;
  }

  cancelSelectedPolines() {
    const numberOfDeletePolines = this.deletePolines().length;
    for (let i = 0; i < numberOfDeletePolines; i++) {
      const abstractControl = this.deletePolines().get([i]);
      //TODO: implement call to cancel.
      console.log('cancelSelectedPolines(): ' + abstractControl.get('description').value);
    }
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
}

const getRandomInt = (max: number)  => Math.floor(Math.random() * Math.floor(max));
const isRestErrorResponse = (object: any): object is RestErrorResponse => 'error' in object;
