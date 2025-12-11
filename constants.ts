import { Platform, WeaponType, Collectible, ZombieType } from './types';

// Physics & Movement
export const GRAVITY = 0.8; // Increased for snappier jumps
export const JUMP_FORCE = -16;
export const WALL_JUMP_FORCE = { x: 10, y: -14 };
export const TERMINAL_VELOCITY = 18;

// Speed & Acceleration
export const MOVE_SPEED = 7;
export const ACCELERATION = 1.5; // How fast we reach max speed on ground
export const AIR_ACCELERATION = 0.8; // Less control in air
export const FRICTION = 0.82; // Ground friction
export const AIR_FRICTION = 0.95; // Air resistance

// Advanced Mechanics
export const WALL_SLIDE_SPEED = 2;
export const SLIDE_SPEED = 12;
export const SLIDE_DURATION = 35; // Frames
export const SLIDE_COOLDOWN = 60;
export const MAX_JUMPS = 2;

// Dash Mechanics
export const DASH_SPEED = 20;
export const DASH_DURATION = 15; // Quarter of a second
export const DASH_COOLDOWN = 90; // 1.5 Seconds cooldown

// Gameplay
export const PLAYER_WIDTH = 40;
export const PLAYER_HEIGHT = 60;
export const INVINCIBLE_FRAMES = 90; 
export const MAX_HEALTH = 3; 
export const MAX_WEAPONS = 2;
export const MAX_MEDKITS = 1;
export const HORDE_INTERVAL = 3600; // 60 seconds at 60fps
export const HORDE_WARNING_DURATION = 180; // 3 seconds

// Zombie Stats
export const ZOMBIE_STATS = {
  [ZombieType.WALKER]: {
    w: 40, h: 60, health: 30, speed: 2, color: '#22c55e' // Green
  },
  [ZombieType.RUNNER]: {
    w: 35, h: 55, health: 15, speed: 5, color: '#f97316' // Orange
  },
  [ZombieType.TANK]: {
    w: 60, h: 90, health: 100, speed: 1, color: '#9333ea' // Purple
  },
  [ZombieType.JUMPER]: {
    w: 30, h: 50, health: 20, speed: 3, color: '#06b6d4' // Cyan
  },
  [ZombieType.SCREAMER]: {
    w: 30, h: 55, health: 25, speed: 4, color: '#db2777' // Pink
  }
};

// Weapon Configs
export const WEAPONS = {
  [WeaponType.PISTOL]: {
    name: 'PISTOL',
    damage: 10, 
    cooldown: 20, 
    color: '#9ca3af', 
    bulletSpeed: 14,
    bulletSize: 4,
    maxAmmo: 9999, // Infinite reserve logic
    startAmmo: 9999,
    pickupAmmo: 0,
    clipSize: 9999, // Infinite clip logic
    reloadDuration: 0 // No reload
  },
  [WeaponType.SMG]: {
    name: 'SMG',
    damage: 8, 
    cooldown: 6, 
    color: '#60a5fa', 
    bulletSpeed: 16,
    bulletSize: 3,
    maxAmmo: 240, // Reserve capacity
    startAmmo: 60, // Starting reserve
    pickupAmmo: 60,
    clipSize: 30,
    reloadDuration: 90 // 1.5 seconds
  },
  [WeaponType.SHOTGUN]: {
    name: 'SHOTGUN',
    damage: 30, 
    cooldown: 45, 
    color: '#ef4444', 
    bulletSpeed: 12,
    bulletSize: 6,
    maxAmmo: 50, // Reserve capacity
    startAmmo: 10, // Starting reserve
    pickupAmmo: 10,
    clipSize: 5,
    reloadDuration: 120 // 2 seconds
  }
};

// World
export const WORLD_WIDTH = 14000;
export const WORLD_HEIGHT = 1000;
export const FLOOR_Y = 600;

