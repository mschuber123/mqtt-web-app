import { TestBed, inject } from '@angular/core/testing';

import { MqttprotocolService } from './mqttprotocol.service';

describe('MqttprotocolService', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [MqttprotocolService]
    });
  });

  it('should be created', inject([MqttprotocolService], (service: MqttprotocolService) => {
    expect(service).toBeTruthy();
  }));
});
