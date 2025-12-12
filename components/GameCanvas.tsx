import React, { useRef, useEffect, useState, useCallback } from 'react';
import { 
  GameState, 
  GameStatus, 
  Player, 
  Rect,
  WeaponType,
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
  
  // Viewport Logic
  const TARGET_HEIGHT = 640; // The logical height the game is designed for
  const scaleRef = useRef<number>(1);
  
  // Input State
  const keys = useRef<{ [key: string]: boolean }>({});
  const prevKeys = useRef<{ [key: string]: boolean }>({}); 
  const [isMobile, setIsMobile] = useState(false);
  const [isLandscape, setIsLandscape] = useState(true);

  // Joystick Refs
  const joystickBaseRef = useRef<HTMLDivElement>(null);
  const joystickKnobRef = useRef<HTMLDivElement>(null);
  const joystickTouchId = useRef<number | null>(null);

  // --- 1. Prevent Scrolling & Handle Resize Globally ---
  useEffect(() => {
      // Strictly prevent scrolling on mobile by capturing the event at body level
      const preventDefault = (e: TouchEvent) => {
          e.preventDefault();
      };
      
      // 'passive: false' is required to allow preventDefault() to work
      document.body.addEventListener('touchmove', preventDefault, { passive: false });
      
      return () => {
          document.body.removeEventListener('touchmove', preventDefault);
      };
  }, []);

  // Detect Mobile & Orientation & Resize
  useEffect(() => {
    const handleResize = () => {
        const w = window.innerWidth;
        const h = window.innerHeight;
        
        if (canvasRef.current) {
            canvasRef.current.width = w;
            canvasRef.current.height = h;
        }
        
        // Calculate scale to fit the target height
        // This ensures the floor (600px) is always visible even on short screens (e.g. 360px high)
        scaleRef.current = h / TARGET_HEIGHT;

        setIsLandscape(w > h);
        setIsMobile(('ontouchstart' in window) || (navigator.maxTouchPoints > 0));
    };

    // Add listener
    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', () => {
        // Delay slightly to allow browser to finish layout change
        setTimeout(handleResize, 100);
        setTimeout(handleResize, 500);
    });
    
    // Initial call
    handleResize();
    
    return () => window.removeEventListener('resize', handleResize);
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
      state.current.hordeWarningTimer = HORDE_WARNING_DURATION;
      soundManager.playHordeAlert();
      
      const count = isMini ? 3 : 8;
      const { player, camera } = state.current;
      const screenWidth = window.innerWidth;
      
      // Calculate scaled screen width for spawn logic
      const logicalWidth = screenWidth / scaleRef.current;
      
      const spawnPoints = [
          camera.x - 50,
          camera.x + logicalWidth + 50
      ];

      for (let i = 0; i < count; i++) {
          const spawnX = spawnPoints[Math.floor(Math.random() * spawnPoints.length)] + (Math.random() * 200 - 100);
          const type = Math.random() > 0.7 ? ZombieType.RUNNER : ZombieType.WALKER;
          const stats = ZOMBIE_STATS[type];

          state.current.zombies.push({
            x: spawnX,
            y: FLOOR_Y - 100, 
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
            aggro: true, 
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
            state.current.hordeTimer = HORDE_INTERVAL; 
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
        
        player.vx = player.facingRight ? DASH_SPEED : -DASH_SPEED;
        player.vy = 0; 
        
        spawnParticles(player.x + player.w/2, player.y + player.h/2, '#06b6d4', 15);
        soundManager.playShoot(WeaponType.SHOTGUN); 
    }

    // B. Sliding Mechanic
    const downPressed = keys.current['arrowdown'];
    
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

    if (player.isDashing) {
        player.dashTimer--;
        player.vy = 0; 
        spawnParticles(player.x + (player.facingRight ? 0 : player.w), player.y + Math.random() * player.h, '#06b6d4', 1);

        if (player.dashTimer <= 0) {
            player.isDashing = false;
            player.vx *= 0.5; 
        }
    }

    // C. Acceleration & Input
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
        if (justPressedJump && player.isWallSliding && !player.isGrounded) {
             player.vy = WALL_JUMP_FORCE.y;
             player.vx = -player.wallDir * WALL_JUMP_FORCE.x; 
             player.isWallSliding = false;
             player.facingRight = player.wallDir < 0; 
             spawnParticles(player.wallDir === 1 ? player.x + player.w : player.x, player.y + player.h/2, '#ffffff', 8);
             soundManager.playJump();
        }
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

    const switchPressed = keys.current['c'];
    const prevSwitchPressed = prevKeys.current['c'];
    if (switchPressed && !prevSwitchPressed && player.weapons.length > 1 && !player.isReloading) {
        player.currentWeaponIndex = (player.currentWeaponIndex + 1) % player.weapons.length;
        soundManager.playCollect(); 
    }

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

    const reloadPressed = keys.current['r'];
    const prevReloadPressed = prevKeys.current['r'];
    if (reloadPressed && !prevReloadPressed && !player.isReloading && currentWeaponType !== WeaponType.PISTOL) {
        if (player.ammoClip[currentWeaponType] < weaponStats.clipSize && player.ammoReserve[currentWeaponType] > 0) {
            player.isReloading = true;
            player.reloadTimer = weaponStats.reloadDuration;
            soundManager.playReload();
        }
    }

    if (player.isReloading) {
        player.reloadTimer--;
        if (player.reloadTimer <= 0) {
            player.isReloading = false;
            const currentClip = player.ammoClip[currentWeaponType];
            const needed = weaponStats.clipSize - currentClip;
            const available = player.ammoReserve[currentWeaponType];
            const toTransfer = Math.min(needed, available);
            player.ammoClip[currentWeaponType] += toTransfer;
            player.ammoReserve[currentWeaponType] -= toTransfer;
        }
    }

    prevKeys.current = { ...keys.current };

    if (keys.current['x'] && player.attackCooldown === 0 && !player.isWallSliding && !player.isSliding && !player.isDashing && !player.isReloading) {
      
      const ammoCount = player.ammoClip[currentWeaponType];
      const hasAmmo = currentWeaponType === WeaponType.PISTOL || ammoCount > 0;

      if (hasAmmo) {
        player.isAttacking = true;
        player.attackCooldown = weaponStats.cooldown;
        
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

        soundManager.playShoot(currentWeaponType);
        if (!player.isGrounded) player.vx += player.facingRight ? -1 : 1; 

      } else {
          player.attackCooldown = 15; 
          soundManager.playDryFire();
          
          if (!player.isReloading && player.ammoReserve[currentWeaponType] > 0) {
             player.isReloading = true;
             player.reloadTimer = weaponStats.reloadDuration;
             soundManager.playReload();
          }
      }
    }

    // --- 4. Physics Application ---
    
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
        if (player.isDashing) {
             player.isDashing = false;
        }
        player.vx = 0;
        player.isSliding = false; 
      }
    }

    if (!player.isDashing) {
        player.vy += GRAVITY;
    }
    
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
          soundManager.playCollect(); 
          // IMPORTANT: Update score on victory
          onScoreUpdate(state.current.score);
          onStatusChange(GameStatus.VICTORY);
          return; 
        }

        if (player.vy > 0) {
          player.y = plat.y - player.h;
          player.isGrounded = true;
          player.vy = 0;
          player.jumpsRemaining = MAX_JUMPS;
          player.isWallSliding = false;
          
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

    if (player.y > FLOOR_Y + 400) {
        if (player.health > 1) {
            player.health -= 1;
            player.x = player.lastSafeX;
            player.y = player.lastSafeY - 50; 
            player.vx = 0;
            player.vy = 0;
            player.invincibleTimer = INVINCIBLE_FRAMES;
            soundManager.playDamage();
            spawnParticles(canvasRef.current?.width ? canvasRef.current.width/2 + state.current.camera.x : player.x, player.y, '#ff0000', 50);
        } else {
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
                    player.ammoReserve[item.weaponType] = Math.min(player.ammoReserve[item.weaponType] + wStats.pickupAmmo, wStats.maxAmmo);
                    state.current.score += 25;
                    collected = true;
                    soundManager.playCollect();
                } else {
                    player.ammoReserve[item.weaponType] = Math.min(player.ammoReserve[item.weaponType] + wStats.pickupAmmo, wStats.maxAmmo);
                    player.ammoClip[item.weaponType] = wStats.clipSize; 

                    if (player.weapons.length < MAX_WEAPONS) {
                        player.weapons.push(item.weaponType);
                        player.currentWeaponIndex = player.weapons.length - 1; 
                    } else {
                        player.weapons[player.currentWeaponIndex] = item.weaponType;
                        player.isReloading = false;
                        player.reloadTimer = 0;
                    }

                    collected = true;
                    spawnParticles(player.x + player.w/2, player.y, '#fbbf24', 15);
                    state.current.score += 50;
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

    // --- 8. AI & Combat ---
    state.current.zombies = zombies.filter(z => !z.isDead);
    state.current.zombies.forEach(zombie => {
      // Separation
      let sepVx = 0;
      state.current.zombies.forEach(other => {
           if (zombie === other) return;
           if (Math.abs(zombie.y - other.y) > 50) return;
           const dist = zombie.x - other.x;
           const minDist = (zombie.w + other.w) / 2 * 0.9;
           if (Math.abs(dist) < minDist) sepVx += (dist > 0 ? 1 : -1) * 0.3; 
      });

      const distToPlayer = Math.sqrt(Math.pow(player.x - zombie.x, 2) + Math.pow(player.y - zombie.y, 2));
      const stats = ZOMBIE_STATS[zombie.type];
      const canSeePlayer = distToPlayer < 400 && Math.abs(player.y - zombie.y) < 200;
      
      if (canSeePlayer) {
        zombie.aggro = true;
        zombie.searchTimer = 180; 
        zombie.lastKnownX = player.x;
        if (Math.random() < 0.005) soundManager.playZombieGroan();
      } else {
        if (zombie.aggro) {
            zombie.searchTimer--;
            if (zombie.searchTimer <= 0) zombie.aggro = false; 
        }
      }

      if (zombie.type === ZombieType.SCREAMER && zombie.aggro) {
          zombie.summonTimer--;
          if (zombie.summonTimer <= 0) {
             spawnZombieNear(zombie.x, zombie.y);
             zombie.summonTimer = 120;
             spawnParticles(zombie.x + zombie.w/2, zombie.y, '#ec4899', 5);
          }
          if (zombie.attackTimer > 0) {
              zombie.attackTimer--;
          } else {
              zombie.attackTimer = 600; 
              soundManager.playZombieScream();
              spawnParticles(zombie.x + zombie.w/2, zombie.y + zombie.h/2, '#ec4899', 20);
              state.current.zombies.forEach(other => {
                  if (other === zombie) return;
                  if (Math.sqrt(Math.pow(other.x - zombie.x, 2) + Math.pow(other.y - zombie.y, 2)) < 800) {
                      other.aggro = true;
                      other.searchTimer = 180;
                      other.lastKnownX = zombie.x;
                  }
              });
          }
      }

      let targetVx = 0;
      if (zombie.aggro) {
          const targetX = canSeePlayer ? player.x : zombie.lastKnownX;
          const dir = targetX > zombie.x ? 1 : -1;
          if (!canSeePlayer && Math.abs(targetX - zombie.x) < 10) {
              targetVx = 0;
          } else {
              targetVx = dir * stats.speed;
              zombie.facingRight = dir > 0;
          }
      } else {
          if (Math.abs(zombie.vx) < 0.1) zombie.vx = Math.random() > 0.5 ? 1 : -1;
          targetVx = zombie.vx > 0 ? stats.speed * 0.5 : -stats.speed * 0.5;
          if (zombie.x > zombie.patrolCenter + zombie.patrolRange) targetVx = -Math.abs(targetVx);
          if (zombie.x < zombie.patrolCenter - zombie.patrolRange) targetVx = Math.abs(targetVx);
          zombie.facingRight = targetVx > 0;
      }

      zombie.vx = targetVx + sepVx;

      // AI Sensing
      const lookAheadX = zombie.x + (zombie.facingRight ? zombie.w + 10 : -10);
      const lookAheadY = zombie.y + zombie.h + 2; 
      let groundAhead = false;
      let wallAhead = false;
      
      for (const plat of platforms) {
          if (lookAheadX >= plat.x && lookAheadX <= plat.x + plat.w && Math.abs(lookAheadY - plat.y) < 20) groundAhead = true;
          if (plat.type === 'obstacle' || plat.type === 'platform') {
               const checkRect = { x: lookAheadX, y: zombie.y + 10, w: 5, h: zombie.h - 20 };
               if (checkCollision(checkRect, plat)) wallAhead = true;
          }
      }

      if (zombie.isGrounded) {
          if (zombie.aggro) {
              let shouldJump = false;
              if (wallAhead && zombie.type !== ZombieType.TANK) shouldJump = true;
              if (!groundAhead && zombie.type !== ZombieType.TANK) {
                   shouldJump = true;
                   zombie.vx *= 1.5; 
              }
              if (canSeePlayer && player.y < zombie.y - 60 && Math.abs(player.x - zombie.x) < 150) shouldJump = true;
              if (zombie.type === ZombieType.JUMPER && player.y < zombie.y - 50) shouldJump = true;
              if (shouldJump) {
                  zombie.vy = -13; 
                  zombie.isGrounded = false;
              }
          } else {
              if (!groundAhead || wallAhead) {
                  zombie.vx *= -1; 
                  zombie.x += zombie.vx * 2;
              }
          }
      }

      zombie.vy += GRAVITY;
      zombie.x += zombie.vx;
      zombie.y += zombie.vy;

      let zombieGrounded = false;
      for (const plat of platforms) {
        if (checkCollision(zombie, plat)) {
          if (zombie.vy > 0) {
             zombie.y = plat.y - zombie.h;
             zombie.vy = 0;
             zombieGrounded = true;
          } else if (zombie.vx !== 0) {
             zombie.x -= zombie.vx; 
             zombie.vx = 0;
          }
        }
      }
      zombie.isGrounded = zombieGrounded;

      state.current.projectiles.forEach(p => {
          if (p.life > 0 && checkCollision(p, zombie)) {
              zombie.health -= p.damage;
              p.life = 0; 
              
              let knockback = p.vx > 0 ? 5 : -5;
              if (zombie.type === ZombieType.TANK) knockback *= 0.1;
              
              zombie.vx = knockback;
              zombie.vy = -2;
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
                  spawnParticles(zombie.x + zombie.w/2, zombie.y + zombie.h/2, '#ef4444', 15);
                  // Score is updated in state ref, but not synced to React to save performance
              }
          }
      });

      if (checkCollision(player, zombie) && !zombie.isDead) {
         if (player.isDashing) {
             if (zombie.type === ZombieType.TANK) {
                 player.isDashing = false;
                 player.vx = player.facingRight ? -10 : 10; 
                 player.vy = -5;
                 spawnParticles(player.x + player.w/2, player.y + player.h/2, '#ffffff', 10);
                 soundManager.playClang(); 
                 zombie.vx = player.facingRight ? 5 : -5;
             } else {
                 zombie.health -= 50; 
                 zombie.vx = player.facingRight ? 15 : -15;
                 zombie.vy = -5;
                 spawnParticles(zombie.x + zombie.w/2, zombie.y + zombie.h/2, '#ef4444', 15);
                 soundManager.playZombieHit();
                 if (zombie.health <= 0) {
                      zombie.isDead = true;
                      state.current.score += 100;
                      if (zombie.type === ZombieType.SCREAMER) state.current.score += 200;
                 }
             }
         } else {
             const playerCX = player.x + player.w/2;
             const zombieCX = zombie.x + zombie.w/2;
             const dx = playerCX - zombieCX;
             const combinedHalfWidths = (player.w / 2) + (zombie.w / 2);
             const overlapX = combinedHalfWidths - Math.abs(dx);
             
             if (overlapX > 0 && overlapX < 30) {
                 if (playerCX > zombieCX) player.x += overlapX; 
                 else player.x -= overlapX; 
                 player.vx = 0;
                 zombie.vx = 0; 
             }

             if (player.invincibleTimer === 0) {
                player.health -= 1;
                player.invincibleTimer = INVINCIBLE_FRAMES;
                player.vy = -8;
                player.vx = player.x < zombie.x ? -12 : 12; 
                spawnParticles(player.x + player.w/2, player.y + player.h/2, '#ef4444', 10);
                soundManager.playDamage();
             }
         }
      }
    });

    if (player.health <= 0) {
      state.current.status = GameStatus.GAME_OVER;
      // IMPORTANT: Update score on Game Over
      onScoreUpdate(state.current.score);
      onStatusChange(GameStatus.GAME_OVER);
    }

    state.current.particles.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.life -= 0.05;
    });
    state.current.particles = state.current.particles.filter(p => p.life > 0);

    const canvas = canvasRef.current;
    if (canvas) {
        // Updated Camera Logic for Scaled Context
        // We work with "logical coordinates" inside the state, but we need to center based on logical viewport
        const currentScale = scaleRef.current;
        const logicalWidth = canvas.width / currentScale;
        // const logicalHeight = canvas.height / currentScale; 

        const targetCamX = player.x - logicalWidth / 3; 
        state.current.camera.x += (targetCamX - state.current.camera.x) * 0.1;
        
        if (state.current.camera.x < 0) state.current.camera.x = 0;
        if (state.current.camera.x > WORLD_WIDTH - logicalWidth) state.current.camera.x = WORLD_WIDTH - logicalWidth;
        
        // Vertical Camera Lock (Keep floor at bottom)
        state.current.camera.y = 0; // We keep it at 0 because scaling handles the fit
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
    
    if (isDashing) {
        ctx.shadowBlur = 20;
        ctx.shadowColor = '#06b6d4';
        ctx.globalAlpha = 0.8;
    }

    if (isSliding) {
        const slideH = h / 2;
        const slideY = y + slideH;
        ctx.fillStyle = '#1f2937'; 
        ctx.fillRect(facingRight ? x : x + 20, slideY + 5, 20, 10);
        ctx.fillStyle = color; 
        ctx.fillRect(x + 5, slideY, 30, 20);
        ctx.fillStyle = '#fca5a5'; 
        ctx.fillRect(facingRight ? x + 25 : x + 5, slideY - 5, 15, 15);
        ctx.strokeStyle = '#fff';
        ctx.beginPath();
        ctx.moveTo(facingRight ? x - 10 : x + w + 10, slideY + 10);
        ctx.lineTo(facingRight ? x : x + w, slideY + 10);
        ctx.stroke();

    } else if (isWallSliding) {
        const wallX = player.wallDir === 1 ? x + w - 10 : x;
        ctx.fillStyle = color; 
        ctx.fillRect(x + 5, y + 10, 30, 30);
        ctx.fillStyle = '#1f2937'; 
        ctx.fillRect(x + 10, y + 40, 8, 15);
        ctx.fillRect(x + 22, y + 35, 8, 15);
        ctx.fillStyle = '#fca5a5'; 
        ctx.fillRect(x + 10, y - 5, 20, 20);
        ctx.fillStyle = '#fca5a5';
        ctx.fillRect(player.wallDir === 1 ? x + 25 : x + 5, y + 15, 10, 5);
        if (Math.random() > 0.7) {
            ctx.fillStyle = '#ccc';
            ctx.fillRect(player.wallDir === 1 ? x + w : x, y + h, 4, 4);
        }

    } else {
        ctx.fillStyle = '#1f2937'; 
        const walkCycle = Math.sin(Date.now() / 100) * (Math.abs(player.vx) > 0.1 ? 5 : 0);
        ctx.fillRect(x + 8 + walkCycle, y + h - 20, 10, 20); 
        ctx.fillRect(x + 22 - walkCycle, y + h - 20, 10, 20); 
        ctx.fillStyle = color;
        ctx.fillRect(x + 5, y + 20, 30, 25);
        ctx.fillStyle = '#fca5a5'; 
        ctx.fillRect(x + 10, y, 20, 20);
        ctx.fillStyle = '#5c3a21'; 
        ctx.fillRect(x + 8, y - 2, 24, 6);
        ctx.fillStyle = '#000';
        const eyeX = facingRight ? x + 24 : x + 12;
        ctx.fillRect(eyeX, y + 6, 4, 4);
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
    const floatY = Math.sin(Date.now() / 300) * 5;
    const cy = item.y + item.h / 2 + floatY;
    const cx = item.x + item.w / 2;

    if (item.type === 'weapon' && item.weaponType) {
        const gradient = ctx.createRadialGradient(cx, cy, 5, cx, cy, 25);
        gradient.addColorStop(0, 'rgba(59, 130, 246, 0.5)'); 
        gradient.addColorStop(1, 'rgba(59, 130, 246, 0)');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(cx, cy, 25, 0, Math.PI * 2);
        ctx.fill();
        drawWeapon(ctx, item.weaponType, cx, cy, true, 1.5);
    } else if (item.type === 'ammo' && item.weaponType) {
        ctx.fillStyle = '#10b981'; 
        ctx.fillRect(item.x, item.y + floatY, item.w, item.h);
        ctx.fillStyle = '#064e3b';
        ctx.font = 'bold 12px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('AMMO', cx, cy + 4);
        ctx.textAlign = 'left';
        ctx.strokeStyle = '#34d399';
        ctx.lineWidth = 1;
        ctx.strokeRect(item.x, item.y + floatY, item.w, item.h);
    } else if (item.type === 'medkit') {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(item.x, item.y + floatY, item.w, item.h);
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(cx - 4, item.y + floatY + 5, 8, item.h - 10);
        ctx.fillRect(item.x + 5, cy - 4, item.w - 10, 8);
        ctx.strokeStyle = '#d1d5db';
        ctx.lineWidth = 1;
        ctx.strokeRect(item.x, item.y + floatY, item.w, item.h);
    }
  };

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { player, platforms, zombies, particles, projectiles, collectibles, camera, hordeWarningTimer } = state.current;
    const currentScale = scaleRef.current;

    // --- FIX: DRAW BACKGROUND IN PHYSICAL PIXELS FIRST ---
    // Reset transform to identity to draw the global background color over the entire canvas
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#111827';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    
    // --- APPLY DYNAMIC SCALING ---
    // This zooms the game out if the screen is too short (mobile landscape)
    // so we can see the full vertical height of the level.
    ctx.scale(currentScale, currentScale);
    
    ctx.translate(-Math.floor(camera.x), -Math.floor(camera.y));

    ctx.fillStyle = '#1f2937';
    // Extended loop to cover the entire world width (40 -> 60)
    for(let i=0; i<60; i++) { 
        const x = (i * 300) - (camera.x * 0.2); 
        ctx.fillRect(x, 100, 100, 1500);
    }

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
        ctx.fillStyle = '#4b5563';
        ctx.fillRect(plat.x, plat.y, plat.w, 10);
      } else {
        ctx.fillStyle = '#4b5563';
        ctx.shadowBlur = 0;
        ctx.fillRect(plat.x, plat.y, plat.w, plat.h);
        ctx.fillStyle = '#6b7280';
        ctx.fillRect(plat.x, plat.y, plat.w, 5);
      }
    });

    collectibles.forEach(item => {
        if (!item.collected) {
            drawCollectible(ctx, item);
        }
    });

    zombies.forEach(z => {
      ctx.fillStyle = z.aggro ? '#ef4444' : z.color;
      if (z.type === ZombieType.TANK) {
         ctx.fillRect(z.x, z.y, z.w, z.h);
         ctx.strokeStyle = '#000';
         ctx.lineWidth = 2;
         ctx.strokeRect(z.x, z.y, z.w, z.h);
         ctx.fillStyle = '#581c87';
         ctx.fillRect(z.x + 5, z.y + 10, z.w - 10, 10);
      } else if (z.type === ZombieType.SCREAMER) {
         ctx.fillRect(z.x, z.y, z.w, z.h);
         if (z.aggro && z.attackTimer > 550) { 
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
      ctx.fillStyle = 'black';
      const eyeOffset = z.facingRight ? z.w - 10 : 2;
      ctx.fillRect(z.x + eyeOffset, z.y + 10, 8, 8);
      ctx.fillStyle = 'red';
      ctx.fillRect(z.x, z.y - 10, z.w, 4);
      ctx.fillStyle = 'lime';
      ctx.fillRect(z.x, z.y - 10, z.w * (z.health / z.maxHealth), 4);
    });

    projectiles.forEach(p => {
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x, p.y, p.w, p.h);
    });

    particles.forEach(p => {
      ctx.globalAlpha = p.life;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1.0;
    });

    if (player.invincibleTimer % 4 < 2) {
        drawPlayer(ctx, player);
    }
    
    if (player.isReloading) {
        ctx.fillStyle = '#fbbf24';
        ctx.font = 'bold 12px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('RELOADING...', player.x + player.w / 2, player.y - 20);
        const maxTime = WEAPONS[player.weapons[player.currentWeaponIndex]].reloadDuration;
        const progress = 1 - (player.reloadTimer / maxTime);
        ctx.fillStyle = '#374151';
        ctx.fillRect(player.x - 10, player.y - 15, player.w + 20, 4);
        ctx.fillStyle = '#fbbf24';
        ctx.fillRect(player.x - 10, player.y - 15, (player.w + 20) * progress, 4);
        ctx.textAlign = 'left';
    } else if (player.dashCooldown > 0) {
        const progress = 1 - (player.dashCooldown / DASH_COOLDOWN);
        ctx.fillStyle = '#164e63';
        ctx.fillRect(player.x - 10, player.y - 10, player.w + 20, 3);
        ctx.fillStyle = '#06b6d4';
        ctx.fillRect(player.x - 10, player.y - 10, (player.w + 20) * progress, 3);
    }

    ctx.restore();
    
    if (hordeWarningTimer > 0) {
        ctx.save();
        ctx.fillStyle = 'rgba(220, 38, 38, 0.2)'; 
        // We use logical dimensions here if we are inside scaled context, or full canvas if not
        // But since restore() was called, we are back to screen pixels.
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        if (Math.floor(Date.now() / 200) % 2 === 0) {
            ctx.fillStyle = '#ef4444'; 
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
      
      ctx.save();
      
      // Auto-scale HUD for small screens (less than 500px high)
      if (canvas.height < 500) {
          ctx.scale(0.6, 0.6);
      }

      ctx.fillStyle = 'rgba(17, 24, 39, 0.8)';
      ctx.fillRect(10, 10, 360, 110);
      ctx.strokeStyle = '#4b5563';
      ctx.lineWidth = 2;
      ctx.strokeRect(10, 10, 360, 110);
      
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

      ctx.fillStyle = '#9ca3af';
      ctx.fillText('WEAPONS', 25, 70);
      
      player.weapons.forEach((w, index) => {
          const isActive = index === player.currentWeaponIndex;
          const wx = 100 + (index * 70);
          
          ctx.fillStyle = isActive ? '#1e3a8a' : '#374151'; 
          ctx.fillRect(wx, 50, 60, 30);
          if (isActive) {
            ctx.strokeStyle = '#60a5fa';
            ctx.strokeRect(wx, 50, 60, 30);
          }

          drawWeapon(ctx, w, wx + 30, 65, true, 1.2);

          const clip = player.ammoClip[w];
          const reserve = player.ammoReserve[w];
          const isInfinite = w === WeaponType.PISTOL;
          const isEmpty = !isInfinite && clip === 0 && reserve === 0;
          const isClipEmpty = !isInfinite && clip === 0;
          
          ctx.font = 'bold 10px monospace';
          ctx.textAlign = 'right';
          
          if (isInfinite) {
             ctx.fillStyle = '#9ca3af'; 
             ctx.fillText('∞', wx + 55, 60);
          } else {
             if (isEmpty) {
                 const flash = Math.floor(Date.now() / 300) % 2 === 0;
                 ctx.fillStyle = flash ? '#ef4444' : '#7f1d1d'; 
             } else if (isClipEmpty) {
                 const flash = Math.floor(Date.now() / 300) % 2 === 0;
                 ctx.fillStyle = flash ? '#f59e0b' : '#d97706'; 
             } else {
                 ctx.fillStyle = isActive ? '#ffffff' : '#d1d5db';
             }
             ctx.fillText(`${clip}/${reserve}`, wx + 58, 75); 
          }
          ctx.textAlign = 'left';

          if (isActive) {
             ctx.fillStyle = '#ffffff';
             ctx.font = '10px monospace';
             ctx.textAlign = 'center';
             ctx.fillText(WEAPONS[w].name.substring(0, 3), wx + 30, 95);
             ctx.textAlign = 'left';
          }
      });

      ctx.fillStyle = '#9ca3af';
      ctx.fillText('ITEM', 250, 70);
      
      ctx.strokeStyle = '#374151';
      ctx.strokeRect(250, 50, 30, 30);
      
      if (player.medkits > 0) {
          ctx.fillStyle = '#ef4444'; 
          ctx.fillRect(258, 54, 14, 22); 
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(263, 56, 4, 18); 
          ctx.fillRect(260, 63, 10, 4); 
      }

      ctx.fillStyle = '#fbbf24';
      ctx.textAlign = 'right';
      ctx.font = 'bold 24px monospace';
      ctx.fillText(`${score}`, 350, 40);
      ctx.textAlign = 'left';
      
      ctx.restore(); // Restore scale

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

  const handleTouch = (key: string, pressed: boolean) => (e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault(); 
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
  
  const handleJoystickTouch = (e: React.TouchEvent) => {
    e.preventDefault();
    if (state.current.status !== GameStatus.PLAYING) return;
    
    // Multi-touch support: Find the touch that started on the joystick
    let touch = e.changedTouches[0];
    if (joystickTouchId.current !== null) {
        for (let i = 0; i < e.changedTouches.length; i++) {
            if (e.changedTouches[i].identifier === joystickTouchId.current) {
                touch = e.changedTouches[i];
                break;
            }
        }
    }
    
    const base = joystickBaseRef.current;
    if (!base || !touch) return;
    
    if (e.type === 'touchstart') {
        joystickTouchId.current = touch.identifier;
    }
    
    const rect = base.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    
    const touchX = touch.clientX - rect.left;
    const touchY = touch.clientY - rect.top;
    
    const dx = touchX - centerX;
    const dy = touchY - centerY;
    
    const distance = Math.sqrt(dx*dx + dy*dy);
    const maxRadius = rect.width / 2 - 20; // Keep it somewhat inside
    
    let clampedX = dx;
    let clampedY = dy;
    
    if (distance > maxRadius) {
        const ratio = maxRadius / distance;
        clampedX = dx * ratio;
        clampedY = dy * ratio;
    }
    
    if (joystickKnobRef.current) {
        joystickKnobRef.current.style.transform = `translate(${clampedX}px, ${clampedY}px)`;
    }
    
    // Lower threshold for better response
    keys.current['arrowleft'] = clampedX < -15;
    keys.current['arrowright'] = clampedX > 15;
    keys.current['arrowdown'] = clampedY > 30; 
  };
  
  const handleJoystickEnd = (e: React.TouchEvent) => {
     e.preventDefault();
     joystickTouchId.current = null;
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

      {/* Portrait Warning Overlay */}
      {isMobile && !isLandscape && (
         <div className="fixed inset-0 z-[60] bg-black flex flex-col items-center justify-center text-white p-6">
            <div className="text-6xl mb-6 animate-bounce">📱 ⟲</div>
            <h2 className="text-2xl font-bold text-center mb-2">Gira tu dispositivo</h2>
            <p className="text-gray-400 text-center">Este juego está optimizado para jugarse en horizontal.</p>
         </div>
      )}
      
      {/* Mobile Controls Overlay - Using fixed inset-0 to ensure it's always on top and visible */}
      {isMobile && isLandscape && gameStatus === GameStatus.PLAYING && (
          <div className="fixed inset-0 z-50 pointer-events-none select-none">
            
            {/* Top Right Utils */}
            <div className="absolute top-4 right-4 flex gap-3 pointer-events-auto">
                <button 
                  className="w-10 h-10 bg-gray-700/80 active:bg-gray-600 backdrop-blur-md rounded-full border-2 border-gray-400 flex items-center justify-center text-white text-[10px] font-bold shadow-lg"
                  onTouchStart={handleTouch('r', true)} onTouchEnd={handleTouch('r', false)}
                  style={{ touchAction: 'none' }}
                >
                    R
                </button>
                <button 
                  className="w-10 h-10 bg-gray-700/80 active:bg-gray-600 backdrop-blur-md rounded-full border-2 border-gray-400 flex items-center justify-center text-white text-[10px] font-bold shadow-lg"
                  onTouchStart={handleTouch('c', true)} onTouchEnd={handleTouch('c', false)}
                  style={{ touchAction: 'none' }}
                >
                    SWAP
                </button>
                <button 
                  className="w-10 h-10 bg-red-900/80 active:bg-red-800 backdrop-blur-md rounded-full border-2 border-red-400 flex items-center justify-center text-white text-lg font-bold shadow-lg"
                  onTouchStart={handleTouch('v', true)} onTouchEnd={handleTouch('v', false)}
                  style={{ touchAction: 'none' }}
                >
                    +
                </button>
                <button 
                   className="w-10 h-10 bg-yellow-600/80 active:bg-yellow-500 backdrop-blur-md rounded-full border-2 border-yellow-400 flex items-center justify-center text-white font-bold shadow-lg"
                   onTouchStart={handlePause}
                   style={{ touchAction: 'none' }}
                >
                    ||
                </button>
            </div>

            {/* Bottom Left: Enhanced Analog Joystick - Smaller */}
            <div 
                ref={joystickBaseRef}
                className="absolute bottom-6 left-6 w-36 h-36 bg-gray-800/60 rounded-full border-4 border-gray-400 flex items-center justify-center backdrop-blur-md pointer-events-auto shadow-2xl"
                onTouchStart={handleJoystickTouch}
                onTouchMove={handleJoystickTouch}
                onTouchEnd={handleJoystickEnd}
                onTouchCancel={handleJoystickEnd}
                style={{ touchAction: 'none' }}
            >
                {/* Visual indicator of center */}
                <div className="absolute w-2 h-2 bg-gray-400/50 rounded-full"></div>
                
                <div 
                    ref={joystickKnobRef}
                    className="w-14 h-14 bg-white rounded-full shadow-xl pointer-events-none border-4 border-gray-300"
                    style={{ transform: 'translate(0px, 0px)', transition: 'transform 0.05s linear' }}
                ></div>
            </div>

            {/* Bottom Right: Action Cluster (Ergonomic Arc) - Smaller */}
            <div className="absolute bottom-6 right-6 w-52 h-52 pointer-events-none">
                 {/* Shoot (Left) */}
                 <button 
                   className="absolute bottom-5 left-2 w-16 h-16 bg-red-600/80 rounded-full border-4 border-white active:bg-red-500 active:scale-95 transition-transform text-white font-bold text-[10px] flex items-center justify-center shadow-xl backdrop-blur-sm pointer-events-auto"
                   onTouchStart={handleTouch('x', true)} onTouchEnd={handleTouch('x', false)}
                   style={{ touchAction: 'none' }}
                >
                    FIRE
                </button>
                
                {/* Jump (Main - Bottom Right) */}
                <button 
                   className="absolute bottom-0 right-0 w-20 h-20 bg-blue-600/80 rounded-full border-4 border-white active:bg-blue-500 active:scale-95 transition-transform text-white font-bold text-xs flex items-center justify-center shadow-xl backdrop-blur-sm pointer-events-auto"
                   onTouchStart={handleTouch('z', true)} onTouchEnd={handleTouch('z', false)}
                   style={{ touchAction: 'none' }}
                >
                    JUMP
                </button>

                {/* Dash (Top) */}
                <button 
                   className="absolute top-8 right-10 w-14 h-14 bg-cyan-600/80 rounded-full border-4 border-white active:bg-cyan-500 active:scale-95 transition-transform text-white font-bold text-[10px] flex items-center justify-center shadow-xl backdrop-blur-sm pointer-events-auto"
                   onTouchStart={handleTouch(' ', true)} onTouchEnd={handleTouch(' ', false)}
                   style={{ touchAction: 'none' }}
                >
                    DASH
                </button>
            </div>
          </div>
      )}
    </div>
  );
};

export default GameCanvas;