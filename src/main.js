import { Game } from './game/Game.js';
import { MainMenu } from './ui/MainMenu.js';
import { StatsPanel } from '../ui/StatsPanel.js';

function boot() {
  const loading = document.getElementById('loading');
  try {
    const game = new Game();
    new MainMenu(game);
    window.velkran = game; // útil para depurar desde la consola del navegador
    loading.classList.add('hidden');
  } catch (err) {
    console.error(err);
    loading.querySelector('h2').textContent = 'No se pudo iniciar el juego';
    const p = document.createElement('p');
    p.textContent = 'Comprueba que tu navegador admite WebGL y que tienes conexión (Three.js se carga desde jsDelivr). Detalle: ' + err.message;
    loading.querySelector('.parchment').appendChild(p);
  }
}

boot();
