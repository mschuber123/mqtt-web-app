export const environment = {
  production: true,
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
