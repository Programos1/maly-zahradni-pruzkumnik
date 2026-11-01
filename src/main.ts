import Phaser from 'phaser';
import './style.css';
import { BootScene } from './scenes/BootScene';
import { GameScene } from './scenes/GameScene';
import { Save } from './state/SaveData';

Save.load();

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  backgroundColor: '#bfe6f0',
  scale: { mode: Phaser.Scale.RESIZE, width: window.innerWidth, height: window.innerHeight },
  render: { antialias: true, roundPixels: false, powerPreference: 'high-performance' },
  fps: { target: 60 },
  scene: [BootScene, GameScene],
});

if (import.meta.env.DEV) (window as unknown as { game: Phaser.Game }).game = game;
