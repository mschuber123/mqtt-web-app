import { Injectable } from '@angular/core';
import {Observable, Observer, BehaviorSubject } from 'rxjs';

@Injectable()
export class WebsocketService {

  private socket : WebSocket;
  private subject : BehaviorSubject<MessageEvent>;

  constructor() { }

  public connect(url, protocol) : BehaviorSubject<MessageEvent> {
    if (!this.subject) {
     delete this.socket;
     delete this.subject;
    }
    this.subject = this.create(url, protocol);
    console.log("Websocket successfully (re-)connected to "+url+' '+protocol);
    return this.subject;
  }

  private create(url : string, protocol) : BehaviorSubject<MessageEvent> {
    let _url =  url.startsWith('ws') ? url : atob(url);
    this.socket = new WebSocket(_url, protocol);
    this.socket.binaryType = 'arraybuffer';
    let observable = Observable.create(
      (observer : Observer<MessageEvent>) => {
        this.socket.onopen = observer.next.bind(observer);
        this.socket.onmessage = observer.next.bind(observer);
        this.socket.onerror = observer.error.bind(observer);
        this.socket.onclose = observer.complete.bind(observer);
      }
    )/*.catch(err => {console.log(err);})*/

    let observer = {
      next: (data : ArrayBuffer) => {
        if (this.socket.readyState === WebSocket.OPEN) {
          //console.log('TX-SOCKET: '+String.fromCharCode.apply(null,new Uint8Array(data)));
          this.socket.send(data);
        }
      },
      complete: () => {
        this.socket.close();
      }
    }
    return BehaviorSubject.create(observer, observable);
  }
}
