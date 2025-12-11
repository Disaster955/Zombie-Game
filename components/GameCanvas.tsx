import React, { useRef, useEffect, useState, useCallback } from 'react';
import { 
  GameState, 
  GameStatus, 
  Player, 
  Zombie, 
  Platform, 
  Rect,
  Particle,
  WeaponType,
  Projectile,
  Collectible,
  ZombieType
} from '../types';
import { 
  GRAVITY, 
  FRICTION,
  AIR_FRICTION, 
  MOVE_SPEED, 
  ACCELERATION,
  AIR_ACCELERATION,
  JUMP_FORCE, 
  WALL_JUMP_FORCE,
  WALL_SLIDE_SPEED,
  SLIDE_SPEED,
  SLIDE_DURATION,
  TERMINAL_VELOCITY,
  PLAYER_WIDTH,
  PLAYER_HEIGHT,
  INITIAL_PLATFORMS,
  INITIAL_ZOMBIE_SPAWNS,
  INITIAL_COLLECTIBLES,
  FLOOR_Y,
  INVINCIBLE_FRAMES,
  WORLD_WIDTH,
  MAX_JUMPS,
  MAX_HEALTH,
  WEAPONS,
  ZOMBIE_STATS,
  MAX_WEAPONS,
  MAX_MEDKITS,
  HORDE_INTERVAL,
  HORDE_WARNING_DURATION,
  DASH_SPEED,
  DASH_DURATION,
  DASH_COOLDOWN
} from '../constants';
import { soundManager } from '../utils/sound';

interface GameCanvasProps {
  onScoreUpdate: (score: number) => void;
  onStatusChange: (status: GameStatus) => void;
  gameStatus: GameStatus;
}

