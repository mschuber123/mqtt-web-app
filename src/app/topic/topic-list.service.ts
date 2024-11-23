
import { Injectable } from '@angular/core';
import { BehaviorSubject, noop } from 'rxjs';
import { UserService } from '../user.service';
import { MqttService, MqttMessage, CONNECT_STATE } from '../mqtt/mqtt.service';
import { environment } from '../../environments/environment';

export class Topic {
  clientId: string = 'noname';
  lasttopic: string;
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
      this.mqttMessages$.subscribe({
        next: (msg) => this._on_message_receive(msg),
        error: (err) => this._on_error(err),
        complete: () => this._on_close()
      })
      this.connected = true;
    } else
      console.log('No User logged in !!');
  }

  public subscribe() {
    this.mqttService.subscribe();
    // 03.10.19 mschuber
    //this.getZigbeeDevices();
  }

  public disconnect() {
    this.mqttService.disconnect();
  }

  public getZigbeeDevices() {
    if (this.connected) {
      console.log('GET ZIGBEE-DEVICES...');
      this.mqttMessages$.next({
        topic: 'zigbee2mqtt/bridge/logging',
        payload: ''
      });
    }
  }

  public getZigbeeDevicesDetails(topic: Topic) {
    if (this.connected) {
      console.log('GET ZIGBEE-DEVICES-DETAILS...'+topic.clientId);
      this.mqttMessages$.next({
        topic: 'zigbee2mqtt/'+topic.clientId+'/#',
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
      console.log('NEW COMMAND ' + topicCmd.clientId + '/' + topicCmd.cmd);
      this.mqttMessages$.next({
        topic: topicCmd.prefix + '/' + topicCmd.clientId + '/' + topicCmd.cmd,
        payload: topicCmd.cmdPayload
      });
    }
  }

  private _on_message_receive(msg: MqttMessage) {
    let postfix = this._getPostfixFromTopic(msg.topic);
    let clientId = this._getClientIdFromTopic(msg.topic);
    let topics = new Array<Topic>();
    console.log('STEP TopicList::_on_message_receive...postfix=' + postfix + ' clientId=' + clientId);
    var msgToken = [];
    var obj = {};
    if (typeof msg.payload === 'object') {
      obj = msg.payload;
      msgToken.push(obj);
    } else if (String(msg.payload).startsWith('[')) {
      var parts = JSON.parse(msg.payload);
      parts.forEach(element => {
        msgToken.push(element);
      });
    } else if (String(msg.payload).startsWith('{')) {
      obj = JSON.parse(msg.payload);
      msgToken.push(obj);
    } else if (postfix != undefined) {
      console.log('STEP set obj.' + postfix + '=' + msg.payload);
      obj[postfix] = msg.payload;
      msgToken.push(obj);
    }
    msgToken.forEach(obj => {
      let topic = new Topic;
      topic.lasttopic = msg.topic;
      Object.keys(obj).forEach(key => {
          topic[key] = obj[key] + '';
      });
      topic.clientId = (topic['friendly_name'] === undefined) ?
         clientId : topic['friendly_name'];
      topics.push(topic);
      this._getKeyFromObj(topic, obj);
    });
    console.log('STEP TopicList #msgToken=' + msgToken.length+' #Topic='+topics.length);

    // subscribe for new Zigbee devices
    if (clientId.indexOf("bridge") != -1) {
      let device_topics = new Array<string>();
      let qos = new Array<number>();
      topics.forEach(element => {
        if (element['friendly_name'] !== undefined) {
          console.log('STEP NEW ZIGBEE-Device ' + element['friendly_name']);
          device_topics.push('zigbee2mqtt/'+element['friendly_name']);
          qos.push(0);
          device_topics.push('zigbee2mqtt/'+element['friendly_name']+'/availability');
          qos.push(0);
        }
      });
      this.mqttService.subscribeDetails(device_topics, qos);
    } 
    // update list of topics
    topics.forEach(topic => {
      if (postfix == 'LWT' || postfix == 'availability') {
        console.log("STEP SET-AVAILABILITY " + topic.clientId + "=" + msg.payload.toLocaleLowerCase());
       topic['availability'] = msg.payload.toLocaleLowerCase();
      }
      //console.log(topic);
      this._updateList(topic);
    })
  }

  private _getKeyFromObj(topic: Topic, obj: Object) {
  Object.keys(obj).forEach(key => {
    typeof obj[key] !== 'object' ?
      topic[key] = obj[key] + '' :
      obj[key] !== null ? 
         this._getKeyFromObj(topic, obj[key]) :
         noop;
    });
  }

  private _updateList(vorlage: Topic) {

  var found = this.topicMap.has(vorlage.clientId);
    
  var topic : Topic;
  topic = found ? this.topicMap.get(vorlage.clientId) : new Topic;
  
  this._getKeyFromObj(topic, vorlage)

  // new Topic ?
  if (! found) {
    this.topicMap.set(topic.clientId, topic);
    Object.keys(topic).forEach(key => {
      console.log("NEW-TOPIC " + topic.clientId + "[" + key + "]=" + topic[key]);
      if (topic[key] === "genOnOff" || key === "POWER" || key === "POWER1" ) 
        topic['onOffDevice'] = true;
    });

    if (topic['availability'] === 'online') {
      this.mqttMessages$.next(
        {
          topic: 'cmnd/' + vorlage.clientId + '/status',
          payload: '11'
        });
    }
  }

  Object.keys(vorlage).forEach(key => {
    console.log("UPDATE-TOPIC " + topic.clientId + "[" + key + "]=" + topic[key]);
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
