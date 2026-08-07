import { Component, input } from '@angular/core';
import { ICONS, IconName } from './icon-paths';

@Component({
  selector: 'app-icon',
  host: {
    class: 'app-icon',
    '[style.width.px]': 'size()',
    '[style.height.px]': 'size()',
    '[attr.aria-hidden]': 'true',
  },
  styleUrl: './icon.component.css',
  templateUrl: './icon.component.html',
})
export class IconComponent {
  readonly name = input.required<IconName | string>();
  readonly size = input(18);

  get path(): string {
    return ICONS[this.name()] ?? ICONS['circle-check'];
  }
}
