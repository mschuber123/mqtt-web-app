  
import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { UserService } from '../user.service';
import { MqttService, MqttMessage, CONNECT_STATE } from '../mqtt/mqtt.service';
import { environment } from '../../environments/environment';
import { post } from 'selenium-webdriver/http';


export class Topic {
  clientId: string = 'noname';
  lasttopic: string;
  online: boolean = false;
  prefix: string;
  cmd: string;
  cmdPayload: string;
}

@Injectable({
  providedIn: 'root'
})


export class TopicListService {

  // List of reported Topics
  private topicMap = new Map<string, Topic>();
  private selector: string = 'HOME';

  // Interface MqttService
  public mqttConnectionState$: BehaviorSubject<CONNECT_STATE>;
  private mqttMessages$: BehaviorSubject<MqttMessage>;

  private connected: boolean = false;

  // Interface UI-Component -> TopicListComponent
  public topicArray$ = new BehaviorSubject<Array<Topic>>(Array<Topic>());
  public topicCmd$ = new BehaviorSubject<Topic>(new Topic);

  constructor(private user: UserService, private mqttService: MqttService) {
    console.log("topicListService..");
    this.topicCmd$.subscribe(
      data => this._on_new_command(data),
      err => console.log(err),
      () => console.log("TopicCmd completed!")
    )
    this.mqttConnectionState$ = this.mqttService.mqttConnectionState;
    this.mqttConnectionState$.subscribe(
      state => this._on_mqtt_connectionState_changed(state),
      err => this._on_mqtt_connectionState_error(err),
      () => this._on_mqtt_connectionState_closed()
    )
  }

  public connect() {
    if (this.user.getUserLoggedIn()) {
      this.mqttService.wsConnect();
      this.mqttMessages$ = this.mqttService.mqttConnect();
      this.mqttMessages$.subscribe(
        msg => this._on_message_receive(msg),
        err => this._on_error(err),
        () => this._on_close()
      )
      this.connected = true;
    } else
      console.log('No User logged in !!');
  }

  public subscribe() {
    this.mqttService.subscribe();
    // 03.10.19 mschuber
    this.getZigbeeDevices();
  }

  public disconnect() {
    this.mqttService.disconnect();
  }

  public getZigbeeDevices() {
    if (this.connected) {
      console.log('GET ZIGBEE-DEVICES...');
      this.mqttMessages$.next({
        topic: 'zigbee2mqtt/bridge/config/devices',
        payload: ''
      });
    }
  }

  private _on_mqtt_connectionState_changed(state: CONNECT_STATE) {
    console.log('TopicListService::_on_mqtt_connectionState_changed ' + state);
  }
  private _on_mqtt_connectionState_error(err) {
    console.log('TopicListService::_on_mqtt_connectionState_err ' + err);
    this.connected = false;
  }
  private _on_mqtt_connectionState_closed() {
    console.log('TopicListService::_on_mqtt_connectionState_closed !! ');
    this.connected = false;
  }

  public _on_new_command(topicCmd: Topic) {
    if (this.connected) {
      console.log('NEW COMMAND '+ topicCmd.clientId + '/' + topicCmd.cmd);
      this.mqttMessages$.next({
        topic: topicCmd.prefix + '/' + topicCmd.clientId + '/' + topicCmd.cmd,
        payload: topicCmd.cmdPayload
      });
    }
  }

  private _on_message_receive(msg: MqttMessage) {
    let topic = new Topic;
    topic.lasttopic = msg.topic;
    let postfix = this._getPostfixFromTopic(msg.topic);
    topic.clientId = this._getClientIdFromTopic(msg.topic);
    var obj = {};
    if (typeof msg.payload === 'object') {
      obj = msg.payload;
    } else if (String(msg.payload).startsWith('{')) {
      obj = JSON.parse(msg.payload);
      Object.keys(obj).forEach(key => {
        topic[key] = obj[key];
      });
    } else if (postfix != undefined) {
      console.log('STEP set obj.'+postfix+'='+msg.payload);
      obj[postfix] = msg.payload;
    }
    if (topic.clientId.indexOf("bridge") != -1 && 
        obj['type'] == "devices") {
        Object.keys(obj).forEach(key => {
          if (obj[key].constructor.toString().indexOf("Array")!=-1)
            obj[key].forEach(device => {
              let topics = new Array<string>();
              let qos = new Array<number>();
              topics.push("zigbee2mqtt/"+device['friendly_name']);
              qos.push(0);
              this.mqttService.subscribeDetails(topics,qos);
            });
        });
    } else {
      this._getKeyFromObj(topic, obj);
      if (postfix == 'LWT') {
        topic.online = msg.payload.toLocaleLowerCase() == 'online' ? true : false;
      } else {
        topic.online = true;
      }
      //console.log(topic);
      this._updateList(topic);
    }
  }

  private _getKeyFromObj(topic: Topic, obj: Object) {
    Object.keys(obj).forEach(key =>
        typeof obj[key] === 'string' ?
          topic[key] = obj[key] :
          this._getKeyFromObj(topic, obj[key])
    );
  }

  private _updateList(vorlage: Topic) {
    let topic = this.topicMap.get(vorlage.clientId);
    if (topic != undefined) {
      Object.keys(vorlage).forEach(key => {
        topic[key] = vorlage[key];
      });    
    } else {
      this.topicMap.set(vorlage.clientId, vorlage);
      if (vorlage.online)
        this.mqttMessages$.next(
          {
            topic: 'cmnd/' + vorlage.clientId + '/status',
            payload: '11'
          });
      topic = this.topicMap.get(vorlage.clientId);
    }
    Object.keys(topic).forEach(key => {
      console.log("UPDATE-TOPIC "+topic.clientId+"["+key+"]="+vorlage[key]);
    });   
    this.topicArray$.next(Array.from(this.topicMap.values()));
  }

  private _getClientIdFromTopic(topic: string): string {
    let result = this._stripPrefixesFromTopic(topic);
    result = this._stripPostfixesFromTopic(result);
    return result;
  }
  private _stripPrefixesFromTopic(topic: string): string {
    let result = topic;
    environment[this.selector].prefixes.forEach(prefix => {
      prefix += '/';
      result = String(result).replace(prefix, '');
    });
    return result;
  }

  private _stripPostfixesFromTopic(topic: string): string {
    let result = topic;
    let tokens = result.split('/');
    let lastToken = tokens[tokens.length - 1];
    environment[this.selector].postfixes.forEach(postfix => {
      if (String(lastToken.toUpperCase).startsWith(postfix.toUpperCase)) {
        result = result.replace('/' + lastToken, '');
      }
    });
    return result;
  }

  private _getPostfixFromTopic(topic: string): string {
    var result;
    environment[this.selector].postfixes.forEach(postfix => {
      if (String(topic).endsWith(postfix)) {
        //console.log('STEP topic.'+topic+'.endswith.'+postfix);
        result = postfix;
      }
    });
    return result;
  }

  private _on_error(err) {
    console.log('topicListService ERROR ' + err);
  }

  private _on_close() {
    console.log('topicListService COMPLETED !!');
    this.connected = false;
    this.topicMap.clear();
    this.topicArray$.next(Array.from(this.topicMap.values()));
  }
}
