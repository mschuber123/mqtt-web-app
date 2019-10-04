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
  public stateClicked() {
    console.log('TopicCardComponent '+this.topic.clientId+' State-Clicked...');
    let mtopic = new Topic();
    mtopic.clientId = this.topic.clientId;
    mtopic.cmd = 'set';
    mtopic.prefix = 'zigbee2mqtt';
    // toggle state
    mtopic.cmdPayload = this.topic.state==='ON' ? 'OFF' : 'ON';
    this.topicCmd$.next(mtopic);
  }
  public powerClicked() {
    console.log('TopicCardComponent '+this.topic.clientId+' Power-Clicked...');
    let mtopic = new Topic();
    mtopic.clientId = this.topic.clientId;
    mtopic.cmd = 'POWER';
    mtopic.prefix = 'cmnd';
    // toggle state
    mtopic.cmdPayload = this.topic.POWER==='ON' ? '0' : '1';
    this.topicCmd$.next(mtopic);
  }
  public power1Clicked() {
    console.log('TopicCardComponent '+this.topic.clientId+' Power1-Clicked...');
    let mtopic = new Topic();
    mtopic.clientId = this.topic.clientId;
    mtopic.cmd = 'POWER1';
    mtopic.prefix = 'cmnd';
    // toggle state
    mtopic.cmdPayload = this.topic.POWER1==='ON' ? '0' : '1';
    this.topicCmd$.next(mtopic);
  }
  public power2Clicked() {
    console.log('TopicCardComponent '+this.topic.clientId+' Power2-Clicked...');
    let mtopic = new Topic();
    mtopic.clientId = this.topic.clientId;
    mtopic.cmd = 'POWER2';
    mtopic.prefix = 'cmnd';
    // toggle state
    mtopic.cmdPayload = this.topic.POWER2==='ON' ? '0' : '1';
    this.topicCmd$.next(mtopic);
  }

}
