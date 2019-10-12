import { Injectable, EventEmitter } from '@angular/core';
import { Observable, Observer } from 'rxjs';

@Injectable()
export class TimerService {

  private running: boolean = false;
  private currentCount: number = 0;
  private warnAt: number = 0;
  private tickerInterval: any;
  private initialCountValue: number = 0;
  public expiredValue : string = 'Your session has expired!!';
  public warn$ : Observable<number>;
  public expired$: Observable<string>;
  public intervalValue : number = 1000;

  constructor(){
    this.warn$ = new Observable(observer => {
      this._emit_warning = observer.next.bind(observer);
    });
    this.expired$ = new Observable(observer => {
      this._emit_expired = observer.next.bind(observer);
    })
  }
  public start(countdownFrom:number = 10, warnAt: number = 5)
  {
      this.running = true;
      this.currentCount = countdownFrom;
      this.initialCountValue = countdownFrom;
      this.warnAt = warnAt;
      this.tickerInterval = setInterval(this.tick.bind(this), this.intervalValue);
  }

  public clear(){
    clearInterval(this.tickerInterval);
    this.running = false;
    this.currentCount = this.initialCountValue;
  }

  public restart(){
    this.currentCount = this.initialCountValue;
  }

  private tick(){
    if(this.currentCount == this.warnAt){
      this._emit_warning(this.currentCount);
    }
    if(this.currentCount === 0){
      this._emit_expired(this.expiredValue);
      this.running = false;
      clearInterval(this.tickerInterval);
    }
    this.currentCount--;
  }
  private _emit_warning(value : number) {
  }
  private _emit_expired(value : string) {
  }

}
