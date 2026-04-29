import { Component, Input } from '@angular/core';

import { ThemeService } from '../../nucleo/ui/theme.service';

@Component({
  selector: 'app-theme-toggle-button',
  standalone: true,
  template: `
    <button
      type="button"
      [class]="baseButtonClass + ' ' + buttonClass"
      (click)="themeService.toggle()"
      [attr.aria-label]="themeService.darkMode() ? 'Activar modo claro' : 'Activar modo oscuro'"
    >
      <span class="pi" [class.pi-moon]="!themeService.darkMode()" [class.pi-sun]="themeService.darkMode()"></span>
    </button>
  `,
})
export class ThemeToggleButtonComponent {
  @Input() buttonClass = '';

  protected readonly baseButtonClass =
    'inline-flex h-11 w-11 items-center justify-center rounded-2xl border transition';

  constructor(protected readonly themeService: ThemeService) {}
}

