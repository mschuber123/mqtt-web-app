import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TopicCardDetailsComponent } from './topic-card-details.component';

describe('TopicCardDetailsComponent', () => {
  let component: TopicCardDetailsComponent;
  let fixture: ComponentFixture<TopicCardDetailsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [TopicCardDetailsComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(TopicCardDetailsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
