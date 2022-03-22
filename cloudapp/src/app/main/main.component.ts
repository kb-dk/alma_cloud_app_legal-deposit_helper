import { Component, OnInit } from '@angular/core';
import { AppService } from '../app.service';
import { CloudAppEventsService } from '@exlibris/exl-cloudapp-angular-lib';
import {
  trigger,
  state,
  style,
  animate,
  transition
} from '@angular/animations';

@Component({
  selector: 'app-main',
  templateUrl: './main.component.html',
  styleUrls: ['./main.component.scss'],
  animations: [
    // the fade-in/fade-out animation.
    // the trigger name does not matter, but it must match the name of the [@...] attribute in the template.
    trigger('simpleFadeAnimation', [

      // the "in" style determines the "resting" state of the element when it is visible.
      // the style name "in" must match the value of the [@simpleFadeAnimation]="'in'" attribute in the template
      state('in', style({opacity: 1})),

      // fade in when created. this could also be written as transition('void => *')
      transition(':enter', [
        // the styles start from this point when the element appears
        style({opacity: 0}),
        // and animate toward the "in" state above
        animate(600 )
      ]),

      // fade out when destroyed. this could also be written as transition('void => *')
      transition(':leave',
          // fading out uses a different syntax, with the "style" being passed into animate()
          animate(600, style({opacity: 0})))
    ])
  ]
})
export class MainComponent implements OnInit {
  isAdmin = false;

  constructor(
    private appService: AppService,
    private eventsService: CloudAppEventsService
  ) { }

  ngOnInit() { 
    this.appService.setTitle('Home');
    this.eventsService.getInitData().subscribe(data=>this.isAdmin = data.user.isAdmin)
  }

}
