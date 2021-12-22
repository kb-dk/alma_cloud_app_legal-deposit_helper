import { Component, OnInit } from '@angular/core';
import { CloudAppRestService, RestErrorResponse } from '@exlibris/exl-cloudapp-angular-lib';
import { map, catchError, switchMap, tap } from 'rxjs/operators';
import { of, forkJoin, Observable } from 'rxjs';
import { AppService } from '../app.service';
import {AbstractControl, FormArray, FormBuilder, FormControl, FormGroup} from "@angular/forms";

@Component({
  selector: 'app-parallel',
  templateUrl: './parallel.component.html',
  styleUrls: ['./parallel.component.scss']
})
export class ParallelComponent implements OnInit {
  users: any[];
  usersNotLoaded: string[];
  selectedFormControls = [];
  num = 10;
  loading = false;
  processed = 0;
  showProgress = false;
  numberOfErrors: 0;
  private altNumberOfErrors: 0;
  myForm: FormGroup;

  constructor(private restService: CloudAppRestService, private appService: AppService, private formBuilder: FormBuilder) {
  this.myForm = this.formBuilder.group({
    firstName: new FormControl(''),
    lastName: new FormControl(''),
  })

    console.log("Yes JJ")
    this.myForm = this.formBuilder.group({
      myOptionsArray: this.formBuilder.array([
        this.formBuilder.group({id: 1, name: 'Option 1', selected: false}),
        this.formBuilder.group({id: 2, name: 'Option 2', selected: false}),
        this.formBuilder.group({id: 3, name: 'Option 3', selected: false})
      ])
    })
    this.myForm.controls.myOptionsArray.value.forEach(tmpValue => {console.log(tmpValue.name)})
    console.log(this.myForm.controls.myOptionsArray.value);
  }

  get myOptionsArray() {
    return this.myForm.get('myOptionsArray') as FormArray;
  }

  ngOnInit() {
    this.appService.setTitle('Parallel Requests');
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
            map(users=>this.addErrors(users.user).map(user=>this.getUser(user))), //danner et map af requests (før det tilføjes fejlobjekter)
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

  // Tilføjer 25% brugere med ikke eksisterende id:
  addErrors(users: any[]) {
    for (let i=0; i<Math.floor(users.length*.25); i++) {
      users.splice(getRandomInt(users.length-1), 0, { primary_id: getRandomInt(1000000), name: 'hest' });
    };
    return users;
  }

  get percentComplete() {
    return Math.round((this.processed/this.num)*100)
  }


  onCheckboxChange(id: AbstractControl) {
    this.selectedFormControls = [];
    this.myOptionsArray.controls.forEach(option =>{
      if(option.get('selected').value === true){
        console.log("id: " + option.get('id').value + '  Selected: ' + option.get('selected').value);
        this.selectedFormControls.push(option);
      }
    })
  }
}

const getRandomInt = (max: number)  => Math.floor(Math.random() * Math.floor(max));
const isRestErrorResponse = (object: any): object is RestErrorResponse => 'error' in object;
