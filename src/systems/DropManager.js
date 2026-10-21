
import * as THREE from 'three';
import { heightAt, WORLD_RADIUS } from '../world/World.js';

const STORAGE_KEY = 'velkran.drops.v1';

export class DropManager {
  constructor(game) {
    this.game = game;
    this.drops = [];
    this.time = 0;
    this.nearbyDrop = null;

    this.materials = {
      iron: new THREE.MeshStandardMaterial({
        color: 0x9ba5ad,
        metalness: 0.75,
        roughness: 0.3
      }),
      wood: new THREE.MeshStandardMaterial({
        color: 0x694426,
        roughness: 0.85
      }),
      red: new THREE.MeshStandardMaterial({
        color: 0xb52b32,
        roughness: 0.35
      }),
      leather: new THREE.MeshStandardMaterial({
        color: 0x765039,
        roughness: 0.95
      }),
      ore: new THREE.MeshStandardMaterial({
        color: 0x596a78,
        metalness: 0.65,
        roughness: 0.4
      }),
      glow: new THREE.MeshStandardMaterial({
        color: 0xf0c56c,
        emissive: 0x8a5a18,
        emissiveIntensity: 0.6,
        roughness: 0.45
      })
    };

    this.createPickupPrompt();
    this.load();
  }

  // Mensaje que aparece al acercarse a un objeto.
  createPickupPrompt() {
    this.pickupPrompt = document.createElement('div');
    this.pickupPrompt.textContent = '[E] Recoger objeto';

    Object.assign(this.pickupPrompt.style, {
      position: 'fixed',
      left: '50%',
      bottom: '22%',
      transform: 'translateX(-50%)',
      padding: '10px 18px',
      background: 'rgba(15, 12, 9, 0.88)',
      border: '1px solid #c9a45c',
      borderRadius: '6px',
      color: '#f5e6c8',
      fontFamily: 'Georgia, serif',
      fontSize: '16px',
      fontWeight: 'bold',
      letterSpacing: '1px',
      textShadow: '1px 1px 2px #000',
      zIndex: '9999',
      pointerEvents: 'none',
      display: 'none',
      whiteSpace: 'nowrap'
    });

    document.body.appendChild(this.pickupPrompt);
  }

  // Crea un modelo 3D dependiendo del objeto.
  createModel(id) {
    const group = new THREE.Group();

    const add = (geometry, material, x, y, z) => {
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(x, y, z);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      group.add(mesh);
      return mesh;
    };

    switch (id) {
      case 'espadaHierro': {
        const blade = add(
          new THREE.BoxGeometry(0.12, 0.75, 0.07),
          this.materials.iron,
          0, 0.38, 0
        );
        blade.rotation.z = -0.15;

        add(
          new THREE.BoxGeometry(0.36, 0.09, 0.12),
          this.materials.wood,
          0, -0.04, 0
        );

        const handle = add(
          new THREE.CylinderGeometry(0.045, 0.045, 0.28, 8),
          this.materials.wood,
          0, -0.22, 0
        );
        handle.rotation.z = 0.15;

        group.rotation.z = -0.6;
        break;
      }

      case 'escudoHierro': {
        const shield = add(
          new THREE.CylinderGeometry(0.34, 0.28, 0.12, 8),
          this.materials.wood,
          0, 0.12, 0
        );
        shield.rotation.x = Math.PI / 2;

        add(
          new THREE.CylinderGeometry(0.12, 0.12, 0.15, 8),
          this.materials.iron,
          0, 0.12, 0.08
        );

        group.rotation.x = 0.25;
        break;
      }

      case 'pocionVida': {
        add(
          new THREE.CylinderGeometry(0.14, 0.19, 0.36, 10),
          this.materials.red,
          0, 0.2, 0
        );

        add(
          new THREE.CylinderGeometry(0.075, 0.075, 0.12, 8),
          this.materials.wood,
          0, 0.44, 0
        );
        break;
      }

      case 'mineralHierro': {
        const ore = add(
          new THREE.DodecahedronGeometry(0.28, 0),
          this.materials.ore,
          0, 0.22, 0
        );
        ore.rotation.set(0.3, 0.5, 0.2);

        add(
          new THREE.DodecahedronGeometry(0.13, 0),
          this.materials.iron,
          0.2, 0.12, 0.1
        );
        break;
      }

      case 'cuero': {
        const leather1 = add(
          new THREE.BoxGeometry(0.42, 0.08, 0.34),
          this.materials.leather,
          0, 0.08, 0
        );
        leather1.rotation.y = 0.25;

        const leather2 = add(
          new THREE.BoxGeometry(0.3, 0.07, 0.24),
          this.materials.leather,
          0.02, 0.14, 0.01
        );
        leather2.rotation.y = -0.2;
        break;
      }

      default:
        return null;
    }

    // Base dorada para destacar el objeto en el suelo.
    add(
      new THREE.CylinderGeometry(0.28, 0.32, 0.035, 12),
      this.materials.glow,
      0, 0.025, 0
    );

    return group;
  }

