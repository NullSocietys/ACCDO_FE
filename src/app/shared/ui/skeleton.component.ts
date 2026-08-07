import { Component, input } from '@angular/core';

@Component({
  selector: 'app-skeleton',
  styleUrl: './skeleton.component.css',
  templateUrl: './skeleton.component.html',
})
export class SkeletonComponent {
  readonly variant = input<'line' | 'card' | 'avatar' | 'table'>('line');
  readonly count = input(3);
  readonly height = input(110);

  get rows(): number[] {
    return Array.from({ length: this.count() }, (_, i) => i);
  }
}
