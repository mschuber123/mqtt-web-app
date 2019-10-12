import { Injectable } from '@angular/core';
import { Observable, Observer, BehaviorSubject } from 'rxjs';
import { WebsocketService } from '../websocket/websocket.service';
import { environment } from '../../environments/environment';
import { MqttprotocolService, MESSAGE_TYPE, CONNACK_RC, WireMessage, Message } from '../protocol/mqttprotocol.service';
import { TimerService } from '../timer/timer.service';
import { UserService } from '../user.service';

export enum CONNECT_STATE {
  NONE,
  CONNECTING,
  FAILED,
  CONNECTED,
  DISCONNECTING,
  DISCONNECTED
}
export class MqttMessage {
  topic: string;
  payload: string;
}

@Injectable()
export class MqttService {

  private connectOptions = {
    clientId: '',
    userName: '',
    password: '',
    keepAlive: 60,
    cleanSession: true,
    //lwTopic = ;
    //lwQos = ;
    //lwRetain : boolean = false;
    //lwMessage : string = '';
    ssl: true,
    keepAliveInterval: 60
  };
  //private selector : string = 'HIVEMQ';
  private selector: string = 'HOME';
  private connectionState: CONNECT_STATE = CONNECT_STATE.NONE;
  private nextMessageIdentifier: number = 0;
  private sentMessages: Object = {};

  // Interface WebsocketService
  private wsMessages$: BehaviorSubject<any>;

  // Interface TopicListService
  public mqttConnectionState = new BehaviorSubject<CONNECT_STATE>(CONNECT_STATE.NONE);
  private mqttSubject: BehaviorSubject<MqttMessage>;

  constructor(
    private wsService: WebsocketService,
    private user: UserService,
    private mqttProtocol: MqttprotocolService,
    private timerService: TimerService) {
    this.initTimer();
  }

  public mqttConnect(): BehaviorSubject<MqttMessage> {
    this.mqttSubject = this.createSubject();
    return this.mqttSubject;
  }

  public wsConnect() {
    if (this.user.getUserLoggedIn()) {
      this.connectOptions.userName = this.user.getUsername();
      this.connectOptions.password = this.user.getPassword();
      this.connectOptions.clientId = this.user.getUsername() + Math.floor(Math.random() * 1000);
      console.log("clientid=" + this.connectOptions.clientId);
      this.wsMessages$ = <BehaviorSubject<any>>this.wsService.connect(
        environment[this.selector].url,
        environment[this.selector].protocol);
      this.connectionState = CONNECT_STATE.DISCONNECTED;
      this.mqttConnectionState.next(this.connectionState);      
      this.wsMessages$.subscribe(
        ev => ev.type == 'open' ?
          this._on_ws_open() :
          this._on_ws_message(new Uint8Array(ev.data)),
        err => this._on_ws_error(err),
        () => this._on_ws_complete()
      )
    } else
      console.log('MqttService::wsConnect: No User logged in !!');
  }

  private _on_ws_open() {
    console.log('MqttService on_open..');
    this.connectionState = CONNECT_STATE.CONNECTING;
    this.mqttConnectionState.next(this.connectionState);
    this.sendConnectRequest();
  }

