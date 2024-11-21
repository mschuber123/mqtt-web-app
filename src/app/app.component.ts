import { Component } from '@angular/core';
import { UserService } from './user.service';
import { TopicListService } from './topic/topic-list.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  title = 'mqtt-web-app';

  constructor(
    public user : UserService,
    private router:Router,
    private topicListService : TopicListService)
  {
    this.router.navigate(['']);
  }

  public connect() {
    //console.log('do connect..');
    this.topicListService.connect();
    //this.topicListService.connect();
  }
  
  subscribe() {
    this.topicListService.subscribe();
  }

  disconnect() {
    this.topicListService.disconnect();
  }
}