export const INITIAL_PLATFORMS: Platform[] = [
  // --- ZONE 1: The Outskirts (0 - 3000) ---
  { x: 0, y: FLOOR_Y, w: 3200, h: 200, type: 'ground' },
  
  // Basic Platforms
  { x: 400, y: FLOOR_Y - 100, w: 200, h: 20, type: 'platform' },
  { x: 700, y: FLOOR_Y - 200, w: 200, h: 20, type: 'platform' },
  { x: 1000, y: FLOOR_Y - 100, w: 200, h: 20, type: 'platform' },

  // Zombie Tower
  { x: 1400, y: FLOOR_Y - 150, w: 100, h: 20, type: 'platform' },
  { x: 1550, y: FLOOR_Y - 300, w: 300, h: 20, type: 'platform' },
  { x: 1400, y: FLOOR_Y - 450, w: 100, h: 20, type: 'platform' },

  // The Gap (Wall Jump Test)
  { x: 2100, y: FLOOR_Y - 200, w: 20, h: 300, type: 'obstacle' }, // Wall
  { x: 2300, y: FLOOR_Y - 350, w: 150, h: 20, type: 'platform' },
  { x: 2600, y: FLOOR_Y - 200, w: 20, h: 300, type: 'obstacle' }, // Wall

  // --- ZONE 2: The Broken Bridge (3200 - 5000) ---
  // No ground floor here! Fall = Death
  { x: 3400, y: FLOOR_Y, w: 200, h: 20, type: 'platform' },
  { x: 3700, y: FLOOR_Y - 50, w: 200, h: 20, type: 'platform' },
  { x: 4000, y: FLOOR_Y - 100, w: 300, h: 20, type: 'platform' },
  { x: 4400, y: FLOOR_Y - 100, w: 100, h: 20, type: 'platform' },
  { x: 4600, y: FLOOR_Y + 50, w: 300, h: 20, type: 'platform' },

  // --- ZONE 3: The High Rise (5000 - 8000) ---
  { x: 5000, y: FLOOR_Y, w: 3000, h: 200, type: 'ground' }, // Ground returns
  
  // Vertical scaling
  { x: 5200, y: FLOOR_Y - 150, w: 150, h: 20, type: 'platform' },
  { x: 5400, y: FLOOR_Y - 300, w: 150, h: 20, type: 'platform' },
  { x: 5600, y: FLOOR_Y - 450, w: 400, h: 20, type: 'platform' }, // High platform
  { x: 6100, y: FLOOR_Y - 300, w: 150, h: 20, type: 'platform' },
  { x: 6300, y: FLOOR_Y - 150, w: 150, h: 20, type: 'platform' },
  
  // Tank Arena
  { x: 6600, y: FLOOR_Y - 200, w: 600, h: 20, type: 'platform' },

  // --- ZONE 4: The Industrial Complex (8000 - 14000) ---
  // A mix of tight corridors and open pits
  { x: 8100, y: FLOOR_Y - 100, w: 500, h: 20, type: 'platform' },
  { x: 8700, y: FLOOR_Y, w: 2000, h: 200, type: 'ground' },
  
  // Factory Roofs
  { x: 9000, y: FLOOR_Y - 200, w: 400, h: 20, type: 'platform' },
  { x: 9500, y: FLOOR_Y - 300, w: 400, h: 20, type: 'platform' },
  { x: 10000, y: FLOOR_Y - 200, w: 400, h: 20, type: 'platform' },

  // The Final Stretch (Pitfall danger)
  { x: 11000, y: FLOOR_Y, w: 200, h: 200, type: 'ground' },
  { x: 11400, y: FLOOR_Y - 50, w: 100, h: 20, type: 'platform' },
  { x: 11700, y: FLOOR_Y - 100, w: 100, h: 20, type: 'platform' },
  { x: 12000, y: FLOOR_Y, w: 1500, h: 200, type: 'ground' },
  
  // Bunker Entrance (Walls)
  { x: 12500, y: FLOOR_Y - 200, w: 20, h: 200, type: 'obstacle' },
  { x: 12500, y: FLOOR_Y - 300, w: 500, h: 20, type: 'platform' },

  // --- GOAL ---
  { x: 13800, y: FLOOR_Y - 100, w: 100, h: 100, type: 'goal' },
  
  // Walls
  { x: -50, y: 0, w: 50, h: WORLD_HEIGHT, type: 'obstacle' },
  { x: WORLD_WIDTH, y: 0, w: 50, h: WORLD_HEIGHT, type: 'obstacle' }
];

