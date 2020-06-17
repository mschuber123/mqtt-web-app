import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

import { NgModule } from '@angular/core';
import { Http, HttpModule } from '@angular/http';
import { WebsocketService } from './websocket/websocket.service';
import { MqttService } from './mqtt/mqtt.service';
import { MqttprotocolService } from './protocol/mqttprotocol.service';
import { TimerService } from './timer/timer.service';
import { TopicListService } from './topic/topic-list.service';
import { UserService } from './user.service'

import { FormsModule }   from '@angular/forms';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatButtonModule } from '@angular/material/button';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatCardModule } from '@angular/material/card';
import { MatSliderModule } from '@angular/material/slider';
import { ColorPickerModule } from 'ngx-color-picker';

import { MatGridListModule } from '@angular/material/grid-list';
import { MatButtonToggleModule } from '@angular/material/button-toggle';

import { RouterModule, Routes } from '@angular/router';

import { TopicCardComponent } from './topic/topic-card/topic-card.component';
import { AppComponent } from './app.component';
import { TopicListComponent } from './topic-list/topic-list.component';
import { LoginFormComponent } from './login-form/login-form.component';

const appRoutes:Routes = [
  {
    path: '',
    component: LoginFormComponent
  },
  {
    path: 'topic-list',
    component: TopicListComponent
  }
]

@NgModule({
  declarations: [
    AppComponent,
    TopicCardComponent,
    TopicListComponent,
    LoginFormComponent,
  ],
  imports: [
 
    FormsModule,
    BrowserModule,
    BrowserAnimationsModule,
    RouterModule.forRoot(appRoutes),
    HttpModule,
    MatCheckboxModule,
    MatButtonModule,
    MatToolbarModule,
    MatCardModule,
    MatSliderModule,
    MatGridListModule,
    MatButtonToggleModule,
    ColorPickerModule
  ],
  providers: [
    WebsocketService,
    MqttService,
    MqttprotocolService,
    TimerService,
    TopicListService,
    UserService
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
