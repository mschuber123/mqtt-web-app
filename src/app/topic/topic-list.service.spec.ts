import { TestBed, inject } from '@angular/core/testing';

import { TopicListService } from './topic-list.service';

describe('TopicListService', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [TopicListService]
    });
  });

  it('should be created', inject([TopicListService], (service: TopicListService) => {
    expect(service).toBeTruthy();
  }));
});