  private _on_ws_message(data: Uint8Array) {
    console.log('MQTT RECEIVE..');
    let mqttPacket = this.mqttProtocol.decode(data);
    console.log(mqttPacket);
    if (this.connectionState == CONNECT_STATE.CONNECTING &&
      mqttPacket.type != MESSAGE_TYPE.CONNACK) {
      console.log('MqttService unexpected packet received!');
      this.connectionState = CONNECT_STATE.FAILED;
      this.mqttConnectionState.next(this.connectionState);
    } else {
      switch (mqttPacket.type) {

        case MESSAGE_TYPE.CONNACK:
          console.log('MqttService ' + CONNACK_RC[mqttPacket.returnCode]);
          this.connectionState = mqttPacket.returnCode == 0 ?
            CONNECT_STATE.CONNECTED :
            CONNECT_STATE.FAILED;
          this.mqttConnectionState.next(this.connectionState);
          this.timerService.start(
            this.connectOptions.keepAliveInterval,
            this.connectOptions.keepAliveInterval / 2);
          this._ack_packet(mqttPacket);
          break;

        case MESSAGE_TYPE.PINGRESP:
          //console.log("PINGRESP received..");
          this.timerService.restart();
          break;

        case MESSAGE_TYPE.PUBLISH:
          //console.log('PUBLISH-DATA');
          //console.log(data);
          this._on_publish_received(mqttPacket);
          break;

        case MESSAGE_TYPE.PUBACK:
          if (this.sentMessages[mqttPacket.messageIdentifier] != undefined) {
            console.log('PUBACK RECEIVED ' +
              this.sentMessages[mqttPacket.messageIdentifier].payloadMessage.destinationName);
            this._ack_packet(mqttPacket);
          }
          break;
      }
    }
  }

  private _on_publish_received(wireMessage: WireMessage) {
    //console.log('_on_publish_received start... id='+wireMessage.messageIdentifier+
    //            ' qos='+wireMessage.payloadMessage.qos);
    let _payload: string = wireMessage.payloadToStr();
    let mqttMessage = new MqttMessage;
    mqttMessage.topic = wireMessage.payloadMessage.destinationName;
    mqttMessage.payload = _payload;
    //mqttMessage.payload = _payload.startsWith('{') ? JSON.parse(_payload) : _payload
    console.log('PUB_REC '+mqttMessage.topic+' PAYLOAD-STRING '+_payload);

    switch (wireMessage.payloadMessage.qos) {
      case "undefined":
      case 0:
        //this._receiveMessage(wireMessage);
        break;

      case 1:
        let pubAckMessage = new WireMessage(MESSAGE_TYPE.PUBACK);
        pubAckMessage.messageIdentifier = wireMessage.messageIdentifier;
        this.wsMessages$.next(this.mqttProtocol.encode(pubAckMessage));
        break;

      case 2:
        //this._receivedwsMessages$[wireMessage.messageIdentifier] = wireMessage;
        //this.store("Received:", wireMessage);
        let pubAckMessage1 = new WireMessage(MESSAGE_TYPE.PUBACK);
        pubAckMessage1.messageIdentifier = wireMessage.messageIdentifier;
        this.wsMessages$.next(this.mqttProtocol.encode(pubAckMessage1));
        break;

      default:
        throw Error("Invaild qos=" + wireMessage.payloadMessage.qos);
    }
    this.mqtt_publish_receive(mqttMessage);
  }

  public disconnect() {
    this.sendDisconnectRequest();
    this.connectionState = CONNECT_STATE.DISCONNECTED;
    this.mqttConnectionState.next(this.connectionState);    
    this.wsMessages$.complete();
  }
  private sendConnectRequest() {
    let mqttPacket =
      this.mqttProtocol.getMqttPacket(MESSAGE_TYPE.CONNECT, this.connectOptions);
    this.wsMessages$.next(this.mqttProtocol.encode(mqttPacket));
  }
  private sendDisconnectRequest() {
    let mqttPacket =
      this.mqttProtocol.getMqttPacket(MESSAGE_TYPE.DISCONNECT);
    this.wsMessages$.next(this.mqttProtocol.encode(mqttPacket));
  }
  private sendPingerRequest() {
    let mqttPacket =
      this.mqttProtocol.getMqttPacket(MESSAGE_TYPE.PINGREQ);
    this.wsMessages$.next(this.mqttProtocol.encode(mqttPacket));
  }
  public subscribe() {
    let mqttPacket =
      this.mqttProtocol.getMqttPacket(MESSAGE_TYPE.SUBSCRIBE);
    mqttPacket.messageIdentifier = ++this.nextMessageIdentifier;
    this.sentMessages[mqttPacket.messageIdentifier] = mqttPacket;
    mqttPacket.topics = environment[this.selector].topics;
    mqttPacket.requestedQos = environment[this.selector].qos;
    this.wsMessages$.next(this.mqttProtocol.encode(mqttPacket));
  }