export const INITIAL_ZOMBIE_SPAWNS = [
  // Zone 1: Walkers & Runners
  { x: 800, y: FLOOR_Y - 300, type: ZombieType.WALKER },
  { x: 1200, y: FLOOR_Y - 50, type: ZombieType.RUNNER },
  { x: 1300, y: FLOOR_Y - 50, type: ZombieType.SCREAMER }, 
  { x: 1600, y: FLOOR_Y - 350, type: ZombieType.WALKER },
  { x: 1700, y: FLOOR_Y - 350, type: ZombieType.WALKER },
  { x: 2500, y: FLOOR_Y - 50, type: ZombieType.RUNNER },
  
  // Zone 2: Jumpers on platforms
  { x: 3750, y: FLOOR_Y - 100, type: ZombieType.JUMPER },
  { x: 4100, y: FLOOR_Y - 150, type: ZombieType.JUMPER },
  { x: 4700, y: FLOOR_Y, type: ZombieType.JUMPER },

  // Zone 3: The Horde (Mix) + Tanks
  { x: 5300, y: FLOOR_Y - 50, type: ZombieType.TANK }, 
  { x: 5400, y: FLOOR_Y - 50, type: ZombieType.SCREAMER }, 
  { x: 5650, y: FLOOR_Y - 500, type: ZombieType.WALKER },
  { x: 5750, y: FLOOR_Y - 500, type: ZombieType.WALKER },
  { x: 6200, y: FLOOR_Y - 50, type: ZombieType.RUNNER },
  { x: 6400, y: FLOOR_Y - 50, type: ZombieType.RUNNER },
  
  // Mid-Boss Guard
  { x: 6800, y: FLOOR_Y - 250, type: ZombieType.TANK },
  { x: 7000, y: FLOOR_Y - 50, type: ZombieType.TANK },
  { x: 7100, y: FLOOR_Y - 50, type: ZombieType.SCREAMER }, 
  
  // Zone 4: Industrial Mayhem
  { x: 8200, y: FLOOR_Y - 150, type: ZombieType.RUNNER },
  { x: 8300, y: FLOOR_Y - 150, type: ZombieType.RUNNER },
  { x: 8400, y: FLOOR_Y - 150, type: ZombieType.RUNNER },
  
  { x: 9100, y: FLOOR_Y - 250, type: ZombieType.SCREAMER }, // High ground screamer
  { x: 9200, y: FLOOR_Y - 250, type: ZombieType.WALKER },
  { x: 9700, y: FLOOR_Y - 350, type: ZombieType.JUMPER },
  
  { x: 11100, y: FLOOR_Y - 50, type: ZombieType.TANK },
  { x: 12100, y: FLOOR_Y - 50, type: ZombieType.TANK },
  { x: 12200, y: FLOOR_Y - 50, type: ZombieType.SCREAMER },
  { x: 12300, y: FLOOR_Y - 50, type: ZombieType.TANK },
  
  // The Final Gauntlet
  { x: 13000, y: FLOOR_Y - 50, type: ZombieType.RUNNER },
  { x: 13100, y: FLOOR_Y - 50, type: ZombieType.RUNNER },
  { x: 13200, y: FLOOR_Y - 50, type: ZombieType.RUNNER },
  { x: 13300, y: FLOOR_Y - 50, type: ZombieType.RUNNER },
  { x: 13400, y: FLOOR_Y - 50, type: ZombieType.JUMPER },
  { x: 13500, y: FLOOR_Y - 50, type: ZombieType.JUMPER },
];

export const INITIAL_COLLECTIBLES: Collectible[] = [
  // Start
  { id: 1, x: 750, y: FLOOR_Y - 250, w: 30, h: 30, type: 'weapon', weaponType: WeaponType.SMG, collected: false },
  { id: 2, x: 1420, y: FLOOR_Y - 480, w: 30, h: 30, type: 'medkit', collected: false },
  { id: 101, x: 1550, y: FLOOR_Y - 350, w: 25, h: 25, type: 'ammo', weaponType: WeaponType.SMG, collected: false },
  
  // Mid Game Shotgun
  { id: 3, x: 2150, y: FLOOR_Y - 250, w: 30, h: 30, type: 'weapon', weaponType: WeaponType.SHOTGUN, collected: false },
  
  // Before Bridge
  { id: 4, x: 3100, y: FLOOR_Y - 50, w: 30, h: 30, type: 'medkit', collected: false },
  { id: 102, x: 4420, y: FLOOR_Y - 150, w: 25, h: 25, type: 'ammo', weaponType: WeaponType.SHOTGUN, collected: false },

  // On the high rise (Reward for climbing)
  { id: 5, x: 5700, y: FLOOR_Y - 500, w: 30, h: 30, type: 'weapon', weaponType: WeaponType.SMG, collected: false }, // Refill SMG
  { id: 103, x: 6150, y: FLOOR_Y - 350, w: 25, h: 25, type: 'ammo', weaponType: WeaponType.SMG, collected: false },
  
  // Before Tank Arena (Needed!)
  { id: 6, x: 6500, y: FLOOR_Y - 50, w: 30, h: 30, type: 'medkit', collected: false },
  { id: 7, x: 6550, y: FLOOR_Y - 50, w: 30, h: 30, type: 'weapon', weaponType: WeaponType.SHOTGUN, collected: false },
  { id: 104, x: 6600, y: FLOOR_Y - 50, w: 25, h: 25, type: 'ammo', weaponType: WeaponType.SHOTGUN, collected: false },
  
  // Zone 4 Resources
  { id: 8, x: 8800, y: FLOOR_Y - 50, w: 30, h: 30, type: 'medkit', collected: false },
  { id: 105, x: 9000, y: FLOOR_Y - 250, w: 25, h: 25, type: 'ammo', weaponType: WeaponType.SMG, collected: false },
  { id: 106, x: 10000, y: FLOOR_Y - 250, w: 25, h: 25, type: 'ammo', weaponType: WeaponType.SHOTGUN, collected: false },
  
  // Final Prep
  { id: 9, x: 12500, y: FLOOR_Y - 350, w: 30, h: 30, type: 'medkit', collected: false },
];