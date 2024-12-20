
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
      console.log('GET ZIGBEE-DEVICES-DETAILS...' + topic.clientId);
      this.mqttMessages$.next({
        topic: 'zigbee2mqtt/' + topic.clientId + '/#',
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
    console.log('STEP TopicList #msgToken=' + msgToken.length + ' #Topic=' + topics.length);

    // subscribe for new Zigbee devices
    if (clientId.indexOf("bridge") != -1) {
      let device_topics = new Array<string>();
      let qos = new Array<number>();
      topics.forEach(element => {
        if (element['friendly_name'] !== undefined) {
          console.log('STEP NEW ZIGBEE-Device ' + element['friendly_name']);
          device_topics.push('zigbee2mqtt/' + element['friendly_name']);
          qos.push(0);
          device_topics.push('zigbee2mqtt/' + element['friendly_name'] + '/availability');
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

  private _getKeyFromObj(topic: Topic, obj: Object, prefix: String = '') {
    Object.keys(obj).forEach(key => {
      typeof obj[key] !== 'object' ?
        topic[prefix + key] = obj[key] + '' :
        obj[key] !== null ?
          this._getKeyFromObj(topic, obj[key], key + '_') :
          noop;
    });
  }

  private _updateList(vorlage: Topic) {

    var found = this.topicMap.has(vorlage.clientId);

    var topic: Topic;
    topic = found ? this.topicMap.get(vorlage.clientId) : new Topic;

    this._getKeyFromObj(topic, vorlage)

    // new Topic ?
    if (!found) {
      this.topicMap.set(topic.clientId, topic);
      Object.keys(topic).forEach(key => {
        console.log("NEW-TOPIC " + topic.clientId + "[" + key + "]=" + topic[key]);
        if (topic[key] === "genOnOff" || key === "POWER" || key === "POWER1")
          topic['genOnOff'] = true;
        if (topic[key] === "lightingColorCtrl")
          topic['lightingColorCtrl'] = true;
        if (topic[key] === "genLevelCtrl")
          topic['genLevelCtrl'] = true;
        if (topic[key] === "closuresWindowCovering")
          topic['closuresWindowCovering'] = true;
      });

      if (topic['availability'] === 'online') {
        this.mqttMessages$.next(
          {
            topic: 'cmnd/' + vorlage.clientId + '/status',
            payload: '11'
          });
      }
    }

    let shutterPositionChanged : Boolean = false;

    Object.keys(vorlage).forEach(key => {
      console.log("UPDATE-TOPIC " + topic.clientId + "[" + key + "]=" + topic[key]);
      if (key === 'position') shutterPositionChanged = true;
    });
    if (topic['availability'] === 'online' && topic['color_mode'] == "xy") {
      let color_rgb = ColorConverter.xyBriToRgb(topic["color_x"], topic["color_y"], topic["brightness"]);
      topic['color_hex'] = "#" +
        Math.min(color_rgb.r, 255).toString(16).slice(0, 2) +
        Math.min(color_rgb.g, 255).toString(16).slice(0, 2) +
        Math.min(color_rgb.b, 255).toString(16).slice(0, 2);
      console.log("UPDATE-COLOR " + topic.clientId + " RGB(" + color_rgb.r + ',' + color_rgb.g + ',' + color_rgb.b + ')');
      console.log("UPDATE-COLOR " + topic.clientId + " HEX=" + topic['color_hex']);
    }
    if (shutterPositionChanged) {
      console.log("shutterPositionChanged ...pos="+topic['position']+" lastPos="+topic['last_position'])
      if (topic['last_position'] !== undefined ) {
        // shutter position 100=OPEN 0=CLOSE
        if (topic['position'] > topic['last_position']) {
          // shutter rolling up ?
          console.log("UPDATE-SHUTTER " + topic.clientId + " rolling up!");
          topic['shutter_up_color'] = "accent";
          topic['shutter_down_color'] = "gray";
        } else if (topic['position'] < topic['last_position']) {
          console.log("UPDATE-SHUTTER " + topic.clientId + " rolling down!");
          topic['shutter_up_color'] = "gray";
          topic['shutter_down_color'] = "accent";
        } else {
          console.log("UPDATE-SHUTTER " + topic.clientId + " NOT rolling!");
          topic['shutter_up_color'] = "gray";
          topic['shutter_down_color'] = "gray";
        }
      }
      setTimeout(() => {
        console.log("ShutterPositionChanged-Timeout 20 sec..."+ topic.clientId);
        if (topic['last_position'] == topic['position']) {
          topic['shutter_up_color'] = "gray";
          topic['shutter_down_color'] = "gray";
          this.topicArray$.next(Array.from(this.topicMap.values()));
        }
      }, 20000);
      topic['last_position'] = topic['position'];
    }
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

class ColorConverter {
  static xyBriToRgb(x, y, bri) {

    console.log("ColorConverter.xyBriToRgb x=" + x + " y=" + y + " bri=" + bri);

    function getReversedGammaCorrectedValue(value) {
      return value <= 0.0031308 ? 12.92 * value : (1.0 + 0.055) * Math.pow(value, (1.0 / 2.4)) - 0.055;
    }

    let xy = {
      x: x,
      y: y
    };

    let z = 1.0 - xy.x - xy.y;
    let Y = bri / 255;
    let X = (Y / xy.y) * xy.x;
    let Z = (Y / xy.y) * z;
    let r = X * 1.656492 - Y * 0.354851 - Z * 0.255038;
    let g = -X * 0.707196 + Y * 1.655397 + Z * 0.036152;
    let b = X * 0.051713 - Y * 0.121364 + Z * 1.011530;

    r = getReversedGammaCorrectedValue(r);
    g = getReversedGammaCorrectedValue(g);
    b = getReversedGammaCorrectedValue(b);

    return { r: parseInt((r * 255).toString()), g: parseInt((g * 255).toString()), b: parseInt((b * 255).toString()) };
  }
}