  // Crea un objeto en el mundo.
  createDrop(id, x, z) {
    if (!this.game.inventoryUI.inventory.getDefinition(id)) {
      return null;
    }

    const model = this.createModel(id);
    if (!model) return null;

    const drop = {
      uid: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      id,
      x: THREE.MathUtils.clamp(
        x,
        -WORLD_RADIUS + 1,
        WORLD_RADIUS - 1
      ),
      z: THREE.MathUtils.clamp(
        z,
        -WORLD_RADIUS + 1,
        WORLD_RADIUS - 1
      ),
      phase: Math.random() * Math.PI * 2,
      model
    };

    model.position.set(
      drop.x,
      heightAt(drop.x, drop.z),
      drop.z
    );

    this.game.scene.add(model);
    this.drops.push(drop);

    return drop;
  }

  // Suelta un objeto desde el inventario.
  dropFromInventory(id, quantity = 1) {
    const inventory = this.game.inventoryUI.inventory;
    const playerPos = this.game.player.pos;

    if (
      !playerPos ||
      quantity !== 1 ||
      inventory.getCount(id) < quantity
    ) {
      return false;
    }

    const drop = this.createDrop(
      id,
      playerPos.x + 1.1,
      playerPos.z + 0.6
    );

    if (!drop) {
      this.game.hud.notify('No se pudo soltar el objeto');
      return false;
    }

    if (!inventory.remove(id, quantity)) {
      this.removeDrop(drop, false);
      return false;
    }

    this.save();
    this.game.hud.notify(
      `${inventory.getDefinition(id).name}: objeto soltado`
    );

    return true;
  }

  // Elimina un objeto del mundo.
  removeDrop(drop, persist = true) {
    this.game.scene.remove(drop.model);

    drop.model.traverse(object => {
      if (object.isMesh) {
        object.geometry.dispose();
      }
    });

    this.drops = this.drops.filter(
      item => item.uid !== drop.uid
    );

    if (this.nearbyDrop?.uid === drop.uid) {
      this.nearbyDrop = null;
    }

    if (persist) this.save();
  }

  // Recoge el objeto más cercano si está a menos de 2.2 unidades.
  tryPickup(playerPos) {
    if (!playerPos || !this.drops.length) {
      return false;
    }

    let nearest = null;
    let nearestDistance = 2.2;

    for (const drop of this.drops) {
      const distance = Math.hypot(
        playerPos.x - drop.x,
        playerPos.z - drop.z
      );

      if (distance < nearestDistance) {
        nearest = drop;
        nearestDistance = distance;
      }
    }

    if (!nearest) return false;

    const inventory = this.game.inventoryUI.inventory;
    const definition = inventory.getDefinition(nearest.id);

    if (!definition || !inventory.add(nearest.id, 1)) {
      this.game.hud.notify(
        'Inventario lleno o pila completa'
      );
      return false;
    }

    this.removeDrop(nearest);
    this.game.hud.notify(`${definition.name}: recogido`);
    this.game.inventoryUI.render();

    return true;
  }

  // Muestra u oculta el mensaje [E] al acercarse.
  updatePickupPrompt(playerPos) {
    this.nearbyDrop = null;

    if (!playerPos || this.game.state !== 'playing') {
      this.pickupPrompt.style.display = 'none';
      return;
    }

    let nearestDistance = 2.2;

    for (const drop of this.drops) {
      const distance = Math.hypot(
        playerPos.x - drop.x,
        playerPos.z - drop.z
      );

      if (distance < nearestDistance) {
        nearestDistance = distance;
        this.nearbyDrop = drop;
      }
    }

    if (this.nearbyDrop) {
      const item = this.game.inventoryUI.inventory
        .getDefinition(this.nearbyDrop.id);

      this.pickupPrompt.textContent =
        `[E] Recoger ${item?.name ?? 'objeto'}`;

      this.pickupPrompt.style.display = 'block';
    } else {
      this.pickupPrompt.style.display = 'none';
    }
  }

  // Animación de los objetos y actualización del mensaje.
  update(dt) {
    this.time += dt;

    for (const drop of this.drops) {
      drop.model.position.y =
        heightAt(drop.x, drop.z) +
        0.12 +
        Math.sin(this.time * 2.5 + drop.phase) * 0.07;

      drop.model.rotation.y += dt * 0.45;
    }

    this.updatePickupPrompt(this.game.player.pos);
  }

  // Guarda la posición e identidad de los objetos tirados.
  save() {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(
          this.drops.map(drop => ({
            id: drop.id,
            x: drop.x,
            z: drop.z
          }))
        )
      );
    } catch (error) {
      console.warn(
        'No se pudieron guardar los objetos del suelo:',
        error
      );
    }
  }

  // Carga los objetos del suelo al iniciar.
  load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;

      const saved = JSON.parse(raw);
      if (!Array.isArray(saved)) return;

      for (const entry of saved) {
        if (
          !entry ||
          typeof entry.id !== 'string' ||
          !Number.isFinite(entry.x) ||
          !Number.isFinite(entry.z) ||
          !this.game.inventoryUI.inventory
            .getDefinition(entry.id)
        ) {
          continue;
        }

        this.createDrop(entry.id, entry.x, entry.z);
      }
    } catch (error) {
      console.warn(
        'No se pudieron cargar los objetos del suelo:',
        error
      );
    }
  }

  // Elimina todos los objetos del mundo.
  clear() {
    for (const drop of [...this.drops]) {
      this.removeDrop(drop, false);
    }

    this.save();
    this.pickupPrompt.style.display = 'none';
  }
}
