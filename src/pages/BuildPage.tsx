import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { UnitySceneExporter } from "../editor/core/UnitySceneExport";
import type { EditorEntity } from "../editor/types/Entity";
import { SceneSerializer } from "../editor/core/SceneSerializer";
import { EditorState } from "../editor/EditorCore";
import { createEntitySnapshot } from "../editor/core/EditorEntitySnapshot";

type BuildMode = "unity" | "library";

function BuildTargetItem({
    label,
    active,
    onClick,
}: {
    label: string;
    active: boolean;
    onClick: () => void;
}) {
    return (
        <div
            onClick={onClick}
            style={{
                padding: "8px 10px",
                borderRadius: 4,
                cursor: "pointer",
                marginBottom: 4,
                background: active ? "#2a2a2a" : "transparent",
                color: active ? "#fff" : "#aaa",
            }}
        >
            {label}
        </div>
    );
}

interface TagInputProps {
    tags: string[];
    onChange: (tags: string[]) => void;
}

// editorCore 싱글톤 사용 (import에서 가져옴)


export function TagInput({ tags, onChange }: TagInputProps) {
    const [input, setInput] = useState("");

    const addTag = () => {
        const value = input.trim();
        if (!value) return;
        if (tags.includes(value)) return;

        onChange([...tags, value]);
        setInput("");
    };

    return (
        <div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                <input
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && addTag()}
                    placeholder="# 태그 입력"
                    style={{
                        flex: 1,
                        background: 'transparent',
                        border: '2px solid rgba(255,255,255,0.4)',
                        padding: '8px 12px',
                        color: '#fff',
                    }}
                />
                <button
                    onClick={addTag}
                    style={{
                        padding: '8px 16px',
                        background: '#3b82f6',
                        border: 'none',
                        color: '#fff',
                        cursor: 'pointer',
                    }}
                >
                    추가
                </button>
            </div>

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {tags.map(tag => (
                    <div
                        key={tag}
                        style={{
                            background: '#666',
                            padding: '6px 10px',
                            borderRadius: 12,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                        }}
                    >
                        #{tag}
                        <span
                            style={{ cursor: 'pointer' }}
                            onClick={() => onChange(tags.filter(t => t !== tag))}
                        >
                            ✕
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
}



//스타일
const styles: { [key: string]: React.CSSProperties } = {
    page: {
        minHeight: "100vh",
        background: "radial-gradient(circle at top, #060b3a, #020316)",
        color: "#fff",
    },

    header: {
        height: 64,
        display: "flex",
        alignItems: "center",
        padding: "0 32px",
        borderBottom: "1px solid rgba(255,255,255,0.2)",
        gap: 24,
    },

    logo: {
        fontSize: 28,
        fontWeight: 800,
        color: "#9fe7ff",
    },

    nav: {
        color: "#aaa",
        fontSize: 14,
    },

    content: {
        display: "flex",
        padding: "48px 64px",
        gap: 48,
    },

    left: {
        width: 420,
    },

    right: {
        flex: 1,
        display: "flex",
        flexDirection: "column",
        gap: 16,
    },

    thumbnailBox: {
        height: 240,
        border: "3px solid rgba(255,255,255,0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 24,
    },

    thumbnailButton: {
        padding: "16px 24px",
        border: "2px solid #fff",
        borderRadius: 12,
        cursor: "pointer",
    },

    titleInput: {
        height: 48,
        background: "transparent",
        border: "2px solid rgba(255,255,255,0.4)",
        padding: "0 16px",
        color: "#fff",
        fontSize: 16,
    },

    descInput: {
        height: 200,
        background: "transparent",
        border: "2px solid rgba(255,255,255,0.4)",
        padding: 16,
        color: "#fff",
        fontSize: 14,
        resize: "none",
    },

    tag: {
        display: "inline-block",
        background: "#777",
        padding: "8px 16px",
        borderRadius: 12,
        width: "fit-content",
    },

    buildButton: {
        marginTop: "auto",
        alignSelf: "flex-end",
        padding: "20px 48px",
        background: "#a8e8f6",
        color: "#000",
        fontSize: 20,
        fontWeight: 700,
        border: "none",
        cursor: "pointer",
    },
};

function ToggleSwitch({ //스위치
    label,
    value,
    onChange,
}: {
    label: string;
    value: boolean;
    onChange: (v: boolean) => void;
}) {
    return (
        <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '12px 16px',
            background: 'linear-gradient(90deg, #0a1a7a, #05083f)',
            marginBottom: 12,
            borderRadius: 8,
        }}>
            <span>{label}</span>

            <div
                onClick={() => onChange(!value)}
                style={{
                    width: 46,
                    height: 24,
                    borderRadius: 12,
                    background: value ? '#3b82f6' : '#555',
                    position: 'relative',
                    cursor: 'pointer',
                    transition: 'background 0.2s',
                }}
            >
                <div style={{
                    width: 20,
                    height: 20,
                    borderRadius: '50%',
                    background: '#fff',
                    position: 'absolute',
                    top: 2,
                    left: value ? 24 : 2,
                    transition: 'left 0.2s',
                }} />
            </div>
        </div>
    );
}

function Select({ label, value }: { label: string; value: string }) {
    return (
        <div style={{
            display: "flex",
            justifyContent: "space-between",
            padding: "12px 16px",
            background: "linear-gradient(90deg, #0a1a7a, #05083f)",
            marginBottom: 12,
        }}>
            <span>{label}</span>
            <span>{value}</span>
        </div>
    );
}


function Option({ label }: { label: string }) {
    return (
        <label style={{
            display: "block",
            marginBottom: 8,
            fontSize: 13,
        }}>
            <input type="checkbox" defaultChecked style={{ marginRight: 8 }} />
            {label}
        </label>
    );
}

export default function BuildPage() { // 메인
    const navigate = useNavigate();

    const [buildMode, setBuildMode] = useState<BuildMode>("library");
    // Library Build 옵션 상태
    const [marketEnabled, setMarketEnabled] = useState(true);
    const [rankingEnabled, setRankingEnabled] = useState(false);
    const [commentEnabled, setCommentEnabled] = useState(true);
    const [tags, setTags] = useState<string[]>([]);
    const [sceneJson, setSceneJson] = useState<any | null>(null);

    useEffect(() => {
        const raw = sessionStorage.getItem("UNITY_BUILD_SCENE_JSON");
        if (!raw) {
            console.error("❌ Build JSON 없음");
            return;
        }

        try {
            const parsed = JSON.parse(raw);
            setSceneJson(parsed);
            console.log("✅ Build JSON loaded", parsed);
        } catch (e) {
            console.error("❌ JSON 파싱 실패", e);
        }
    }, []);

    return (
        <div style={styles.page}>
            {/* --- Header --- */}
            <header style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '1rem 2rem',
                borderBottom: '1px solid #1a1a1a',
                backgroundColor: 'rgba(10, 10, 10, 0.95)',
                backdropFilter: 'blur(10px)',
                position: 'sticky',
                top: 0,
                zIndex: 100
            }}>
                {/* LEFT */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
                    {/* Logo */}
                    <div
                        style={{
                            fontSize: '1.5rem',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                        }}
                        onClick={() => navigate('/main')}
                    >
                        <i className="fa-solid fa-cube" style={{ marginRight: 8, color: '#3b82f6' }} />
                        <span className="gradient-text">Uniforge</span>
                        <span style={{ fontSize: '0.9rem', color: '#666', marginLeft: 10 }}>
                            빌드 설정
                        </span>
                    </div>

                    {/* Build Mode Tabs */}
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button
                            onClick={() => setBuildMode('unity')}
                            style={{
                                padding: '8px 16px',
                                borderRadius: 8,
                                border: '1px solid',
                                borderColor: buildMode === 'unity' ? '#3b82f6' : '#333',
                                background: buildMode === 'unity' ? '#0f172a' : 'transparent',
                                color: buildMode === 'unity' ? '#fff' : '#888',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                            }}
                        >
                            <i className="fa-brands fa-unity" style={{ marginRight: 8 }} />
                            유니티로 전환
                        </button>

                        <button
                            onClick={() => setBuildMode('library')}
                            style={{
                                padding: '8px 16px',
                                borderRadius: 8,
                                border: '1px solid',
                                borderColor: buildMode === 'library' ? '#3b82f6' : '#333',
                                background: buildMode === 'library' ? '#0f172a' : 'transparent',
                                color: buildMode === 'library' ? '#fff' : '#888',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                            }}
                        >
                            <i className="fa-solid fa-box-archive" style={{ marginRight: 8 }} />
                            라이브러리에 빌드
                        </button>
                    </div>
                </div>

                {/* RIGHT */}
                <button
                    onClick={() => navigate('/editor')}
                    style={{
                        background: 'transparent',
                        border: '1px solid #333',
                        color: '#ccc',
                        cursor: 'pointer',
                        padding: '8px 16px',
                        borderRadius: 6,
                        fontSize: '0.95rem',
                    }}
                    onMouseEnter={e => e.currentTarget.style.color = 'white'}
                    onMouseLeave={e => e.currentTarget.style.color = '#ccc'}
                >
                    ← 에디터로 돌아가기
                </button>
            </header>

            {/* --- MAIN CONTENT --- */}
            {buildMode === "unity" && sceneJson && (
                <UnityBuildPanel sceneJson={sceneJson} />
            )}

            {buildMode === "library" && (
                <LibraryBuildPanel
                    marketEnabled={marketEnabled}
                    setMarketEnabled={setMarketEnabled}
                    rankingEnabled={rankingEnabled}
                    setRankingEnabled={setRankingEnabled}
                    commentEnabled={commentEnabled}
                    setCommentEnabled={setCommentEnabled}
                    tags={tags}
                    setTags={setTags}
                />
            )}
        </div>
    );
}

