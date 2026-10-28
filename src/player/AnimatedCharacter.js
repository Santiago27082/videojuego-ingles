
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';


export class AnimatedCharacter {
  constructor(scene, url = 'public/models/caballero.glb') {
    this.scene = scene;
    this.url = url;
    this.root = new THREE.Group();
    this.scene.add(this.root);

    this.model = null;
    this.mixer = null;
    this.actions = {};
    this.currentAction = null;
    this.loaded = false;
    this.failed = false;

    this.load();
  }

  load() {
    const loader = new GLTFLoader();

    loader.load(
      this.url,
      (gltf) => {
        this.model = gltf.scene;

        this.model.traverse((object) => {
          if (object.isMesh) {
            object.castShadow = true;
            object.receiveShadow = true;
          }
        });

        this.root.add(this.model);

        this.mixer = new THREE.AnimationMixer(this.model);

        for (const clip of gltf.animations) {
          const action = this.mixer.clipAction(clip);
          this.actions[clip.name.toLowerCase()] = action;
          console.log('Animación GLB:', clip.name);
        }

        this.loaded = true;

        console.log(
          `Modelo cargado: ${this.url}. Animaciones: ${gltf.animations.length}`
        );

        this.playByState('idle');
      },
      undefined,
      (error) => {
        this.failed = true;
        console.error('No se pudo cargar el modelo GLB:', error);
        console.error('Comprueba que exista public/models/caballero.glb');
      }
    );
  }

  findAction(state) {
    const names = Object.keys(this.actions);

    const patterns = {
      idle: ['idle', 'stand', 'breath', 'rest'],
      walk: ['walk', 'walking', 'run', 'locomotion'],
      run: ['run', 'running', 'sprint', 'walk'],
      attack: ['attack', 'slash', 'sword', 'combat'],
      heavy: ['heavy', 'strong', 'power', 'attack'],
      kick: ['kick'],
      block: ['block', 'defend', 'guard', 'shield'],
      roll: ['roll', 'dodge', 'evade'],
      jump: ['jump', 'fall', 'air'],
      dead: ['death', 'die', 'dead'],
      hit: ['hit', 'hurt', 'damage', 'stagger'],
    };

    const candidates = patterns[state] || patterns.idle;

    for (const pattern of candidates) {
      const match = names.find((name) => name.includes(pattern));
      if (match) return this.actions[match];
    }

    return null;
  }

  playByState(state, fade = 0.18) {
    if (!this.loaded || !this.mixer) return;

    const next = this.findAction(state);

    if (!next || next === this.currentAction) return;

    if (this.currentAction) {
      this.currentAction.fadeOut(fade);
    }

    next.reset();
    next.enabled = true;
    next.setEffectiveTimeScale(1);
    next.setEffectiveWeight(1);
    next.fadeIn(fade);
    next.play();

    this.currentAction = next;
  }

  update(dt) {
    if (this.mixer) {
      this.mixer.update(dt);
    }
  }

  setPosition(x, y, z) {
    this.root.position.set(x, y, z);
  }

  setRotation(y) {
    this.root.rotation.y = y;
  }

  setScale(scale) {
    this.root.scale.setScalar(scale);
  }

  dispose() {
    if (this.mixer && this.model) {
      this.mixer.stopAllAction();
      this.mixer.uncacheRoot(this.model);
    }

    this.scene.remove(this.root);
  }
}
