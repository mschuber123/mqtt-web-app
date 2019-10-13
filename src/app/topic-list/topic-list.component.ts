import { Component, OnInit } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { CONNECT_STATE } from '../mqtt/mqtt.service';
import { TopicListService, Topic } from '../topic/topic-list.service';
import { MatGridListModule } from '@angular/material/grid-list';
import { MatCheckboxModule } from '@angular/material/checkbox';

@Component({
  selector: 'app-topic-list',
  templateUrl: './topic-list.component.html',
  styleUrls: ['./topic-list.component.css']
})

export class TopicListComponent implements OnInit {

  public topicArray: Array<any>;
  public mqttConnectionState$: BehaviorSubject<CONNECT_STATE>;
  private connectedToListService : boolean = false;
  public breakpoint : number = 2;

  constructor(private topicListService: TopicListService) {
    this.mqttConnectionState$ = this.topicListService.mqttConnectionState$;
    this.mqttConnectionState$.subscribe(
      state => this._on_mqtt_connectionState_changed(state),
      err => this._on_mqtt_connectionState_error(err),
      () => this._on_mqtt_connectionState_closed()
    )
    this.topicListService.topicArray$.subscribe(
      data => { this.topicArray = data; console.log('UI-COMPONENT NEW DATA...') },
      err => console.log(err),
      () => console.log("TopicListComponent completed!")
    )
  }

  ngOnInit() {
    let innerWidth = window.innerWidth;
    console.log('HELLO TopicListComponent... innerWidth='+innerWidth);
    this.breakpoint = (innerWidth <= 600) ? 1 : 2;
    this.topicListService.connect();
    this.connectedToListService = true;
  }s

  private _on_mqtt_connectionState_changed(state: CONNECT_STATE) {
    console.log('TopicListComponent::_on_mqtt_connectionState_changed ' + state);
    if (this.connectedToListService && state == CONNECT_STATE.CONNECTED) {
      console.log('TopicListComponent DO-SUBSCRIBE...');
      this.topicListService.subscribe();
    }
  }
  private _on_mqtt_connectionState_error(err) {
    console.log('TopicListComponent::_on_mqtt_connectionState_err ' + err);
  }
  private _on_mqtt_connectionState_closed() {
    console.log('TopicListComponent::_on_mqtt_connectionState_closed !! ');
  }
}