  public subscribeDetails(topics :Array<string>, qos : Array<number>) {
    let mqttPacket =
      this.mqttProtocol.getMqttPacket(MESSAGE_TYPE.SUBSCRIBE);
    mqttPacket.messageIdentifier = ++this.nextMessageIdentifier;
    this.sentMessages[mqttPacket.messageIdentifier] = mqttPacket;
    mqttPacket.topics = topics;
    mqttPacket.requestedQos = qos;
    this.wsMessages$.next(this.mqttProtocol.encode(mqttPacket));
  }

  private createSubject(): BehaviorSubject<MqttMessage> {
    let observable = Observable.create(
      (observer: Observer<MqttMessage>) => {
        this.mqtt_publish_receive = observer.next.bind(observer);
        this.mqtt_error = observer.error.bind(observer);
        this.mqtt_close = observer.complete.bind(observer);
      }
    )/*.catch(err => {console.log(err);})*/

    let observer = {
      next: (data: MqttMessage) => {
        if (data != undefined) {
          this.mqtt_publish_send(data);
        }
      },
      complete: () => {
        this.mqtt_close();
      }
    }
    return BehaviorSubject.create(observer, observable);
  }

  private mqtt_publish_receive(value: MqttMessage): MqttMessage {
    console.log('mqtt_publish_receive: ' + value.topic + ' ' + value.payload);
    return value;
  }

  private mqtt_publish_send(value: MqttMessage) {
    console.log('STEP mqtt_publish_send: ' + value.topic + ' ' + value.payload);
    let mqttPacket =
      this.mqttProtocol.getMqttPacket(MESSAGE_TYPE.PUBLISH);
    mqttPacket.messageIdentifier = ++this.nextMessageIdentifier;
    let message: Message = new Message(value.payload);
    message.destinationName = value.topic;
    message.qos = 1;
    mqttPacket.payloadMessage = message;
    this.wsMessages$.next(this.mqttProtocol.encode(mqttPacket));
    this.sentMessages[mqttPacket.messageIdentifier] = mqttPacket;
  }

  private mqtt_error(value: string): string {
    return value;
  }
  private mqtt_close() {
  }

  private initTimer() {
    this.timerService.warn$.subscribe(
      value => this._on_timer_warning(value));
    this.timerService.expired$.subscribe(
      value => this._on_timer_expired(value));
  }
  private _ack_packet(mqttPacket: WireMessage) {
    if (this.sentMessages[mqttPacket.messageIdentifier] != undefined) {
      console.log('ACK received' +
        ' type ' + mqttPacket.type +
        ' msgId ' + mqttPacket.messageIdentifier);
      delete this.sentMessages[mqttPacket.messageIdentifier];
    }
  }

  private _on_timer_warning(value: number) {
    if (this.connectionState == CONNECT_STATE.CONNECTED) {
      this.sendPingerRequest();
    }
    // check waitForAckTimers
    for (var key in this.sentMessages) {
      if (++this.sentMessages[key].waitForAckTimer > 1) {
        console.log('ERROR TIMEOUT waitForAck' +
          ' type ' + this.sentMessages[key].type +
          ' msgId ' + this.sentMessages[key].messageIdentifier);
        delete this.sentMessages[key];
      }
    }
  }
  private _on_timer_expired(value: string) {
    if (this.connectionState == CONNECT_STATE.CONNECTED) {
      console.log('ERROR Connection timed out!!');
    }
  }
  private _on_ws_error(err) {
    console.log('MqttService on_error..');
    this.connectionState = CONNECT_STATE.FAILED;
    this.mqttConnectionState.next(this.connectionState);    
    console.log(err);
  }

  private _on_ws_complete() {
    console.log('MqttService _on_ws_complete..');
    this.connectionState = CONNECT_STATE.DISCONNECTED;
    this.mqttConnectionState.next(this.connectionState);    
    this.wsMessages$.unsubscribe();
    this.mqtt_close();
  }
}
