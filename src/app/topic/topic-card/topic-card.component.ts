import { Component, OnInit, Input } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { TopicListService, Topic } from '../topic-list.service';

import { ViewContainerRef } from '@angular/core';
import { ColorPickerService, Cmyk } from 'ngx-color-picker';

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

  // ColorPicker stuff
  public toggle: boolean = false;
  public rgbaText: string = 'rgba(165, 26, 214, 0.2)';
  public arrayColors: any = {
    color1: '#2883e9',
    color2: '#e920e9',
    color3: 'rgb(255,245,0)',
    color4: 'rgb(236,64,64)',
    color5: 'rgba(45,208,45,1)'
  };

  public selectedColor: string = 'color1';
  public color1: string = '#2889e9';
  public color2: string = '#e920e9';
  public color3: string = '#fff500';
  public color4: string = 'rgb(236,64,64)';
  public color5: string = 'rgba(45,208,45,1)';
  public color6: string = '#1973c0';
  public color7: string = '#f200bd';
  public color8: string = '#a8ff00';
  public color9: string = '#278ce2';
  public color10: string = '#0a6211';
  public color11: string = '#f2ff00';
  public color12: string = '#f200bd';
  public color13: string = 'rgba(0,255,0,0.5)';
  public color14: string = 'rgb(0,255,255)';
  public color15: string = 'rgb(255,0,0)';
  public color16: string = '#a51ad633';
  public color17: string = '#666666';
  public color18: string = '#ff0000';
  public cmykValue: string = '';
  public cmykColor: Cmyk = new Cmyk(0, 0, 0, 0);

  public topicCmd$ = new BehaviorSubject<Topic>(new Topic);

  constructor(private topicListService: TopicListService,
    public vcRef: ViewContainerRef,
    private cpService: ColorPickerService) {
    this.topicCmd$ = topicListService.topicCmd$;
  }

  ngOnInit() {
    Object.keys(this.topic).forEach(key => {
      console.log("TOPIC-CARD ngOnInit "+this.topic.clientId+" ["+key+"]="+this.topic[key]);
      if (key == "color") {
        let colorObj = this.topic[key];
        Object.keys(colorObj).forEach(colKey => {
          this.topic['color.'+colKey] = colorObj[colKey];
          console.log("COLOR "+colKey+" = "+colorObj[colKey]);
        });
        let rgb = ColorConverter.xyBriToRgb(colorObj["x"],colorObj["y"],colorObj["saturation"]);
        console.log("COLOR-RGB "+rgb.r+"/"+rgb.g+"/"+rgb.b);
        this.color1 = 'rgb('+rgb.r+','+rgb.g+','+rgb.b+')';
        console.log("COLOR1 "+this.color1);
        this.topic.colorRGB = this.color1;
      }
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
  
  // ColorPicker stuff
  public onEventColorPicker(event: string, data: any): void {
    console.log("COLOR-PICKER-EVENT "+event+" data="+data);
    if (event.startsWith("colorPickerClose")) {
      this.topic.colorRGB = data;
      let mtopic = new Topic();
      mtopic.clientId = this.topic.clientId;
      mtopic.cmd = 'set';
      mtopic.prefix = 'zigbee2mqtt';
      // set brightness
      mtopic.cmdPayload = '{"color":{"hex":"'+data+'"}}';
      this.topicCmd$.next(mtopic);
      }
  }
  public onChangeColorCmyk(color: string): Cmyk {
    const hsva = this.cpService.stringToHsva(color);
    if (hsva) {
      const rgba = this.cpService.hsvaToRgba(hsva);
      return this.cpService.rgbaToCmyk(rgba);
    }
    return new Cmyk(0, 0, 0, 0);
  }
  public onChangeColorHex8(color: string): string {
    const hsva = this.cpService.stringToHsva(color, true);
    if (hsva) {
      return this.cpService.outputFormat(hsva, 'rgba', null);
    }
    return '';
  }
}

class ColorConverter {
  static xyBriToRgb(x,y,bri){

    console.log("ColorConverter.xyBriToRgb x="+x+" y="+y+" bri="+bri);

      function getReversedGammaCorrectedValue(value){
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
          let b =  X * 0.051713 - Y * 0.121364 + Z * 1.011530;

          r = getReversedGammaCorrectedValue(r);
          g = getReversedGammaCorrectedValue(g);
          b = getReversedGammaCorrectedValue(b);

          return {r: parseInt((r * 255).toString()), g: parseInt((g * 255).toString()), b: parseInt((b *255).toString())};
      }
}
