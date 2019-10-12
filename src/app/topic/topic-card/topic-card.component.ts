import { Component, OnInit, Input } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { TopicListService, Topic } from '../topic-list.service';


@Component({
  selector: 'app-topic-card',
  templateUrl: './topic-card.component.html',
  styleUrls: ['./topic-card.component.css']
})
export class TopicCardComponent implements OnInit {

  @Input('topic') topic : any;
  disabled = false;
  showTicks = false;
  step = 1;
  min = 1;
  thumbLabel = true;

  public topicCmd$ = new BehaviorSubject<Topic>(new Topic);

  constructor(private topicListService : TopicListService) {
    this.topicCmd$ = topicListService.topicCmd$;
  }

  ngOnInit() {
    Object.keys(this.topic).forEach(key => {
      console.log("TOPIC-CARD ngOnInit "+this.topic.clientId+" ["+key+"]="+this.topic[key]);
    });

  }
    
  public onInputChange(event: any) {
    console.log("This is emitted as the thumb slides "+event.value);
  }
  
  public onLuminosityChange(event:any){
    console.log("This is emitted as the thumb slides "+event.value);
    let mtopic = new Topic();
    mtopic.clientId = this.topic.clientId;
    mtopic.cmd = 'set';
    mtopic.prefix = 'zigbee2mqtt';
    // set brightness
    mtopic.cmdPayload = '{"brightness":'+event.value+'}';
    this.topicCmd$.next(mtopic);
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
