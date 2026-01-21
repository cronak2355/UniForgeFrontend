import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';

interface Entity {
    x: number;
    y: number;
    width: number;
    height: number;
    vx: number;
    vy: number;
    health: number;
    maxHealth: number;
    // Animation props
    frameX: number;
    gameFrame: number;
    staggerFrames: number;
    isMoving: boolean;
    flip: boolean; // 좌우 반전용
}

interface Bullet {
    x: number;
    y: number;
    vx: number;
    vy: number;
    isPlayerBullet: boolean;
}

interface GameAssets {
    playerIdle: HTMLImageElement | null;
    playerWalk: HTMLImageElement | null;
    bossIdle: HTMLImageElement | null;
    bossWalk: HTMLImageElement | null;
    bulletImg: HTMLImageElement | null;
}

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;
const PLAYER_SPEED = 5;
const BULLET_SPEED = 8;
const BOSS_SPEED = 1.5;
const BOSS_SHOOT_INTERVAL = 4000;
const PLAYER_SHOOT_COOLDOWN = 300;

// 총알 스케일 상수
const BULLET_SCALE = 0.15;

const SimpleGame: React.FC = () => {
    const [searchParams] = useSearchParams();
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const gameLoopRef = useRef<number | null>(null);
    const keysRef = useRef<Set<string>>(new Set());
    const lastBossShootRef = useRef<number>(0);
    const lastPlayerShootRef = useRef<number>(0);

    const [gameState, setGameState] = useState<'playing' | 'win' | 'lose'>('playing');
    const [playerHealth, setPlayerHealth] = useState(100);
    const [bossHealth, setBossHealth] = useState(500);

    const playerRef = useRef<Entity>({
        x: 100,
        y: CANVAS_HEIGHT / 2,
        width: 120, // 스프라이트 크기에 맞춰 조정 (필요시 파라미터화)
        height: 120,
        vx: 0,
        vy: 0,
        health: 100,
        maxHealth: 100,
        frameX: 0,
        gameFrame: 0,
        staggerFrames: 5, // 애니메이션 속도 조절
        isMoving: false,
        flip: false,
    });

    const bossRef = useRef<Entity>({
        x: CANVAS_WIDTH - 200,
        y: CANVAS_HEIGHT / 2,
        width: 150,
        height: 150,
        vx: 0,
        vy: 0,
        health: 500,
        maxHealth: 500,
        frameX: 0,
        gameFrame: 0,
        staggerFrames: 8,
        isMoving: false,
        flip: true, // 보스는 왼쪽을 보게
    });

    const bulletsRef = useRef<Bullet[]>([]);

    const assetsRef = useRef<GameAssets>({
        playerIdle: null,
        playerWalk: null,
        bossIdle: null,
        bossWalk: null,
        bulletImg: null,
    });

    // URL 파싱 및 에셋 로드
    useEffect(() => {
        const loadImage = (url: string): Promise<HTMLImageElement> => {
            return new Promise((resolve, reject) => {
                const img = new Image();
                img.crossOrigin = 'anonymous';
                img.onload = () => resolve(img);
                img.onerror = reject;
                img.src = url;
            });
        };

        const loadAssets = async () => {
            const pIdle = searchParams.get('playerIdle') || searchParams.get('player'); // fallback
            const pWalk = searchParams.get('playerWalk');
            const bIdle = searchParams.get('bossIdle') || searchParams.get('boss'); // fallback
            const bWalk = searchParams.get('bossWalk');
            const bullet = searchParams.get('bullet');

            try {
                if (pIdle) assetsRef.current.playerIdle = await loadImage(pIdle);
                if (pWalk) assetsRef.current.playerWalk = await loadImage(pWalk);
                if (bIdle) assetsRef.current.bossIdle = await loadImage(bIdle);
                if (bWalk) assetsRef.current.bossWalk = await loadImage(bWalk);
                if (bullet) assetsRef.current.bulletImg = await loadImage(bullet);
            } catch (e) {
                console.warn('Failed to load assets', e);
            }
        };
        loadAssets();
    }, [searchParams]);

    // 게임 데이터 초기화
    const initGame = useCallback(() => {
        // ... (초기화 로직은 그대로, 다만 Entity 속성 재설정 필요)
        playerRef.current.health = 100;
        playerRef.current.x = 100;
        playerRef.current.y = CANVAS_HEIGHT / 2;
        bossRef.current.health = 500;
        bossRef.current.x = CANVAS_WIDTH - 200;
        bulletsRef.current = [];
        setPlayerHealth(100);
        setBossHealth(500);
        setGameState('playing');
    }, []);

    const update = useCallback(() => {
        if (gameState !== 'playing') return;
        const player = playerRef.current;
        const boss = bossRef.current;
        const now = Date.now();

        // --- 플레이어 이동 ---
        player.vx = 0;
        player.vy = 0;
        if (keysRef.current.has('w') || keysRef.current.has('W')) player.vy = -PLAYER_SPEED;
        if (keysRef.current.has('s') || keysRef.current.has('S')) player.vy = PLAYER_SPEED;
        if (keysRef.current.has('a') || keysRef.current.has('A')) {
            player.vx = -PLAYER_SPEED;
            player.flip = true;
        }
        if (keysRef.current.has('d') || keysRef.current.has('D')) {
            player.vx = PLAYER_SPEED;
            player.flip = false;
        }

        player.isMoving = (player.vx !== 0 || player.vy !== 0);

        // 애니메이션 프레임 업데이트
        if (player.isMoving) {
            player.gameFrame++;
            if (player.gameFrame % player.staggerFrames === 0) {
                // 걷기 이미지가 있으면 프레임 증가, 없으면 0
                const maxFrames = assetsRef.current.playerWalk ? 4 : 1; // 4프레임 가정
                player.frameX = (player.frameX + 1) % maxFrames;
            }
        } else {
            player.frameX = 0; // 정지 상태
        }

        player.x = Math.max(0, Math.min(CANVAS_WIDTH - player.width, player.x + player.vx));
        player.y = Math.max(0, Math.min(CANVAS_HEIGHT - player.height, player.y + player.vy));

        // --- 보스 AI ---
        const dx = player.x - boss.x;
        const dy = player.y - boss.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist > 100) {
            boss.x += (dx / dist) * BOSS_SPEED;
            boss.y += (dy / dist) * BOSS_SPEED;
            boss.isMoving = true;
            boss.flip = dx < 0; // 플레이어 방향 바라보기
        } else {
            boss.isMoving = false;
        }

        // 보스 애니메이션
        boss.gameFrame++;
        if (boss.gameFrame % boss.staggerFrames === 0) {
            const maxFrames = assetsRef.current.bossWalk ? 4 : 1;
            if (boss.isMoving) {
                boss.frameX = (boss.frameX + 1) % maxFrames;
            } else {
                boss.frameX = 0;
            }
        }

        // --- 발사 및 충돌 (기존 로직 유지) ---
        // Spacebar Shoot
        if (keysRef.current.has(' ') && now - lastPlayerShootRef.current > PLAYER_SHOOT_COOLDOWN) {
            bulletsRef.current.push({
                x: player.x + player.width / 2,
                y: player.y + player.height / 2,
                vx: player.flip ? -BULLET_SPEED : BULLET_SPEED, // 보는 방향으로 발사
                vy: 0,
                isPlayerBullet: true,
            });
            lastPlayerShootRef.current = now;
        }

        // Boss Shoot
        if (now - lastBossShootRef.current > BOSS_SHOOT_INTERVAL) {
            const directions = [
                { vx: BULLET_SPEED, vy: 0 }, { vx: -BULLET_SPEED, vy: 0 },
                { vx: 0, vy: BULLET_SPEED }, { vx: 0, vy: -BULLET_SPEED },
                { vx: BULLET_SPEED * 0.7, vy: BULLET_SPEED * 0.7 }, { vx: -BULLET_SPEED * 0.7, vy: BULLET_SPEED * 0.7 },
                { vx: BULLET_SPEED * 0.7, vy: -BULLET_SPEED * 0.7 }, { vx: -BULLET_SPEED * 0.7, vy: -BULLET_SPEED * 0.7 },
            ];
            for (const dir of directions) {
                bulletsRef.current.push({
                    x: boss.x + boss.width / 2,
                    y: boss.y + boss.height / 2,
                    vx: dir.vx,
                    vy: dir.vy,
                    isPlayerBullet: false,
                });
            }
            lastBossShootRef.current = now;
        }

        // Update Bullets
        bulletsRef.current = bulletsRef.current.filter(bullet => {
            bullet.x += bullet.vx;
            bullet.y += bullet.vy;
            if (bullet.x < -50 || bullet.x > CANVAS_WIDTH + 50 || bullet.y < -50 || bullet.y > CANVAS_HEIGHT + 50) return false;

            const bulletHitBox = { x: bullet.x, y: bullet.y, width: 20, height: 20 }; // 대략적인 히트박스

            // Collision Logic
            if (bullet.isPlayerBullet) {
                if (checkBoundingBox(bulletHitBox, bossRef.current)) {
                    bossRef.current.health -= 20;
                    setBossHealth(bossRef.current.health);
                    if (bossRef.current.health <= 0) setGameState('win');
                    return false;
                }
            } else {
                if (checkBoundingBox(bulletHitBox, playerRef.current)) {
                    playerRef.current.health -= 15;
                    setPlayerHealth(playerRef.current.health);
                    if (playerRef.current.health <= 0) setGameState('lose');
                    return false;
                }
            }
            return true;
        });

    }, [gameState]);

    const checkBoundingBox = (rect1: any, rect2: any) => {
        // 간단한 AABB 충돌 (이미지 중앙 기준 보정은 생략하고 단순 박스 충돌)
        const r1x = rect1.x; const r1y = rect1.y; const r1w = rect1.width; const r1h = rect1.height;
        // rect2(캐릭터)는 히트박스를 약간 작게 잡음
        const padding = 20;
        const r2x = rect2.x + padding; const r2y = rect2.y + padding;
        const r2w = rect2.width - padding * 2; const r2h = rect2.height - padding * 2;

        return (r1x < r2x + r2w && r1x + r1w > r2x && r1y < r2y + r2h && r1y + r1h > r2y);
    };

    const render = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

        // 배경
        ctx.fillStyle = '#1a1a2e';
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

        const drawEntity = (entity: Entity, idleImg: HTMLImageElement | null, walkImg: HTMLImageElement | null) => {
            const img = (entity.isMoving && walkImg) ? walkImg : idleImg;

            ctx.save();
            ctx.translate(entity.x + entity.width / 2, entity.y + entity.height / 2); // 중심점 이동
            if (entity.flip) ctx.scale(-1, 1); // 좌우 반전

            if (img) {
                // 스프라이트 그리기 (4프레임 가정)
                // 만약 idle이면 전체 그림, walk면 스프라이트 시트 처리
                // 여기서는 walkImg가 있으면 무조건 스프라이트 시트로 간주 (1행 4열 등)
                // 간단하게 처리: Walk 이미지가 있으면 4등분해서 그림

                if (entity.isMoving && walkImg) {
                    const spriteWidth = img.width / 4; // 4프레임 가정
                    const spriteHeight = img.height;
                    ctx.drawImage(img,
                        entity.frameX * spriteWidth, 0, spriteWidth, spriteHeight,
                        -entity.width / 2, -entity.height / 2, entity.width, entity.height
                    );
                } else {
                    // Idle (한장짜리 혹은 시트) - 여기선 한장짜리로 가정
                    ctx.drawImage(img, -entity.width / 2, -entity.height / 2, entity.width, entity.height);
                }
            } else {
                // 대체 박스
                ctx.fillStyle = entity === playerRef.current ? '#4a90d9' : '#ef4444';
                ctx.fillRect(-entity.width / 2, -entity.height / 2, entity.width, entity.height);
            }
            ctx.restore();

            // HP Bar
            ctx.fillStyle = '#333';
            ctx.fillRect(entity.x, entity.y - 10, entity.width, 5);
            ctx.fillStyle = entity === playerRef.current ? '#4ade80' : '#f87171';
            ctx.fillRect(entity.x, entity.y - 10, entity.width * (entity.health / entity.maxHealth), 5);
        };

        drawEntity(playerRef.current, assetsRef.current.playerIdle, assetsRef.current.playerWalk);
        drawEntity(bossRef.current, assetsRef.current.bossIdle, assetsRef.current.bossWalk);

        // 총알 그리기
        const bulletImg = assetsRef.current.bulletImg;
        for (const b of bulletsRef.current) {
            if (bulletImg) {
                const w = bulletImg.width * BULLET_SCALE;
                const h = bulletImg.height * BULLET_SCALE;
                ctx.drawImage(bulletImg, b.x - w / 2, b.y - h / 2, w, h);
            } else {
                ctx.fillStyle = b.isPlayerBullet ? '#60a5fa' : '#f97316';
                ctx.beginPath();
                ctx.arc(b.x, b.y, 8, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        // UI Text
        ctx.fillStyle = '#fff';
        ctx.font = '20px Arial';
        ctx.fillText(`Player HP: ${Math.max(0, playerRef.current.health)}`, 20, 30);
        ctx.fillText(`Boss HP: ${Math.max(0, bossRef.current.health)}`, CANVAS_WIDTH - 200, 30);

        if (gameState !== 'playing') {
            ctx.fillStyle = 'rgba(0,0,0,0.7)';
            ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
            ctx.fillStyle = gameState === 'win' ? '#4ade80' : '#ef4444';
            ctx.font = '50px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(gameState === 'win' ? "VICTORY!" : "GAME OVER", CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
            ctx.fillStyle = '#fff';
            ctx.font = '20px Arial';
            ctx.fillText("Press R to Restart", CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 50);
            ctx.textAlign = 'left';
        }

    }, [gameState]);

    // ... (useEffect Loop는 기존과 동일하거나 유사)

    // 게임 루프
    useEffect(() => {
        const gameLoop = () => {
            update();
            render();
            gameLoopRef.current = requestAnimationFrame(gameLoop);
        };

        gameLoopRef.current = requestAnimationFrame(gameLoop);

        return () => {
            if (gameLoopRef.current) {
                cancelAnimationFrame(gameLoopRef.current);
            }
        };
    }, [update, render]);

    // 키 입력 처리
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            keysRef.current.add(e.key);

            // R키로 재시작
            if ((e.key === 'r' || e.key === 'R') && gameState !== 'playing') {
                initGame();
            }
        };

        const handleKeyUp = (e: KeyboardEvent) => {
            keysRef.current.delete(e.key);
        };

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
        };
    }, [gameState, initGame]);

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            width: '100vw',
            height: '100vh',
            backgroundColor: '#1e1e1e', // 에디터 배경색
            color: '#e0e0e0',
            fontFamily: 'Inter, system-ui, sans-serif',
            overflow: 'hidden',
        }}>
            {/* 상단 헤더 (에디터 실행 바 느낌) */}
            <div style={{
                height: '50px',
                backgroundColor: '#252526',
                borderBottom: '1px solid #3e3e42',
                display: 'flex',
                alignItems: 'center',
                padding: '0 20px',
                justifyContent: 'space-between',
                boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                zIndex: 10
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{
                        width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#ff5f57'
                    }} />
                    <div style={{
                        width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#febc2e'
                    }} />
                    <div style={{
                        width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#28c840'
                    }} />
                    <span style={{ marginLeft: '15px', fontWeight: 600, fontSize: '14px', color: '#ccc' }}>
                        🧙 Wizard vs Boss (Play Mode)
                    </span>
                </div>

                <div style={{
                    backgroundColor: '#333',
                    padding: '5px 15px',
                    borderRadius: '4px',
                    fontSize: '12px',
                    color: '#4ade80',
                    border: '1px solid #4ade80'
                }}>
                    ● Running
                </div>
            </div>

            {/* 메인 게임 영역 */}
            <div style={{
                flex: 1,
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                backgroundColor: '#1e1e1e',
                position: 'relative',
                backgroundImage: 'radial-gradient(#2d2d2d 1px, transparent 1px)', // 그리드 효과
                backgroundSize: '20px 20px'
            }}>
                <canvas
                    ref={canvasRef}
                    width={CANVAS_WIDTH}
                    height={CANVAS_HEIGHT}
                    style={{
                        backgroundColor: '#1a1a2e', // 게임 내부 배경
                        boxShadow: '0 0 50px rgba(0, 0, 0, 0.5)',
                        borderRadius: '4px',
                        cursor: 'crosshair',
                        border: '1px solid #444'
                    }}
                />

                {/* 조작 설명 오버레이 (하단) */}
                <div style={{
                    position: 'absolute',
                    bottom: '20px',
                    backgroundColor: 'rgba(0, 0, 0, 0.6)',
                    padding: '8px 16px',
                    borderRadius: '20px',
                    fontSize: '12px',
                    color: '#888',
                    backdropFilter: 'blur(4px)',
                    border: '1px solid rgba(255,255,255,0.1)'
                }}>
                    WASD: Move  •  SPACE: Shoot  •  R: Restart
                </div>
            </div>
        </div>
    );
};

export default SimpleGame;
