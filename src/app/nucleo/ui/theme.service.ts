import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  readonly darkMode = signal(false);
  private initialized = false;

  init(): void {
    if (this.initialized) {
      return;
    }
    this.initialized = true;

    const savedTheme = localStorage.getItem('theme-mode');
    const preferDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    this.apply(savedTheme ? savedTheme === 'dark' : preferDark);
  }

  toggle(): void {
    this.apply(!this.darkMode());
  }

  private apply(isDark: boolean): void {
    this.darkMode.set(isDark);
    document.documentElement.classList.toggle('dark', isDark);
    localStorage.setItem('theme-mode', isDark ? 'dark' : 'light');
  }
}