interface LibraryBuildPanelProps {
    marketEnabled: boolean;
    setMarketEnabled: (v: boolean) => void;
    rankingEnabled: boolean;
    setRankingEnabled: (v: boolean) => void;
    commentEnabled: boolean;
    setCommentEnabled: (v: boolean) => void;
    tags: string[];
    setTags: (tags: string[]) => void;
}

function LibraryBuildPanel({
    marketEnabled,
    setMarketEnabled,
    rankingEnabled,
    setRankingEnabled,
    commentEnabled,
    setCommentEnabled,
    tags,
    setTags,
}: LibraryBuildPanelProps) {
    return (
        <div style={styles.content}>
            {/* LEFT */}
            <div style={styles.left}>
                <div style={styles.thumbnailBox}>
                    <div style={styles.thumbnailButton}>+ 이미지 추가</div>
                </div>

                <ToggleSwitch
                    label="마켓 플레이스 등록 여부"
                    value={marketEnabled}
                    onChange={setMarketEnabled}
                />
                <ToggleSwitch
                    label="랭킹 기능 사용"
                    value={rankingEnabled}
                    onChange={setRankingEnabled}
                />
                <Select label="등수 선정 기준" value="클리어 타임" />
                <ToggleSwitch
                    label="댓글 기능 사용"
                    value={commentEnabled}
                    onChange={setCommentEnabled}
                />
            </div>

            {/* RIGHT */}
            <div style={styles.right}>
                <input placeholder="제목을 입력하세요." style={styles.titleInput} />
                <textarea placeholder="게임 설명을 입력하세요" style={styles.descInput} />

                <h4># 태그</h4>
                <TagInput tags={tags} onChange={setTags} />

                <button style={styles.buildButton}>게임 빌드하기</button>
            </div>
        </div>
    );
}
function UnityBuildPanel({ sceneJson }: { sceneJson: any }) {
    const handleSend = async () => {
        if (!sceneJson) {
            alert("Scene JSON이 없습니다.");
            return;
        }

        await sendToUnity(sceneJson);
    };

    return (
        <div style={{ padding: 64 }}>
            <h2>유니티로 전환</h2>
            <p>웹 설정 없이 Unity에서 바로 빌드합니다.</p>

            <button style={styles.buildButton} onClick={handleSend}>
                Unity로 빌드 설정 전송
            </button>
        </div>
    );
}
async function sendToUnity(jsonData: any) {
    try {
        const prettyJson = JSON.stringify(jsonData, null, 2);
        console.log("[Unity Export] Sending to Unity at localhost:7777/import...");

        const res = await fetch("http://localhost:7777/import", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: prettyJson,
        });

        if (!res.ok) throw new Error("Unity 연결 실패");

        console.log("[Unity Export] Success!");
        alert("Unity로 전송 완료!");
    } catch (e) {
        console.error("[Unity Export] Error:", e);
        alert("Unity가 실행 중인지 확인하세요. (localhost:7777)");
    }
}