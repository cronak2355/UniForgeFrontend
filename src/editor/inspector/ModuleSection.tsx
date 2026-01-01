import { memo } from "react";
import type {
    EditorModule,
    ModuleType,
    StatusModuleData,
    KineticModuleData,
    CombatModuleData,
} from "../types/Module";
import { ModuleDefaults } from "../types/Module";
import { colors } from "../constants/colors";

type Props = {
    modules: EditorModule[];
    onAdd: (mod: EditorModule) => void;
    onUpdate: (mod: EditorModule) => void;
    onRemove: (id: string) => void;
};

export const ModuleSection = memo(function ModuleSection({ modules, onAdd, onUpdate, onRemove }: Props) {
    const handleAdd = (type: ModuleType) => {
        const def = ModuleDefaults[type];
        onAdd({ ...def, id: crypto.randomUUID() } as EditorModule);
    };

    return (
        <div style={{ padding: "12px 0", borderTop: `1px solid ${colors.borderColor}` }}>
            <div style={{
                display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px"
            }}>
                <div style={{
                    fontSize: '11px', fontWeight: 600, color: colors.accentLight,
                    textTransform: 'uppercase', letterSpacing: '0.5px'
                }}>
                    Modules
                </div>
                <select
                    style={{
                        background: colors.bgTertiary, color: colors.textPrimary,
                        border: `1px solid ${colors.borderColor}`,
                        borderRadius: "4px", fontSize: "11px", padding: "2px 4px", outline: "none"
                    }}
                    value=""
                    onChange={(e) => {
                        if (e.target.value) handleAdd(e.target.value as ModuleType);
                    }}
                >
                    <option value="">+ Add</option>
                    <option value="Status">Status (HP/MP)</option>
                    <option value="Kinetic">Kinetic (이동)</option>
                    <option value="Narrative">Narrative (대사)</option>
                    <option value="Combat">Combat (전투)</option>
                </select>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {modules.map((mod) => (
                    <ModuleItem
                        key={mod.id}
                        module={mod}
                        onUpdate={onUpdate}
                        onRemove={onRemove}
                    />
                ))}
            </div>
        </div>
    );
});

const ModuleItem = memo(function ModuleItem({
    module, onUpdate, onRemove
}: {
    module: EditorModule;
    onUpdate: (m: EditorModule) => void;
    onRemove: (id: string) => void;
}) {
    const typeLabels: Record<ModuleType, string> = {
        Status: "📊 Status",
        Kinetic: "🏃 Kinetic",
        Narrative: "💬 Narrative",
        Combat: "⚔️ Combat",
    };

    return (
        <div style={{
            background: "rgba(255,255,255,0.03)",
            border: `1px solid ${colors.borderColor}`,
            borderRadius: "6px",
            padding: "8px"
        }}>
            <div style={{
                display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px"
            }}>
                <span style={{ fontSize: "12px", fontWeight: 600, color: colors.textPrimary }}>
                    {typeLabels[module.type]}
                </span>
                <button
                    onClick={() => onRemove(module.id)}
                    style={{
                        background: "transparent", border: "none", color: "#da3633",
                        cursor: "pointer", fontSize: "10px"
                    }}
                >
                    Remove
                </button>
            </div>

            {module.type === "Status" && (
                <StatusEditor module={module as StatusModuleData} onUpdate={onUpdate} />
            )}

            {module.type === "Kinetic" && (
                <KineticEditor module={module as KineticModuleData} onUpdate={onUpdate} />
            )}

            {module.type === "Combat" && (
                <CombatEditor module={module as CombatModuleData} onUpdate={onUpdate} />
            )}

            {module.type === "Narrative" && (
                <div style={{ fontSize: "11px", color: colors.textSecondary }}>
                    대사 편집은 별도 에디터에서 가능합니다
                </div>
            )}
        </div>
    );
});

// ===== 모듈별 에디터 =====

