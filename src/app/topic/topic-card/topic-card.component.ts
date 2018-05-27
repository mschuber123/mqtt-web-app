import { Component, OnInit, Input } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { TopicListService, Topic } from '../topic-list.service';
import { MatCardModule } from '@angular/material/card';


@Component({
  selector: 'app-topic-card',
  templateUrl: './topic-card.component.html',
  styleUrls: ['./topic-card.component.css']
})
export class TopicCardComponent implements OnInit {

  @Input('topic') topic : any;

  public topicCmd$ = new BehaviorSubject<Topic>(new Topic);

  constructor(private topicListService : TopicListService) {
    this.topicCmd$ = topicListService.topicCmd$;
  }

  ngOnInit() {
  }
  public power1Clicked() {
    console.log('TopicCardComponent '+this.topic.clientId+' Power1-Clicked...');
    let mtopic = new Topic();
    mtopic.clientId = this.topic.clientId;
    mtopic.cmd = 'POWER1';
    // toggle state
    mtopic.cmdPayload = this.topic.POWER1==='ON' ? '0' : '1';
    this.topicCmd$.next(mtopic);
  }
  public power2Clicked() {
    console.log('TopicCardComponent '+this.topic.clientId+' Power2-Clicked...');
    let mtopic = new Topic();
    mtopic.clientId = this.topic.clientId;
    mtopic.cmd = 'POWER2';
    // toggle state
    mtopic.cmdPayload = this.topic.POWER2==='ON' ? '0' : '1';
    this.topicCmd$.next(mtopic);
  }

}
