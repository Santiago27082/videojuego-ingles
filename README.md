# La Corona de Velkran — demo 3D (v0.1)

Juego 3D de acción y fantasía medieval en HTML + CSS + JavaScript + Three.js. Toda la interfaz está en español.

## Cómo probarlo

Los módulos ES se cargan por HTTP, así que hay que servir la carpeta (abrir `index.html` con doble clic no funciona):

```bash
cd la-corona-de-velkran
python3 -m http.server 8080      # o: npx serve .   /   npx http-server .
```

Abre `http://localhost:8080` en Chrome, Edge o Firefox. **Necesita conexión a internet**: Three.js 0.160 se carga desde jsDelivr mediante un import map en `index.html`, y la tipografía desde Google Fonts (con alternativa serif si no carga).

Para funcionar sin conexión: descarga `three.module.js` (r160) a `public/` o `vendor/` y cambia la ruta del import map.

## Qué incluye la demo

- Pantalla de inicio (Nueva partida, Continuar, Controles, Configuración), pausa, derrota y victoria.
- Aldea de Brumavieja: posada, herrería, casas, mercado, pozo, antorchas con luz parpadeante; muralla y puerta de la Fortaleza de Hierro; campamento bandido con hoguera; bosque instanciado (340 árboles) y rocas.
- Personaje en tercera persona con espada, escudo y capa; cámara orbital con rueda para acercar/alejar y colisión con muros.
- Movimiento: caminar, correr, saltar, agacharse, rodar (con invulnerabilidad breve).
- Combate por fases (preparación → impacto → recuperación): combo de 3 golpes rápidos, ataque fuerte que rompe guardia, patada, bloqueo con escudo, parada perfecta con contraataque, resistencia que se consume y se regenera.
- 3 enemigos con máquina de estados (patrulla, detección, persecución, acecho, defensa, ataque con aviso visual, aturdimiento, muerte, regreso): 2 bandidos y un jefe (Garra Negra).
- Experiencia y niveles, guardado local (LocalStorage) con validación, volumen y sensibilidad configurables, controles táctiles básicos.

## Controles (PC)

W A S D mover · ratón cámara · clic izquierdo ataque rápido (pulsa de nuevo para encadenar) · R ataque fuerte · clic derecho (mantener) defender · Q rodar · F patada · Mayúsculas correr · Espacio saltar · C/Ctrl agacharse · Tab ayuda · Esc pausa.
Las asignaciones están en `src/game/InputController.js` (`BINDINGS`); todavía no hay pantalla para reasignarlas.

## Estructura

```
index.html
package.json
src/
  main.js
  game/      Game.js · InputController.js · CameraController.js · Effects.js
  world/     World.js (terreno, camino, aldea, muralla, campamento, bosque, colisiones, luces)
  player/    Player.js (movimiento y combate) · Humanoid.js (maniquí con huesos)
  enemies/   Enemy.js (máquina de estados)
  systems/   AudioManager.js · SaveManager.js
  ui/        HUD.js · MainMenu.js · TouchControls.js
  styles/    main.css
public/      models/ animations/ textures/ audio/ fonts/   (vacías: ver «Recursos que faltan»)
```

## Qué es provisional (y qué falta)

- **Personajes y animaciones**: el humanoide está construido por código con cápsulas y cajas; las «animaciones» son poses interpoladas. No hay modelos GLB ni animaciones importadas todavía. `Humanoid.js` conserva la jerarquía de huesos (caderas > torso > cabeza, brazos y piernas de dos segmentos) para sustituirlo por un GLB con `GLTFLoader` + `AnimationMixer`.
- **Texturas**: generadas proceduralmente en un canvas (ruido, ladrillos, vetas). Faltan texturas PBR reales.
- **Sonido**: sintetizado con Web Audio (golpes, pasos, viento). No hay música ni archivos de audio.
- **Recursos que faltan para el salto de calidad**: un personaje humano rigged (GLB) con animaciones de idle/caminar/correr/ataque/bloqueo/rodar/muerte, modelos de armas y armadura, texturas PBR de piedra/madera/tierra, y pistas de audio con licencia compatible.
- **Colisiones**: círculos y cajas alineadas a los ejes (suficiente para esta zona). Sin física externa (Rapier) por ahora.
- **No implementado todavía (fases 5–7)**: NPC y diálogos, inventario, botín, otras regiones, más tipos de enemigo, arqueros, ciclo día/noche, clima.
- **Guardado**: sólo se guardan nivel, experiencia, bajas y opciones. Es local al navegador: no se sincroniza entre dispositivos y puede ser modificado por quien use el equipo.

## Registro de archivos

Creados en esta versión: todos los de la estructura anterior (`index.html`, `package.json`, `README.md`, `src/**`).
Nota: `npm`/Vite no se pudieron usar en el entorno de desarrollo (registro bloqueado), por eso el proyecto usa módulos ES nativos con import map en lugar de Vite. Migrar a Vite es directo: `npm i three vite`, mover el import map a `import * as THREE from 'three'` (ya es así en el código) y añadir un `vite.config.js`.

## Estado de las pruebas

- Revisión de sintaxis y nombres sin definir en todos los módulos (sin errores).
- Simulación sin interfaz de la lógica de jugador, enemigos y mundo con un sustituto mínimo de Three.js: el jugador camina y choca con obstáculos, golpea, bloquea y rueda; un bandido recibe daño, muere y otorga experiencia; la muerte del jugador se dispara; no hay posiciones NaN.
- **No se ha ejecutado en un navegador real** (no hubo navegador con acceso a Three.js en el entorno). El aspecto visual, el rendimiento, la sensación de los controles y el equilibrio del combate están sin verificar.