function StatusEditor({ module, onUpdate }: { module: StatusModuleData, onUpdate: (m: EditorModule) => void }) {
    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            <div style={{ display: "flex", gap: "8px" }}>
                <NumberField label="HP" value={module.hp} onChange={(v) => onUpdate({ ...module, hp: v })} />
                <NumberField label="Max" value={module.maxHp} onChange={(v) => onUpdate({ ...module, maxHp: v })} />
            </div>
            <div style={{ display: "flex", gap: "8px" }}>
                <NumberField label="MP" value={module.mp} onChange={(v) => onUpdate({ ...module, mp: v })} />
                <NumberField label="Max" value={module.maxMp} onChange={(v) => onUpdate({ ...module, maxMp: v })} />
            </div>
            <div style={{ display: "flex", gap: "8px" }}>
                <NumberField label="ATK" value={module.attack} onChange={(v) => onUpdate({ ...module, attack: v })} />
                <NumberField label="DEF" value={module.defense} onChange={(v) => onUpdate({ ...module, defense: v })} />
            </div>
            <NumberField label="Speed" value={module.speed} onChange={(v) => onUpdate({ ...module, speed: v })} />
        </div>
    );
}

function KineticEditor({ module, onUpdate }: { module: KineticModuleData, onUpdate: (m: EditorModule) => void }) {
    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontSize: "11px", color: colors.textSecondary }}>Mode</span>
                <select
                    value={module.mode}
                    onChange={(e) => onUpdate({ ...module, mode: e.target.value as any })}
                    style={{
                        background: colors.bgTertiary, color: colors.textPrimary,
                        border: `1px solid ${colors.borderColor}`,
                        borderRadius: "4px", fontSize: "11px", padding: "2px 4px"
                    }}
                >
                    <option value="TopDown">TopDown</option>
                    <option value="Platformer">Platformer</option>
                    <option value="Path">Path</option>
                </select>
            </div>
            <NumberField label="MaxSpeed" value={module.maxSpeed} onChange={(v) => onUpdate({ ...module, maxSpeed: v })} />
            <NumberField label="Friction" value={module.friction} onChange={(v) => onUpdate({ ...module, friction: v })} />
            {module.mode === "Platformer" && (
                <>
                    <NumberField label="Gravity" value={module.gravity} onChange={(v) => onUpdate({ ...module, gravity: v })} />
                    <NumberField label="JumpForce" value={module.jumpForce} onChange={(v) => onUpdate({ ...module, jumpForce: v })} />
                </>
            )}
        </div>
    );
}

function CombatEditor({ module, onUpdate }: { module: CombatModuleData, onUpdate: (m: EditorModule) => void }) {
    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            <NumberField label="Range" value={module.attackRange} onChange={(v) => onUpdate({ ...module, attackRange: v })} />
            <NumberField label="Interval" value={module.attackInterval} onChange={(v) => onUpdate({ ...module, attackInterval: v })} />
            <NumberField label="Damage" value={module.damage} onChange={(v) => onUpdate({ ...module, damage: v })} />
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontSize: "11px", color: colors.textSecondary }}>Pattern</span>
                <select
                    value={module.bulletPattern}
                    onChange={(e) => onUpdate({ ...module, bulletPattern: e.target.value as any })}
                    style={{
                        background: colors.bgTertiary, color: colors.textPrimary,
                        border: `1px solid ${colors.borderColor}`,
                        borderRadius: "4px", fontSize: "11px", padding: "2px 4px"
                    }}
                >
                    <option value="Single">Single</option>
                    <option value="Spread">Spread</option>
                    <option value="Circle">Circle</option>
                    <option value="Spiral">Spiral</option>
                    <option value="Aimed">Aimed</option>
                </select>
            </div>
            {(module.bulletPattern === "Spread" || module.bulletPattern === "Circle") && (
                <NumberField label="BulletCount" value={module.bulletCount} onChange={(v) => onUpdate({ ...module, bulletCount: v })} />
            )}
        </div>
    );
}

// ===== 공통 필드 컴포넌트 =====

function NumberField({ label, value, onChange }: { label: string, value: number, onChange: (v: number) => void }) {
    return (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flex: 1 }}>
            <span style={{ fontSize: "11px", color: colors.textSecondary }}>{label}</span>
            <input
                type="number"
                value={value}
                step={label === "Friction" ? 0.1 : 1}
                onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
                style={{
                    width: "50px",
                    background: colors.bgPrimary,
                    border: `1px solid ${colors.borderColor}`,
                    color: colors.textPrimary,
                    borderRadius: "4px",
                    fontSize: "11px",
                    padding: "2px 4px"
                }}
            />
        </div>
    );
}
