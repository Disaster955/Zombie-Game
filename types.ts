export enum GameStatus {
  MENU = 'MENU',
  PLAYING = 'PLAYING',
  PAUSED = 'PAUSED',
  GAME_OVER = 'GAME_OVER',
  VICTORY = 'VICTORY'
}

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Vector {
  x: number;
  y: number;
}

export enum WeaponType {
  PISTOL = 'PISTOL',
  SMG = 'SMG',
  SHOTGUN = 'SHOTGUN'
}

export enum ZombieType {
  WALKER = 'WALKER',
  RUNNER = 'RUNNER',
  TANK = 'TANK',
  JUMPER = 'JUMPER',
  SCREAMER = 'SCREAMER'
}

export interface Entity extends Rect {
  vx: number;
  vy: number;
  color: string;
  isGrounded: boolean;
  facingRight: boolean;
  health: number;
  maxHealth: number;
  isDead: boolean;
}

export interface Player extends Entity {
  isAttacking: boolean; // Used for recoil/animation state
  attackCooldown: number;
  invincibleTimer: number;
  jumpsRemaining: number;
  
  // Movement State
  isSliding: boolean;
  slideTimer: number;
  isWallSliding: boolean;
  wallDir: number; // -1 (left wall), 1 (right wall), 0 (none)
  
  // Dash Mechanic
  isDashing: boolean;
  dashTimer: number;
  dashCooldown: number;
  
  // Respawn / Checkpoint System
  lastSafeX: number;
  lastSafeY: number;

  // Inventory System
  weapons: WeaponType[];
  currentWeaponIndex: number;
  ammoClip: Record<WeaponType, number>;    // Ammo currently in the gun
  ammoReserve: Record<WeaponType, number>; // Ammo in the bag
  isReloading: boolean;                    // Is currently reloading
  reloadTimer: number;                     // Frames remaining for reload
  medkits: number;                         // Stored medkits
}

export interface Zombie extends Entity {
  type: ZombieType;
  patrolCenter: number;
  patrolRange: number;
  aggro: boolean;
  attackTimer: number;
  searchTimer: number; // How long to keep looking for player after losing LoS
  lastKnownX: number; // Where they last saw the player
  summonTimer: number; // For Screamers spawning zombies
}

export interface Platform extends Rect {
  type: 'ground' | 'platform' | 'obstacle' | 'goal';
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
  size: number;
}

export interface Projectile extends Rect {
  vx: number;
  damage: number;
  life: number;
  color: string;
}

export interface Collectible extends Rect {
  id: number;
  type: 'medkit' | 'weapon' | 'ammo';
  weaponType?: WeaponType; // For weapons and ammo pickups
  collected: boolean;
}

export interface GameState {
  player: Player;
  platforms: Platform[];
  zombies: Zombie[];
  particles: Particle[];
  projectiles: Projectile[];
  collectibles: Collectible[];
  camera: { x: number; y: number };
  score: number;
  status: GameStatus;
  
  // Horde System
  hordeTimer: number;        // Countdown to next horde
  hordeWarningTimer: number; // Duration to show warning text
}