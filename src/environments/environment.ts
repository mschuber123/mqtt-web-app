// This file can be replaced during build by using the `fileReplacements` array.
// `ng build ---prod` replaces `environment.ts` with `environment.prod.ts`.
// The list of file replacements can be found in `angular.json`.

export const environment = {
  production: false,
  CHAT: {
    url: 'ws://echo.websocket.org/', 
    protocol: '',
    topics: [],
    qos: [],
    prefixes: ['testtopic/'],
    prefixCmd: '',
    postfixes: [],
    postfixStatReq: '',
    payloadStatReq: ''  },
  HIVEMQ: {
    url: 'ws://broker.mqttdashboard.com:8000/mqtt', 
    protocol: 'mqttv3.1',
    topics: ['#'],
    qos: [0], 
    prefixes: ['testtopic/'],
    prefixCmd: '',
    postfixes: [],
    postfixStatReq: '',
    payloadStatReq: ''  },
  HOME: {
    url: 'd3NzOi8vbXNjaHViZXIuZGRucy5uZXQ6NzEyMy9tcXR0', 
    protocol: 'mqttv3.1',
    topics: ['tele/#','stat/#'],
    qos: [0,0],
    prefixes: ['tele','stat'],
    prefixCmd: 'cmnd',
    postfixes: ['STATE','RESULT','LWT','INFO1','UPTIME','POWER1','POWER2','Status'],
    postfixStatReq: 'status',
    payloadStatReq: '0'
  }
};

/*
 * In development mode, to ignore zone related error stack frames such as
 * `zone.run`, `zoneDelegate.invokeTask` for easier debugging, you can
 * import the following file, but please comment it out in production mode
 * because it will have performance impact when throw error
 */
// import 'zone.js/dist/zone-error';  // Included with Angular CLI.