const GameCanvas: React.FC<GameCanvasProps> = ({ onScoreUpdate, onStatusChange, gameStatus }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>(0);
  
  // Timing
  const lastTimeRef = useRef<number>(0);
  const accumulatorRef = useRef<number>(0);
  const FIXED_TIME_STEP = 1000 / 60; 
  
  // Input State
  const keys = useRef<{ [key: string]: boolean }>({});
  const prevKeys = useRef<{ [key: string]: boolean }>({}); 
  const [isMobile, setIsMobile] = useState(false);
  
  // Joystick Refs (Direct DOM manipulation for performance)
  const joystickBaseRef = useRef<HTMLDivElement>(null);
  const joystickKnobRef = useRef<HTMLDivElement>(null);

  // Detect Mobile
  useEffect(() => {
    const checkMobile = () => {
      return ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
    };
    setIsMobile(checkMobile());
  }, []);

  // Game State
  const state = useRef<GameState>({
    player: {
      x: 100, y: FLOOR_Y - 100, w: PLAYER_WIDTH, h: PLAYER_HEIGHT, vx: 0, vy: 0,
      color: '#3b82f6', isGrounded: false, facingRight: true,
      health: MAX_HEALTH, maxHealth: MAX_HEALTH, isDead: false,
      isAttacking: false, attackCooldown: 0, invincibleTimer: 0,
      jumpsRemaining: MAX_JUMPS,
      isSliding: false, slideTimer: 0, isWallSliding: false, wallDir: 0,
      isDashing: false, dashTimer: 0, dashCooldown: 0,
      lastSafeX: 100, lastSafeY: FLOOR_Y - 100,
      weapons: [WeaponType.PISTOL],
      currentWeaponIndex: 0,
      ammoClip: {
        [WeaponType.PISTOL]: WEAPONS[WeaponType.PISTOL].clipSize,
        [WeaponType.SMG]: WEAPONS[WeaponType.SMG].clipSize,
        [WeaponType.SHOTGUN]: WEAPONS[WeaponType.SHOTGUN].clipSize,
      },
      ammoReserve: {
         [WeaponType.PISTOL]: WEAPONS[WeaponType.PISTOL].startAmmo,
         [WeaponType.SMG]: WEAPONS[WeaponType.SMG].startAmmo,
         [WeaponType.SHOTGUN]: WEAPONS[WeaponType.SHOTGUN].startAmmo,
      },
      isReloading: false,
      reloadTimer: 0,
      medkits: 0
    },
    platforms: INITIAL_PLATFORMS,
    zombies: [],
    particles: [],
    projectiles: [],
    collectibles: [],
    camera: { x: 0, y: 0 },
    score: 0,
    status: GameStatus.MENU,
    hordeTimer: HORDE_INTERVAL,
    hordeWarningTimer: 0
  });

  // --- Music & State Management ---

  useEffect(() => {
    if (gameStatus === GameStatus.PLAYING) {
        soundManager.startMusic();
    } else {
        soundManager.stopMusic();
    }
  }, [gameStatus]);

  // --- Initialization ---

  const initGame = useCallback(() => {
    state.current.player = {
      x: 100, y: FLOOR_Y - 100, w: PLAYER_WIDTH, h: PLAYER_HEIGHT, vx: 0, vy: 0,
      color: '#3b82f6', isGrounded: false, facingRight: true,
      health: MAX_HEALTH, maxHealth: MAX_HEALTH, isDead: false,
      isAttacking: false, attackCooldown: 0, invincibleTimer: 0,
      jumpsRemaining: MAX_JUMPS,
      isSliding: false, slideTimer: 0, isWallSliding: false, wallDir: 0,
      isDashing: false, dashTimer: 0, dashCooldown: 0,
      lastSafeX: 100, lastSafeY: FLOOR_Y - 100,
      weapons: [WeaponType.PISTOL],
      currentWeaponIndex: 0,
      ammoClip: {
        [WeaponType.PISTOL]: WEAPONS[WeaponType.PISTOL].clipSize,
        [WeaponType.SMG]: WEAPONS[WeaponType.SMG].clipSize,
        [WeaponType.SHOTGUN]: WEAPONS[WeaponType.SHOTGUN].clipSize,
      },
      ammoReserve: {
         [WeaponType.PISTOL]: WEAPONS[WeaponType.PISTOL].startAmmo,
         [WeaponType.SMG]: WEAPONS[WeaponType.SMG].startAmmo,
         [WeaponType.SHOTGUN]: WEAPONS[WeaponType.SHOTGUN].startAmmo,
      },
      isReloading: false,
      reloadTimer: 0,
      medkits: 0
    };
    
    state.current.zombies = INITIAL_ZOMBIE_SPAWNS.map((spawn) => {
        const stats = ZOMBIE_STATS[spawn.type];
        return {
            x: spawn.x,
            y: spawn.y,
            w: stats.w,
            h: stats.h,
            vx: 0,
            vy: 0,
            color: stats.color,
            isGrounded: false,
            facingRight: Math.random() > 0.5,
            health: stats.health,
            maxHealth: stats.health,
            isDead: false,
            patrolCenter: spawn.x,
            patrolRange: 150,
            aggro: false,
            attackTimer: 0,
            type: spawn.type,
            searchTimer: 0,
            lastKnownX: spawn.x,
            summonTimer: 0
        };
    });

    state.current.collectibles = JSON.parse(JSON.stringify(INITIAL_COLLECTIBLES));
    state.current.particles = [];
    state.current.projectiles = [];
    state.current.score = 0;
    state.current.camera = { x: 0, y: 0 };
    state.current.hordeTimer = HORDE_INTERVAL;
    state.current.hordeWarningTimer = 0;
    
    onScoreUpdate(0);
  }, [onScoreUpdate]);

  // --- Physics Helpers ---

  const checkCollision = (rect1: Rect, rect2: Rect) => {
    return (
      rect1.x < rect2.x + rect2.w &&
      rect1.x + rect1.w > rect2.x &&
      rect1.y < rect2.y + rect2.h &&
      rect1.y + rect1.h > rect2.y
    );
  };

  const spawnParticles = (x: number, y: number, color: string, count: number) => {
    for (let i = 0; i < count; i++) {
      state.current.particles.push({
        x, y,
        vx: (Math.random() - 0.5) * 10,
        vy: (Math.random() - 0.5) * 10,
        life: 1.0,
        color,
        size: Math.random() * 4 + 2
      });
    }
  };

  const spawnZombieNear = (targetX: number, targetY: number) => {
      const type = Math.random() > 0.7 ? ZombieType.RUNNER : ZombieType.WALKER;
      const stats = ZOMBIE_STATS[type];
      const offsetX = Math.random() > 0.5 ? 100 : -100;
      
      state.current.zombies.push({
        x: targetX + offsetX,
        y: targetY - 100, // Drop from sky
        w: stats.w,
        h: stats.h,
        vx: 0,
        vy: 0,
        color: stats.color,
        isGrounded: false,
        facingRight: offsetX < 0,
        health: stats.health,
        maxHealth: stats.health,
        isDead: false,
        patrolCenter: targetX,
        patrolRange: 200,
        aggro: true, 
        attackTimer: 0,
        type: type,
        searchTimer: 300,
        lastKnownX: targetX,
        summonTimer: 0
      });
  };

  const spawnHorde = (isMini: boolean) => {
      // Show Warning
      state.current.hordeWarningTimer = HORDE_WARNING_DURATION;
      
      // Play Alarm Sound!
      soundManager.playHordeAlert();
      
      const count = isMini ? 3 : 8;
      const { player, camera } = state.current;
      const screenWidth = window.innerWidth;
      
      // Spawn points: Left and Right of camera view
      const spawnPoints = [
          camera.x - 50,
          camera.x + screenWidth + 50
      ];

      for (let i = 0; i < count; i++) {
          const spawnX = spawnPoints[Math.floor(Math.random() * spawnPoints.length)] + (Math.random() * 200 - 100);
          const type = Math.random() > 0.7 ? ZombieType.RUNNER : ZombieType.WALKER;
          const stats = ZOMBIE_STATS[type];

          state.current.zombies.push({
            x: spawnX,
            y: FLOOR_Y - 100, // Drop from sky/high
            w: stats.w,
            h: stats.h,
            vx: 0,
            vy: 0,
            color: stats.color,
            isGrounded: false,
            facingRight: spawnX < player.x,
            health: stats.health,
            maxHealth: stats.health,
            isDead: false,
            patrolCenter: spawnX,
            patrolRange: 200,
            aggro: true, // Auto aggro
            attackTimer: 0,
            type: type,
            searchTimer: 300,
            lastKnownX: player.x,
            summonTimer: 0
          });
      }
      soundManager.playZombieScream();
  };

  // --- Update Loop ---

  const update = useCallback(() => {
    if (state.current.status !== GameStatus.PLAYING) return;

    const { player, platforms, zombies, projectiles, collectibles } = state.current;
    const currentWeaponType = player.weapons[player.currentWeaponIndex];
    const weaponStats = WEAPONS[currentWeaponType];

    // --- HORDE LOGIC ---
    if (state.current.hordeTimer > 0) {
        state.current.hordeTimer--;
        if (state.current.hordeTimer <= 0) {
            spawnHorde(false);
            state.current.hordeTimer = HORDE_INTERVAL; // Reset timer
        }
    }
    
    if (state.current.hordeWarningTimer > 0) {
        state.current.hordeWarningTimer--;
    }

    // --- 1. Movement Logic ---
    
    // A. DASH MECHANIC (Space)
    if (player.dashCooldown > 0) player.dashCooldown--;

    if (keys.current[' '] && player.dashCooldown === 0 && !player.isDashing) {
        player.isDashing = true;
        player.dashTimer = DASH_DURATION;
        player.dashCooldown = DASH_COOLDOWN;
        
        // Impulse straight forward (ignore current velocity)
        player.vx = player.facingRight ? DASH_SPEED : -DASH_SPEED;
        player.vy = 0; // Anti-gravity start
        
        spawnParticles(player.x + player.w/2, player.y + player.h/2, '#06b6d4', 15); // Cyan trail
        soundManager.playShoot(WeaponType.SHOTGUN); // Re-use loud sound for dash
    }

    // B. Sliding Mechanic
    const downPressed = keys.current['arrowdown'];
    
    // Start Slide
    if (downPressed && player.isGrounded && !player.isSliding && !player.isDashing && Math.abs(player.vx) > 1) {
        player.isSliding = true;
        player.slideTimer = SLIDE_DURATION;
        player.vx = player.facingRight ? SLIDE_SPEED : -SLIDE_SPEED;
        spawnParticles(player.x + player.w/2, player.y + player.h, '#ffffff', 5);
        soundManager.playJump(); 
    }

    if (player.isSliding) {
        player.slideTimer--;
        player.vx *= 0.96; 
        
        if (player.slideTimer <= 0 || Math.abs(player.vx) < 1) {
            player.isSliding = false;
        }
    }

    // Process Dash Physics override
    if (player.isDashing) {
        player.dashTimer--;
        player.vy = 0; // Floating straight
        spawnParticles(player.x + (player.facingRight ? 0 : player.w), player.y + Math.random() * player.h, '#06b6d4', 1);

        if (player.dashTimer <= 0) {
            player.isDashing = false;
            player.vx *= 0.5; // Slow down after dash
        }
    }

    // C. Acceleration & Input (Only if not sliding and not dashing)
    if (!player.isSliding && !player.isDashing) {
        let dir = 0;
        if (keys.current['arrowright']) dir = 1;
        if (keys.current['arrowleft']) dir = -1;

        if (dir !== 0) {
            const accel = player.isGrounded ? ACCELERATION : AIR_ACCELERATION;
            player.vx += dir * accel;
            player.facingRight = dir > 0;
        } else {
            const friction = player.isGrounded ? FRICTION : AIR_FRICTION;
            player.vx *= friction;
            if (Math.abs(player.vx) < 0.1) player.vx = 0;
        }

        if (player.vx > MOVE_SPEED) player.vx = MOVE_SPEED;
        if (player.vx < -MOVE_SPEED) player.vx = -MOVE_SPEED;
    }

    // --- 2. Jumping & Wall Mechanics ---
    
    const jumpPressed = keys.current['z'];
    const prevJumpPressed = prevKeys.current['z'];
    const justPressedJump = jumpPressed && !prevJumpPressed;

    if (!player.isDashing) {
        // Wall Jump
        if (justPressedJump && player.isWallSliding && !player.isGrounded) {
             player.vy = WALL_JUMP_FORCE.y;
             player.vx = -player.wallDir * WALL_JUMP_FORCE.x; 
             player.isWallSliding = false;
             player.facingRight = player.wallDir < 0; 
             spawnParticles(player.wallDir === 1 ? player.x + player.w : player.x, player.y + player.h/2, '#ffffff', 8);
             soundManager.playJump();
        }
        // Regular Jump / Double Jump
        else if (justPressedJump) {
          if (player.jumpsRemaining > 0) {
            player.vy = JUMP_FORCE;
            player.jumpsRemaining--;
            player.isGrounded = false;
            player.isSliding = false; 
            spawnParticles(player.x + player.w/2, player.y + player.h, '#ffffff', 5);
            soundManager.playJump();
          }
        }
    }

    // --- 3. Weapon Handling ---

    // Switch Weapon (C)
    const switchPressed = keys.current['c'];
    const prevSwitchPressed = prevKeys.current['c'];
    if (switchPressed && !prevSwitchPressed && player.weapons.length > 1 && !player.isReloading) {
        player.currentWeaponIndex = (player.currentWeaponIndex + 1) % player.weapons.length;
        soundManager.playCollect(); 
    }

    // Use Medkit (V)
    const healPressed = keys.current['v'];
    const prevHealPressed = prevKeys.current['v'];
    if (healPressed && !prevHealPressed) {
        if (player.medkits > 0 && player.health < player.maxHealth) {
            player.medkits--;
            player.health++;
            spawnParticles(player.x + player.w/2, player.y, '#ef4444', 10);
            soundManager.playCollect();
        }
    }

    // Reload (R)
    const reloadPressed = keys.current['r'];
    const prevReloadPressed = prevKeys.current['r'];
    if (reloadPressed && !prevReloadPressed && !player.isReloading && currentWeaponType !== WeaponType.PISTOL) {
        // Check if we need to reload
        if (player.ammoClip[currentWeaponType] < weaponStats.clipSize && player.ammoReserve[currentWeaponType] > 0) {
            player.isReloading = true;
            player.reloadTimer = weaponStats.reloadDuration;
            soundManager.playReload();
        }
    }

    // Process Reload Timer
    if (player.isReloading) {
        player.reloadTimer--;
        if (player.reloadTimer <= 0) {
            player.isReloading = false;
            // Transfer ammo
            const currentClip = player.ammoClip[currentWeaponType];
            const needed = weaponStats.clipSize - currentClip;
            const available = player.ammoReserve[currentWeaponType];
            const toTransfer = Math.min(needed, available);
            
            player.ammoClip[currentWeaponType] += toTransfer;
            player.ammoReserve[currentWeaponType] -= toTransfer;
        }
    }

    // Update Previous Keys
    prevKeys.current = { ...keys.current };

    // Attack (Shooting) (X)
    if (keys.current['x'] && player.attackCooldown === 0 && !player.isWallSliding && !player.isSliding && !player.isDashing && !player.isReloading) {
      
      const ammoCount = player.ammoClip[currentWeaponType];
      const hasAmmo = currentWeaponType === WeaponType.PISTOL || ammoCount > 0;

      if (hasAmmo) {
        player.isAttacking = true;
        player.attackCooldown = weaponStats.cooldown;
        
        // Consume Ammo
        if (currentWeaponType !== WeaponType.PISTOL) {
            player.ammoClip[currentWeaponType]--;
        }

        const bulletX = player.facingRight ? player.x + player.w : player.x - 10;
        const bulletY = player.y + 35; 
        
        state.current.projectiles.push({
            x: bulletX,
            y: bulletY,
            w: weaponStats.bulletSize * 2,
            h: weaponStats.bulletSize,
            vx: player.facingRight ? weaponStats.bulletSpeed : -weaponStats.bulletSpeed,
            damage: weaponStats.damage,
            life: 60,
            color: '#fbbf24'
        });

        // Sound
        soundManager.playShoot(currentWeaponType);

        // Tiny recoil
        if (!player.isGrounded) player.vx += player.facingRight ? -1 : 1; 

      } else {
          // Dry Fire (Out of Ammo)
          player.attackCooldown = 15; // Short cooldown
          soundManager.playDryFire();
          
          // Optional: Auto-reload if tried to fire empty
          if (!player.isReloading && player.ammoReserve[currentWeaponType] > 0) {
             player.isReloading = true;
             player.reloadTimer = weaponStats.reloadDuration;
             soundManager.playReload();
          }
      }
    }

    // --- 4. Physics Application (X Axis) ---
    
    player.x += player.vx;
    player.wallDir = 0; 

    for (const plat of platforms) {
      if (checkCollision(player, plat) && plat.type !== 'goal') {
        if (player.vx > 0) {
            player.x = plat.x - player.w;
            player.wallDir = 1;
        } 
        else if (player.vx < 0) {
            player.x = plat.x + plat.w;
            player.wallDir = -1;
        }
        // Collision stops dash
        if (player.isDashing) {
             player.isDashing = false;
        }
        player.vx = 0;
        player.isSliding = false; 
      }
    }

    // --- 5. Physics Application (Y Axis) ---
    
    if (!player.isDashing) {
        player.vy += GRAVITY;
    }
    
    // Wall Slide Physics
    player.isWallSliding = false;
    if (player.wallDir !== 0 && !player.isGrounded && player.vy > 0 && !player.isDashing) {
        player.isWallSliding = true;
        if (player.vy > WALL_SLIDE_SPEED) player.vy = WALL_SLIDE_SPEED;
    }

    if (player.vy > TERMINAL_VELOCITY) player.vy = TERMINAL_VELOCITY;

    player.y += player.vy;
    player.isGrounded = false;
    
    for (const plat of platforms) {
      if (checkCollision(player, plat)) {
        if (plat.type === 'goal') {
          state.current.status = GameStatus.VICTORY;
          soundManager.playCollect(); // Victory sound
          onStatusChange(GameStatus.VICTORY);
          return; 
        }

        if (player.vy > 0) {
          player.y = plat.y - player.h;
          player.isGrounded = true;
          player.vy = 0;
          player.jumpsRemaining = MAX_JUMPS;
          player.isWallSliding = false;
          
          // --- CHECKPOINT SYSTEM ---
          // Save valid safe spots (only on ground or platform, not obstacles or near pits)
          if (plat.type === 'ground' || plat.type === 'platform') {
              player.lastSafeX = player.x;
              player.lastSafeY = player.y;
          }

        } else if (player.vy < 0) {
          player.y = plat.y + plat.h;
          player.vy = 0;
        }
      }
    }

    // --- VOID DAMAGE SYSTEM (Fall Logic) ---
    if (player.y > FLOOR_Y + 400) {
        if (player.health > 1) {
            // Respawn
            player.health -= 1;
            player.x = player.lastSafeX;
            player.y = player.lastSafeY - 50; // slightly above
            player.vx = 0;
            player.vy = 0;
            player.invincibleTimer = INVINCIBLE_FRAMES;
            soundManager.playDamage();
            // Flash screen red effect
            spawnParticles(canvasRef.current?.width ? canvasRef.current.width/2 + state.current.camera.x : player.x, player.y, '#ff0000', 50);
        } else {
            // Die
            player.health = 0;
            soundManager.playDamage();
        }
    }

    if (player.attackCooldown > 0) player.attackCooldown--;
    if (player.invincibleTimer > 0) player.invincibleTimer--;
    if (player.attackCooldown < weaponStats.cooldown - 5) player.isAttacking = false;

    // --- 6. Projectiles Logic ---
    state.current.projectiles.forEach(p => {
        p.x += p.vx;
        p.life--;
    });
    state.current.projectiles = state.current.projectiles.filter(p => p.life > 0 && p.x > -100 && p.x < WORLD_WIDTH + 100);

    // --- 7. Collectibles Logic ---
    state.current.collectibles.forEach(item => {
        if (!item.collected && checkCollision(player, item)) {
            let collected = false;
            
            if (item.type === 'medkit') {
                if (player.health < player.maxHealth) {
                    player.health++;
                    collected = true;
                    spawnParticles(player.x + player.w/2, player.y, '#ef4444', 10);
                    soundManager.playCollect();
                } else if (player.medkits < MAX_MEDKITS) {
                    player.medkits++;
                    collected = true;
                    spawnParticles(player.x + player.w/2, player.y, '#3b82f6', 10);
                    soundManager.playCollect();
                }
            } else if (item.type === 'weapon' && item.weaponType) {
                const hasWeapon = player.weapons.includes(item.weaponType);
                const wStats = WEAPONS[item.weaponType];

                if (hasWeapon) {
                    // Refill Ammo Reserve if we already have it
                    player.ammoReserve[item.weaponType] = Math.min(player.ammoReserve[item.weaponType] + wStats.pickupAmmo, wStats.maxAmmo);
                    state.current.score += 25;
                    onScoreUpdate(state.current.score);
                    collected = true;
                    soundManager.playCollect();
                } else {
                    // New Weapon or Swap
                    // Grant ammo for the new weapon
                    player.ammoReserve[item.weaponType] = Math.min(player.ammoReserve[item.weaponType] + wStats.pickupAmmo, wStats.maxAmmo);
                    // Ensure full clip on pickup for fun
                    player.ammoClip[item.weaponType] = wStats.clipSize; 

                    if (player.weapons.length < MAX_WEAPONS) {
                        // Add to inventory
                        player.weapons.push(item.weaponType);
                        player.currentWeaponIndex = player.weapons.length - 1; 
                    } else {
                        // Inventory Full -> Swap active weapon
                        player.weapons[player.currentWeaponIndex] = item.weaponType;
                        // Cancel reload if swapping
                        player.isReloading = false;
                        player.reloadTimer = 0;
                    }

                    collected = true;
                    spawnParticles(player.x + player.w/2, player.y, '#fbbf24', 15);
                    state.current.score += 50;
                    onScoreUpdate(state.current.score);
                    soundManager.playCollect();
                }
            } else if (item.type === 'ammo' && item.weaponType) {
                const wStats = WEAPONS[item.weaponType];
                player.ammoReserve[item.weaponType] = Math.min(player.ammoReserve[item.weaponType] + wStats.pickupAmmo, wStats.maxAmmo);
                collected = true;
                soundManager.playCollect();
                spawnParticles(player.x + player.w/2, player.y, '#10b981', 8);
            }

            if (collected) item.collected = true;
        }
    });

    // --- 8. Advanced Zombie AI ---
    state.current.zombies = zombies.filter(z => !z.isDead);
    
    state.current.zombies.forEach(zombie => {
      // A. Flocking / Separation
      let sepVx = 0;
      state.current.zombies.forEach(other => {
           if (zombie === other) return;
           if (Math.abs(zombie.y - other.y) > 50) return; // Ignore if on different floors
           
           const dist = zombie.x - other.x;
           const minDist = (zombie.w + other.w) / 2 * 0.9;
           
           if (Math.abs(dist) < minDist) {
               // Push apart
               sepVx += (dist > 0 ? 1 : -1) * 0.3; 
           }
      });

      // B. State Determination (Aggro & Persistence)
      const distToPlayer = Math.sqrt(Math.pow(player.x - zombie.x, 2) + Math.pow(player.y - zombie.y, 2));
      const stats = ZOMBIE_STATS[zombie.type];
      const canSeePlayer = distToPlayer < 400 && Math.abs(player.y - zombie.y) < 200;
      
      if (canSeePlayer) {
        zombie.aggro = true;
        zombie.searchTimer = 180; // Search for 3 seconds if lost
        zombie.lastKnownX = player.x;
        if (Math.random() < 0.005) soundManager.playZombieGroan();
      } else {
        // Persistence Logic
        if (zombie.aggro) {
            zombie.searchTimer--;
            if (zombie.searchTimer <= 0) {
                zombie.aggro = false; // Give up
            }
        }
      }

      // SCREAMER LOGIC (Infinite Spawn)
      if (zombie.type === ZombieType.SCREAMER && zombie.aggro) {
          // Continuous Spawning logic
          zombie.summonTimer--;
          if (zombie.summonTimer <= 0) {
             spawnZombieNear(zombie.x, zombie.y);
             zombie.summonTimer = 120; // Spawn every 2 seconds while aggro
             spawnParticles(zombie.x + zombie.w/2, zombie.y, '#ec4899', 5);
          }

          if (zombie.attackTimer > 0) {
              zombie.attackTimer--;
          } else {
              // BIG SCREAM (Horde Trigger + Alert)
              zombie.attackTimer = 600; // 10 seconds cooldown
              soundManager.playZombieScream();
              
              // Visual Pulse
              spawnParticles(zombie.x + zombie.w/2, zombie.y + zombie.h/2, '#ec4899', 20);
              
              // Alert others
              state.current.zombies.forEach(other => {
                  if (other === zombie) return;
                  const d = Math.sqrt(Math.pow(other.x - zombie.x, 2) + Math.pow(other.y - zombie.y, 2));
                  if (d < 800) { // Screen width range
                      other.aggro = true;
                      other.searchTimer = 180;
                      other.lastKnownX = zombie.x; // Come to the scream
                  }
              });
          }
      }

      // C. Target Velocity Calculation (AI Navigation)
      let targetVx = 0;

      if (zombie.aggro) {
          // Chase Player or go to last known location
          const targetX = canSeePlayer ? player.x : zombie.lastKnownX;
          const dir = targetX > zombie.x ? 1 : -1;
          
          // Stop if reached last known location and player is gone
          if (!canSeePlayer && Math.abs(targetX - zombie.x) < 10) {
              targetVx = 0;
          } else {
              targetVx = dir * stats.speed;
              zombie.facingRight = dir > 0;
          }

      } else {
          // Patrol Logic
          if (Math.abs(zombie.vx) < 0.1) zombie.vx = Math.random() > 0.5 ? 1 : -1;
          targetVx = zombie.vx > 0 ? stats.speed * 0.5 : -stats.speed * 0.5;
          
          if (zombie.x > zombie.patrolCenter + zombie.patrolRange) targetVx = -Math.abs(targetVx);
          if (zombie.x < zombie.patrolCenter - zombie.patrolRange) targetVx = Math.abs(targetVx);
          
          zombie.facingRight = targetVx > 0;
      }

      // Apply Separation & Movement
      zombie.vx = targetVx + sepVx;

      // D. Environmental Sensing (Look Ahead)
      const lookAheadX = zombie.x + (zombie.facingRight ? zombie.w + 10 : -10);
      const lookAheadY = zombie.y + zombie.h + 2; // Check floor
      
      let groundAhead = false;
      let wallAhead = false;
      
      // Simple raycast against platforms
      for (const plat of platforms) {
          // Check for ground
          if (lookAheadX >= plat.x && lookAheadX <= plat.x + plat.w && Math.abs(lookAheadY - plat.y) < 20) {
              groundAhead = true;
          }
          // Check for walls (Obstacles at head height)
          if (plat.type === 'obstacle' || plat.type === 'platform') {
               const checkRect = { 
                   x: lookAheadX, 
                   y: zombie.y + 10, 
                   w: 5, 
                   h: zombie.h - 20 
               };
               if (checkCollision(checkRect, plat)) wallAhead = true;
          }
      }

      // E. Decision Making (Jump / Turn)
      if (zombie.isGrounded) {
          if (zombie.aggro) {
              // Smart Navigation
              let shouldJump = false;
              
              // 1. Jump over obstacles
              if (wallAhead && zombie.type !== ZombieType.TANK) shouldJump = true;
              
              // 2. Jump over gaps (Gap Crossing)
              if (!groundAhead && zombie.type !== ZombieType.TANK) {
                   shouldJump = true;
                   // Lunge forward
                   zombie.vx *= 1.5; 
              }

              // 3. Vertical Aggression (Player is above)
              if (canSeePlayer && player.y < zombie.y - 60 && Math.abs(player.x - zombie.x) < 150) {
                  shouldJump = true;
              }

              // 4. Jumper specific logic
              if (zombie.type === ZombieType.JUMPER && player.y < zombie.y - 50) shouldJump = true;

              if (shouldJump) {
                  zombie.vy = -13; // Standard Jump
                  zombie.isGrounded = false;
              }
          } else {
              // Patrolling: Turn at edges or walls
              if (!groundAhead || wallAhead) {
                  zombie.vx *= -1; // Turn around
                  // Shift slightly to prevent stuck loop
                  zombie.x += zombie.vx * 2;
              }
          }
      }

      // F. Physics Integration
      zombie.vy += GRAVITY;
      zombie.x += zombie.vx;
      zombie.y += zombie.vy;

      // G. Zombie-Platform Collision
      let zombieGrounded = false;
      for (const plat of platforms) {
        if (checkCollision(zombie, plat)) {
          if (zombie.vy > 0) {
             zombie.y = plat.y - zombie.h;
             zombie.vy = 0;
             zombieGrounded = true;
          } else if (zombie.vx !== 0) {
             // Hit wall - stop horizontal movement
             zombie.x -= zombie.vx; 
             zombie.vx = 0;
          }
        }
      }
      zombie.isGrounded = zombieGrounded;

      // H. Combat Interactions
      state.current.projectiles.forEach(p => {
          if (p.life > 0 && checkCollision(p, zombie)) {
              zombie.health -= p.damage;
              p.life = 0; 
              
              let knockback = p.vx > 0 ? 5 : -5;
              if (zombie.type === ZombieType.TANK) knockback *= 0.1;
              
              zombie.vx = knockback;
              zombie.vy = -2;
              
              // Alert on hit
              zombie.aggro = true;
              zombie.searchTimer = 180;
              zombie.lastKnownX = player.x;

              spawnParticles(zombie.x + zombie.w/2, zombie.y + zombie.h/2, zombie.color, 3);
              soundManager.playZombieHit();

              if (zombie.health <= 0) {
                  zombie.isDead = true;
                  state.current.score += 100;
                  if (zombie.type === ZombieType.TANK) state.current.score += 400; 
                  if (zombie.type === ZombieType.SCREAMER) state.current.score += 200;
                  onScoreUpdate(state.current.score);
                  spawnParticles(zombie.x + zombie.w/2, zombie.y + zombie.h/2, '#ef4444', 15);
              }
          }
      });

      // --- SOLID ZOMBIE COLLISION & DAMAGE ---
      if (checkCollision(player, zombie) && !zombie.isDead) {
         
         // SPECIAL: DASH KILL vs DASH BOUNCE
         if (player.isDashing) {
             // BALANCE: TANKS REFLECT DASH
             if (zombie.type === ZombieType.TANK) {
                 player.isDashing = false;
                 player.vx = player.facingRight ? -10 : 10; // Bounce back hard
                 player.vy = -5;
                 spawnParticles(player.x + player.w/2, player.y + player.h/2, '#ffffff', 10);
                 soundManager.playClang(); // Add clang sound method or re-use dry fire
                 // Stun the tank slightly?
                 zombie.vx = player.facingRight ? 5 : -5;
             } else {
                 // Kill normal zombies
                 zombie.health -= 50; 
                 zombie.vx = player.facingRight ? 15 : -15;
                 zombie.vy = -5;
                 spawnParticles(zombie.x + zombie.w/2, zombie.y + zombie.h/2, '#ef4444', 15);
                 soundManager.playZombieHit();
                 if (zombie.health <= 0) {
                      zombie.isDead = true;
                      state.current.score += 100;
                      if (zombie.type === ZombieType.SCREAMER) state.current.score += 200;
                      onScoreUpdate(state.current.score);
                 }
             }
         } else {
             // 1. Calculate Overlap
             const playerCX = player.x + player.w/2;
             const zombieCX = zombie.x + zombie.w/2;
             const dx = playerCX - zombieCX;
             
             const combinedHalfWidths = (player.w / 2) + (zombie.w / 2);
             const overlapX = combinedHalfWidths - Math.abs(dx);
             
             // 2. Resolve Physics (Make them solid)
             // Only push if there is significant overlap
             if (overlapX > 0 && overlapX < 30) {
                 if (playerCX > zombieCX) {
                     player.x += overlapX; // Push Player Right
                 } else {
                     player.x -= overlapX; // Push Player Left
                 }
                 
                 // Kill momentum into the zombie
                 player.vx = 0;
                 
                 // Also stop zombie to feel weight
                 zombie.vx = 0; 
             }

             // 3. Apply Damage
             if (player.invincibleTimer === 0) {
                player.health -= 1;
                player.invincibleTimer = INVINCIBLE_FRAMES;
                player.vy = -8;
                player.vx = player.x < zombie.x ? -12 : 12; // Big knockback on damage
                spawnParticles(player.x + player.w/2, player.y + player.h/2, '#ef4444', 10);
                soundManager.playDamage();
             }
         }
      }
    });

    if (player.health <= 0) {
      state.current.status = GameStatus.GAME_OVER;
      onStatusChange(GameStatus.GAME_OVER);
    }

    // --- 9. Particles ---
    state.current.particles.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.life -= 0.05;
    });
    state.current.particles = state.current.particles.filter(p => p.life > 0);

    const canvas = canvasRef.current;
    if (canvas) {
        // Camera Follow Logic (Smooth)
        const targetCamX = player.x - canvas.width / 3; // Keep player slightly left of center
        state.current.camera.x += (targetCamX - state.current.camera.x) * 0.1;
        
        if (state.current.camera.x < 0) state.current.camera.x = 0;
        if (state.current.camera.x > WORLD_WIDTH - canvas.width) state.current.camera.x = WORLD_WIDTH - canvas.width;
        
        // Lock vertical camera
        state.current.camera.y = 0;
    }

  }, [onScoreUpdate, onStatusChange]);

  // --- Visual Helpers ---
  
  const drawWeapon = (ctx: CanvasRenderingContext2D, type: WeaponType, x: number, y: number, facingRight: boolean = true, scale: number = 1) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);
    if (!facingRight) ctx.scale(-1, 1);

    if (type === WeaponType.PISTOL) {
        ctx.fillStyle = '#9ca3af'; 
        ctx.fillRect(-6, -4, 14, 6);
        ctx.fillStyle = '#374151';
        ctx.fillRect(-6, -1, 6, 8);
        ctx.fillStyle = '#1f2937';
        ctx.fillRect(-1, 2, 3, 3);
    } else if (type === WeaponType.SMG) {
        ctx.fillStyle = '#1f2937';
        ctx.fillRect(-8, -6, 16, 10);
        ctx.fillStyle = '#4b5563';
        ctx.fillRect(8, -4, 4, 2);
        ctx.fillStyle = '#000000';
        ctx.fillRect(-2, 4, 5, 8);
        ctx.fillStyle = '#60a5fa';
        ctx.fillRect(-6, -6, 12, 2);
    } else if (type === WeaponType.SHOTGUN) {
        ctx.fillStyle = '#78350f';
        ctx.fillRect(-16, -2, 14, 6);
        ctx.fillStyle = '#4b5563';
        ctx.fillRect(-2, -4, 24, 4);
        ctx.fillStyle = '#111827';
        ctx.fillRect(6, 0, 10, 3);
    }
    
    ctx.restore();
  };

  const drawPlayer = (ctx: CanvasRenderingContext2D, player: Player) => {
    const { x, y, w, h, facingRight, color, isSliding, isWallSliding, isDashing } = player;

    ctx.save();
    
    // Dash visual effect
    if (isDashing) {
        ctx.shadowBlur = 20;
        ctx.shadowColor = '#06b6d4';
        ctx.globalAlpha = 0.8;
    }

    if (isSliding) {
        // Draw Sliding Pose (Horizontal)
        const slideH = h / 2;
        const slideY = y + slideH;
        
        ctx.fillStyle = '#1f2937'; // Legs trailing
        ctx.fillRect(facingRight ? x : x + 20, slideY + 5, 20, 10);
        
        ctx.fillStyle = color; // Body
        ctx.fillRect(x + 5, slideY, 30, 20);
        
        ctx.fillStyle = '#fca5a5'; // Head
        ctx.fillRect(facingRight ? x + 25 : x + 5, slideY - 5, 15, 15);
        
        // Motion lines
        ctx.strokeStyle = '#fff';
        ctx.beginPath();
        ctx.moveTo(facingRight ? x - 10 : x + w + 10, slideY + 10);
        ctx.lineTo(facingRight ? x : x + w, slideY + 10);
        ctx.stroke();

    } else if (isWallSliding) {
        // Draw Wall Slide Pose (Clinging)
        const wallX = player.wallDir === 1 ? x + w - 10 : x;
        
        ctx.fillStyle = color; // Body
        ctx.fillRect(x + 5, y + 10, 30, 30);
        
        ctx.fillStyle = '#1f2937'; // Legs dangling
        ctx.fillRect(x + 10, y + 40, 8, 15);
        ctx.fillRect(x + 22, y + 35, 8, 15);

        ctx.fillStyle = '#fca5a5'; // Head
        ctx.fillRect(x + 10, y - 5, 20, 20);
        
        // Arm holding wall
        ctx.fillStyle = '#fca5a5';
        ctx.fillRect(player.wallDir === 1 ? x + 25 : x + 5, y + 15, 10, 5);
        
        // Dust particles for sliding
        if (Math.random() > 0.7) {
            ctx.fillStyle = '#ccc';
            ctx.fillRect(player.wallDir === 1 ? x + w : x, y + h, 4, 4);
        }

    } else {
        // Standard Pose (Run/Idle)
        // Legs
        ctx.fillStyle = '#1f2937'; 
        // Animate legs based on VX
        const walkCycle = Math.sin(Date.now() / 100) * (Math.abs(player.vx) > 0.1 ? 5 : 0);
        ctx.fillRect(x + 8 + walkCycle, y + h - 20, 10, 20); 
        ctx.fillRect(x + 22 - walkCycle, y + h - 20, 10, 20); 

        // Body
        ctx.fillStyle = color;
        ctx.fillRect(x + 5, y + 20, 30, 25);

        // Head
        ctx.fillStyle = '#fca5a5'; 
        ctx.fillRect(x + 10, y, 20, 20);
        ctx.fillStyle = '#5c3a21'; 
        ctx.fillRect(x + 8, y - 2, 24, 6);
        
        // Eyes
        ctx.fillStyle = '#000';
        const eyeX = facingRight ? x + 24 : x + 12;
        ctx.fillRect(eyeX, y + 6, 4, 4);

        // Arms & Weapon
        ctx.fillStyle = color;
        const armX = facingRight ? x + 20 : x + 10;
        const armY = y + 25;
        ctx.fillRect(armX, armY, 10, 8); 

        ctx.fillStyle = '#fca5a5';
        const handX = facingRight ? armX + 10 : armX - 10;
        ctx.fillRect(handX, armY + 2, 8, 4);

        const weaponX = facingRight ? handX + 10 : handX - 5;
        const weaponY = armY + 6;
        drawWeapon(ctx, player.weapons[player.currentWeaponIndex], weaponX, weaponY, facingRight);
    }
    
    ctx.restore();
  };

  const drawCollectible = (ctx: CanvasRenderingContext2D, item: Collectible) => {
    // Hover animation
    const floatY = Math.sin(Date.now() / 300) * 5;
    const cy = item.y + item.h / 2 + floatY;
    const cx = item.x + item.w / 2;

    if (item.type === 'weapon' && item.weaponType) {
        // Glowing Orb background
        const gradient = ctx.createRadialGradient(cx, cy, 5, cx, cy, 25);
        gradient.addColorStop(0, 'rgba(59, 130, 246, 0.5)'); // Blue glow
        gradient.addColorStop(1, 'rgba(59, 130, 246, 0)');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(cx, cy, 25, 0, Math.PI * 2);
        ctx.fill();

        // Draw the weapon icon centered
        drawWeapon(ctx, item.weaponType, cx, cy, true, 1.5);
    } else if (item.type === 'ammo' && item.weaponType) {
        // Ammo Box
        ctx.fillStyle = '#10b981'; // Greenish box
        ctx.fillRect(item.x, item.y + floatY, item.w, item.h);
        
        // Label 'A'
        ctx.fillStyle = '#064e3b';
        ctx.font = 'bold 12px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('AMMO', cx, cy + 4);
        ctx.textAlign = 'left';

        // Border
        ctx.strokeStyle = '#34d399';
        ctx.lineWidth = 1;
        ctx.strokeRect(item.x, item.y + floatY, item.w, item.h);

    } else if (item.type === 'medkit') {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(item.x, item.y + floatY, item.w, item.h);
        ctx.fillStyle = '#ef4444';
        // Cross
        ctx.fillRect(cx - 4, item.y + floatY + 5, 8, item.h - 10);
        ctx.fillRect(item.x + 5, cy - 4, item.w - 10, 8);
        
        // Border
        ctx.strokeStyle = '#d1d5db';
        ctx.lineWidth = 1;
        ctx.strokeRect(item.x, item.y + floatY, item.w, item.h);
    }
  };

  // --- Render Loop ---

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { player, platforms, zombies, particles, projectiles, collectibles, camera, hordeWarningTimer } = state.current;

    // Clear
    ctx.fillStyle = '#111827';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.translate(-Math.floor(camera.x), -Math.floor(camera.y));

    // Background
    ctx.fillStyle = '#1f2937';
    for(let i=0; i<40; i++) { 
        const x = (i * 300) - (camera.x * 0.2); 
        ctx.fillRect(x, 100, 100, 1500);
    }

    // Platforms
    platforms.forEach(plat => {
      if (plat.type === 'goal') {
        ctx.fillStyle = '#fbbf24';
        ctx.shadowBlur = 20;
        ctx.shadowColor = '#fbbf24';
        ctx.fillRect(plat.x, plat.y, plat.w, plat.h);
      } else if (plat.type === 'ground') {
        ctx.fillStyle = '#374151';
        ctx.shadowBlur = 0;
        ctx.fillRect(plat.x, plat.y, plat.w, plat.h);
        // Top detail
        ctx.fillStyle = '#4b5563';
        ctx.fillRect(plat.x, plat.y, plat.w, 10);
      } else {
        ctx.fillStyle = '#4b5563';
        ctx.shadowBlur = 0;
        ctx.fillRect(plat.x, plat.y, plat.w, plat.h);
        // Bevel
        ctx.fillStyle = '#6b7280';
        ctx.fillRect(plat.x, plat.y, plat.w, 5);
      }
    });

    // Collectibles
    collectibles.forEach(item => {
        if (!item.collected) {
            drawCollectible(ctx, item);
        }
    });

    // Zombies
    zombies.forEach(z => {
      ctx.fillStyle = z.aggro ? '#ef4444' : z.color;
      
      if (z.type === ZombieType.TANK) {
         ctx.fillRect(z.x, z.y, z.w, z.h);
         ctx.strokeStyle = '#000';
         ctx.lineWidth = 2;
         ctx.strokeRect(z.x, z.y, z.w, z.h);
         // Tank details
         ctx.fillStyle = '#581c87';
         ctx.fillRect(z.x + 5, z.y + 10, z.w - 10, 10);
      } else if (z.type === ZombieType.SCREAMER) {
         // Screamer visual
         ctx.fillRect(z.x, z.y, z.w, z.h);
         if (z.aggro && z.attackTimer > 550) { // Screaming animation (first 50 frames of cooldown)
             ctx.fillStyle = '#fff';
             const mouthW = 10 + Math.random() * 5;
             const mouthX = z.facingRight ? z.x + z.w - 5 : z.x - 5;
             ctx.beginPath();
             ctx.arc(mouthX, z.y + 15, mouthW, 0, Math.PI * 2);
             ctx.fill();
         }
      } else {
         ctx.fillRect(z.x, z.y, z.w, z.h);
      }
      
      // Face
      ctx.fillStyle = 'black';
      const eyeOffset = z.facingRight ? z.w - 10 : 2;
      ctx.fillRect(z.x + eyeOffset, z.y + 10, 8, 8);
      
      // Health bar
      ctx.fillStyle = 'red';
      ctx.fillRect(z.x, z.y - 10, z.w, 4);
      ctx.fillStyle = 'lime';
      ctx.fillRect(z.x, z.y - 10, z.w * (z.health / z.maxHealth), 4);
    });

    // Projectiles
    projectiles.forEach(p => {
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x, p.y, p.w, p.h);
    });

    // Particles
    particles.forEach(p => {
      ctx.globalAlpha = p.life;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1.0;
    });

    // Player
    if (player.invincibleTimer % 4 < 2) {
        drawPlayer(ctx, player);
    }
    
    // Dash/Reload Indicator on Player
    if (player.isReloading) {
        ctx.fillStyle = '#fbbf24';
        ctx.font = 'bold 12px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('RELOADING...', player.x + player.w / 2, player.y - 20);
        
        // Progress Bar
        const maxTime = WEAPONS[player.weapons[player.currentWeaponIndex]].reloadDuration;
        const progress = 1 - (player.reloadTimer / maxTime);
        
        ctx.fillStyle = '#374151';
        ctx.fillRect(player.x - 10, player.y - 15, player.w + 20, 4);
        ctx.fillStyle = '#fbbf24';
        ctx.fillRect(player.x - 10, player.y - 15, (player.w + 20) * progress, 4);
        ctx.textAlign = 'left';
    } else if (player.dashCooldown > 0) {
        // Dash Cooldown bar
        const progress = 1 - (player.dashCooldown / DASH_COOLDOWN);
        ctx.fillStyle = '#164e63';
        ctx.fillRect(player.x - 10, player.y - 10, player.w + 20, 3);
        ctx.fillStyle = '#06b6d4';
        ctx.fillRect(player.x - 10, player.y - 10, (player.w + 20) * progress, 3);
    }

    ctx.restore();
    
    // --- UI OVERLAY ELEMENTS (HUD is separate, but Warning Text is part of Canvas draw) ---
    
    if (hordeWarningTimer > 0) {
        ctx.save();
        ctx.fillStyle = 'rgba(220, 38, 38, 0.2)'; // Red overlay
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Flashing Text
        if (Math.floor(Date.now() / 200) % 2 === 0) {
            ctx.fillStyle = '#ef4444'; // Red-500
            ctx.shadowColor = 'black';
            ctx.shadowBlur = 10;
            ctx.font = '900 48px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('¡SE ACERCAN LOS ZOMBIES!', canvas.width / 2, canvas.height / 3);
            ctx.strokeStyle = 'white';
            ctx.lineWidth = 2;
            ctx.strokeText('¡SE ACERCAN LOS ZOMBIES!', canvas.width / 2, canvas.height / 3);
        }
        ctx.restore();
    }

  }, []);

  const drawWithHUD = useCallback(() => {
      draw();
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      
      const { player, score } = state.current;
      
      // HUD Background
      ctx.fillStyle = 'rgba(17, 24, 39, 0.8)';
      ctx.fillRect(10, 10, 360, 110);
      ctx.strokeStyle = '#4b5563';
      ctx.lineWidth = 2;
      ctx.strokeRect(10, 10, 360, 110);
      
      // Hearts (Lives)
      ctx.font = 'bold 16px sans-serif';
      ctx.fillStyle = '#9ca3af';
      ctx.fillText('HEALTH', 25, 35);
      
      for(let i=0; i<MAX_HEALTH; i++) {
          ctx.fillStyle = i < player.health ? '#ef4444' : '#374151';
          const hx = 90 + (i * 25);
          ctx.beginPath();
          ctx.arc(hx, 30, 8, 0, Math.PI * 2);
          ctx.fill();
      }

      // Inventory: Weapons
      ctx.fillStyle = '#9ca3af';
      ctx.fillText('WEAPONS', 25, 70);
      
      player.weapons.forEach((w, index) => {
          const isActive = index === player.currentWeaponIndex;
          const wx = 100 + (index * 70);
          
          // Slot box
          ctx.fillStyle = isActive ? '#1e3a8a' : '#374151'; // Blue for active
          ctx.fillRect(wx, 50, 60, 30);
          if (isActive) {
            ctx.strokeStyle = '#60a5fa';
            ctx.strokeRect(wx, 50, 60, 30);
          }

          // Draw weapon icon centered in slot
          drawWeapon(ctx, w, wx + 30, 65, true, 1.2);

          // PERSISTENT AMMO COUNTER
          const clip = player.ammoClip[w];
          const reserve = player.ammoReserve[w];
          const isInfinite = w === WeaponType.PISTOL;
          const isEmpty = !isInfinite && clip === 0 && reserve === 0;
          const isClipEmpty = !isInfinite && clip === 0;
          
          ctx.font = 'bold 10px monospace';
          ctx.textAlign = 'right';
          
          if (isInfinite) {
             ctx.fillStyle = '#9ca3af'; // Gray for infinity
             ctx.fillText('∞', wx + 55, 60);
          } else {
             // Flash red if completely empty or clip empty
             if (isEmpty) {
                 const flash = Math.floor(Date.now() / 300) % 2 === 0;
                 ctx.fillStyle = flash ? '#ef4444' : '#7f1d1d'; 
             } else if (isClipEmpty) {
                 const flash = Math.floor(Date.now() / 300) % 2 === 0;
                 ctx.fillStyle = flash ? '#f59e0b' : '#d97706'; // Orange warning for reload
             } else {
                 ctx.fillStyle = isActive ? '#ffffff' : '#d1d5db';
             }
             
             // Format: Clip / Reserve
             ctx.fillText(`${clip}/${reserve}`, wx + 58, 75); 
          }
          ctx.textAlign = 'left';

          // Active Weapon Name (Below slot)
          if (isActive) {
             ctx.fillStyle = '#ffffff';
             ctx.font = '10px monospace';
             ctx.textAlign = 'center';
             // Draw Name only
             ctx.fillText(WEAPONS[w].name.substring(0, 3), wx + 30, 95);
             ctx.textAlign = 'left';
          }
      });

      // Inventory: Medkits
      ctx.fillStyle = '#9ca3af';
      ctx.fillText('ITEM', 250, 70);
      
      ctx.strokeStyle = '#374151';
      ctx.strokeRect(250, 50, 30, 30);
      
      if (player.medkits > 0) {
          ctx.fillStyle = '#ef4444'; 
          ctx.fillRect(258, 54, 14, 22); // Box
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(263, 56, 4, 18); // Cross vert
          ctx.fillRect(260, 63, 10, 4); // Cross horz
      }

      // Score
      ctx.fillStyle = '#fbbf24';
      ctx.textAlign = 'right';
      ctx.font = 'bold 24px monospace';
      ctx.fillText(`${score}`, 350, 40);
      ctx.textAlign = 'left';

  }, [draw]);

  const tick = useCallback((time: number) => {
      if (state.current.status !== GameStatus.PLAYING) return;

      if (lastTimeRef.current === 0) {
          lastTimeRef.current = time;
      }
      
      const deltaTime = time - lastTimeRef.current;
      lastTimeRef.current = time;
      
      let clampedDelta = Math.min(deltaTime, 100);
      accumulatorRef.current += clampedDelta;

      while (accumulatorRef.current >= FIXED_TIME_STEP) {
          update();
          accumulatorRef.current -= FIXED_TIME_STEP;
      }
      
      drawWithHUD();
      requestRef.current = requestAnimationFrame(tick);
  }, [update, drawWithHUD, FIXED_TIME_STEP]);

  useEffect(() => {
    if (gameStatus === GameStatus.PLAYING) {
        if (state.current.status !== GameStatus.PLAYING) {
             // Only init if starting a new game, not when resuming from pause
             if (state.current.status === GameStatus.MENU || state.current.status === GameStatus.GAME_OVER || state.current.status === GameStatus.VICTORY) {
                initGame();
            }
            state.current.status = GameStatus.PLAYING;
            lastTimeRef.current = 0;
            accumulatorRef.current = 0;
        }
        requestRef.current = requestAnimationFrame(tick);
    } else {
        cancelAnimationFrame(requestRef.current);
        drawWithHUD();
    }
    return () => cancelAnimationFrame(requestRef.current);
  }, [gameStatus, tick, initGame, drawWithHUD]);

  // Pause Key Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'p') {
        if (gameStatus === GameStatus.PLAYING) {
             onStatusChange(GameStatus.PAUSED);
             state.current.status = GameStatus.PAUSED;
        } else if (gameStatus === GameStatus.PAUSED) {
             onStatusChange(GameStatus.PLAYING);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameStatus, onStatusChange]);

  // Input Listeners
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => { 
        keys.current[e.key.toLowerCase()] = true; 
    };
    const handleKeyUp = (e: KeyboardEvent) => { 
        keys.current[e.key.toLowerCase()] = false; 
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Resize Handler
  useEffect(() => {
    const handleResize = () => {
        if (canvasRef.current) {
            canvasRef.current.width = window.innerWidth;
            canvasRef.current.height = window.innerHeight;
            drawWithHUD(); 
        }
    };
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, [drawWithHUD]);


  // Touch Control Handlers
  const handleTouch = (key: string, pressed: boolean) => (e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault(); // Prevent default browser actions like zooming/scrolling
    if (state.current.status === GameStatus.PLAYING) {
        keys.current[key] = pressed;
    }
  };

  const handlePause = (e: React.TouchEvent | React.MouseEvent) => {
      e.preventDefault();
      if (gameStatus === GameStatus.PLAYING) {
           onStatusChange(GameStatus.PAUSED);
           state.current.status = GameStatus.PAUSED;
      } else if (gameStatus === GameStatus.PAUSED) {
           onStatusChange(GameStatus.PLAYING);
      }
  };
  
  // Joystick Logic
  const handleJoystickTouch = (e: React.TouchEvent) => {
    e.preventDefault();
    if (state.current.status !== GameStatus.PLAYING) return;
    
    const touch = e.targetTouches[0];
    const base = joystickBaseRef.current;
    if (!base || !touch) return;
    
    const rect = base.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    
    // Calculate relative touch position inside the joystick container
    const touchX = touch.clientX - rect.left;
    const touchY = touch.clientY - rect.top;
    
    const dx = touchX - centerX;
    const dy = touchY - centerY;
    
    const distance = Math.sqrt(dx*dx + dy*dy);
    const maxRadius = 30; // Max visual distance of knob
    
    let clampedX = dx;
    let clampedY = dy;
    
    if (distance > maxRadius) {
        const ratio = maxRadius / distance;
        clampedX = dx * ratio;
        clampedY = dy * ratio;
    }
    
    // Update Knob Visual
    if (joystickKnobRef.current) {
        joystickKnobRef.current.style.transform = `translate(${clampedX}px, ${clampedY}px)`;
    }
    
    // Map to Keys (Threshold of 10 for deadzone)
    keys.current['arrowleft'] = clampedX < -10;
    keys.current['arrowright'] = clampedX > 10;
    keys.current['arrowdown'] = clampedY > 15; // Slide logic
  };
  
  const handleJoystickEnd = (e: React.TouchEvent) => {
     e.preventDefault();
     if (joystickKnobRef.current) {
        joystickKnobRef.current.style.transform = `translate(0px, 0px)`;
    }
    keys.current['arrowleft'] = false;
    keys.current['arrowright'] = false;
    keys.current['arrowdown'] = false;
  };

  return (
    <div className="relative w-full h-full" style={{ touchAction: 'none' }}>
      <canvas ref={canvasRef} className="block w-full h-full" />
      
      {/* Mobile Controls Overlay - Visible on touch devices or small screens */}
      {(isMobile || window.innerWidth < 1024) && gameStatus === GameStatus.PLAYING && (
          <>
            {/* Top Right Utils (Row) */}
            <div className="absolute top-4 right-4 flex gap-4">
                <button 
                  className="w-10 h-10 bg-gray-700/80 rounded border border-gray-400 flex items-center justify-center text-white text-xs font-bold"
                  onTouchStart={handleTouch('r', true)} onTouchEnd={handleTouch('r', false)}
                >
                    R
                </button>
                <button 
                  className="w-10 h-10 bg-gray-700/80 rounded border border-gray-400 flex items-center justify-center text-white text-xs font-bold"
                  onTouchStart={handleTouch('c', true)} onTouchEnd={handleTouch('c', false)}
                >
                    SWAP
                </button>
                <button 
                  className="w-10 h-10 bg-red-900/80 rounded border border-red-400 flex items-center justify-center text-white text-xl font-bold"
                  onTouchStart={handleTouch('v', true)} onTouchEnd={handleTouch('v', false)}
                >
                    +
                </button>
                <button 
                   className="w-10 h-10 bg-yellow-600/80 rounded border border-yellow-400 flex items-center justify-center text-white font-bold"
                   onTouchStart={handlePause}
                >
                    ||
                </button>
            </div>

            {/* Bottom Left: Analog Joystick */}
            <div 
                ref={joystickBaseRef}
                className="absolute bottom-8 left-8 w-32 h-32 bg-gray-800/50 rounded-full border-2 border-gray-500 flex items-center justify-center backdrop-blur-sm touch-none"
                onTouchStart={handleJoystickTouch}
                onTouchMove={handleJoystickTouch}
                onTouchEnd={handleJoystickEnd}
            >
                <div 
                    ref={joystickKnobRef}
                    className="w-12 h-12 bg-white/80 rounded-full shadow-lg pointer-events-none"
                    style={{ transform: 'translate(0px, 0px)' }}
                ></div>
            </div>

            {/* Bottom Right: Action Cluster (Ergonomic Arc) */}
            <div className="absolute bottom-6 right-6 w-48 h-48 pointer-events-none">
                 {/* Shoot (Left) */}
                 <button 
                   className="absolute bottom-4 left-0 w-16 h-16 bg-red-600/80 rounded-full border-2 border-white active:bg-red-400 text-white font-bold text-xs flex items-center justify-center shadow-lg pointer-events-auto"
                   onTouchStart={handleTouch('x', true)} onTouchEnd={handleTouch('x', false)}
                >
                    FIRE
                </button>
                
                {/* Jump (Main - Bottom Right) */}
                <button 
                   className="absolute bottom-0 right-0 w-20 h-20 bg-blue-600/80 rounded-full border-2 border-white active:bg-blue-400 text-white font-bold text-sm flex items-center justify-center shadow-xl pointer-events-auto"
                   onTouchStart={handleTouch('z', true)} onTouchEnd={handleTouch('z', false)}
                >
                    JUMP
                </button>

                {/* Dash (Top) */}
                <button 
                   className="absolute top-4 right-8 w-14 h-14 bg-cyan-600/80 rounded-full border-2 border-white active:bg-cyan-400 text-white font-bold text-xs flex items-center justify-center shadow-lg pointer-events-auto"
                   onTouchStart={handleTouch(' ', true)} onTouchEnd={handleTouch(' ', false)}
                >
                    DASH
                </button>
            </div>
          </>
      )}
    </div>
  );
};

export default GameCanvas;