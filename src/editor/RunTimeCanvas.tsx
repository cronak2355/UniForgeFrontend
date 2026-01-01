/* eslint-disable react-hooks/set-state-in-effect */
import { useEffect, useRef } from "react";
import Phaser from "phaser";
import { useEditorCoreSnapshot } from "../contexts/EditorCoreContext";
import RunTimeScene from "./RunTimeScene";

export function RunTimeCanvas() {
    const ref = useRef<HTMLDivElement>(null);
    const sceneRef = useRef<RunTimeScene | null>(null);
    const gameRef = useRef<Phaser.Game | null>(null);
    const { core, assets, tiles } = useEditorCoreSnapshot();

    useEffect(() => {
        if (!ref.current) return;
        if (gameRef.current) return;

        const scene = new RunTimeScene();
        sceneRef.current = scene;
        scene.editorCore = core;

        const config: Phaser.Types.Core.GameConfig = {
            type: Phaser.AUTO,
            scale: { mode: Phaser.Scale.RESIZE },
            parent: ref.current,
            scene: [scene],
            audio: {
                noAudio: true
            }
        };

        const game = new Phaser.Game(config);
        gameRef.current = game;

        scene.events.once(Phaser.Scenes.Events.CREATE, async () => {
            await scene.buildTilesetTexture();
            scene.buildWorldFromCore();
        });

        return () => {
            game.destroy(true);
        };
    }, []);

    useEffect(() => {
        const scene = sceneRef.current;
        if (!scene) return;
        scene.applyTiles(tiles);
    }, [tiles]);

    // Entry Style Colors
    const colors = {
        bgPrimary: '#0d1117',
        bgSecondary: '#161b22',
        bgTertiary: '#21262d',
        borderColor: '#30363d',
        borderAccent: '#1f6feb',
        accentLight: '#58a6ff',
        textPrimary: '#f0f6fc',
        textSecondary: '#8b949e',
    };

    return (
        <div style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            padding: '12px',
            overflow: 'hidden',
        }}>
            {/* Toolbar */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginBottom: '12px',
                padding: '8px 12px',
                background: colors.bgSecondary,
                border: `2px solid ${colors.borderColor}`,
                borderRadius: '6px',
            }}>
                <span style={{
                    fontSize: '12px',
                    color: colors.textSecondary,
                    padding: '4px 8px',
                }}>
                    InGame Camera
                </span>

                
            </div>

            {/* Phaser Canvas Container */}
            <div
                ref={ref}
                style={{
                    flex: 1,
                    background: colors.bgPrimary,
                    border: `2px solid ${colors.borderColor}`,
                    borderRadius: '6px',
                    overflow: 'hidden',
                }}
            />
        </div>
    );
}

