import Phaser from 'phaser';
import { buildTextures, preloadOverrides } from '../assets/textures';
import { App } from '../ui/App';

/** Loads optional PNG overrides, paints all procedural textures, then hands control to the UI. */
export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  preload(): void {
    preloadOverrides(this);
  }

  create(): void {
    buildTextures(this);
    document.getElementById('loading')?.remove();
    new App(this.game).boot();
  }
}
