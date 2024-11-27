import { Component, Inject } from '@angular/core';
import { MAT_BOTTOM_SHEET_DATA } from '@angular/material/bottom-sheet';
import { MatListModule } from '@angular/material/list';

@Component({
  selector: 'app-topic-card-details',
  templateUrl: './topic-card-details.component.html',
  styleUrl: './topic-card-details.component.css'
})
export class TopicCardDetailsComponent {
  constructor(@Inject(MAT_BOTTOM_SHEET_DATA) public data: any) {
  }
}
