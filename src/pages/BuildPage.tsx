import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { UnitySceneExporter } from "../editor/core/UnitySceneExport";

const styles: { [key: string]: React.CSSProperties } = {
    page: {
        minHeight: "100vh",
        background: "radial-gradient(circle at top, #060b3a, #020316)",
        color: "#fff",
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

export default function BuildPage() {
    const navigate = useNavigate();
    const [sceneJson, setSceneJson] = useState<any | null>(null);

    useEffect(() => {
        const raw = sessionStorage.getItem("UNITY_BUILD_SCENE_JSON");
        if (!raw) {
            console.error("Build JSON not found");
            return;
        }

        try {
            const parsed = JSON.parse(raw);
            setSceneJson(parsed);
            console.log("Build JSON loaded", parsed);
        } catch (e) {
            console.error("Failed to parse Build JSON", e);
        }
    }, []);

    return (
        <div style={styles.page}>
            {/* Header */}
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
                    에디터로 돌아가기
                </button>
            </header>

            {/* Content */}
            {sceneJson ? (
                <UnityBuildPanel sceneJson={sceneJson} />
            ) : (
                <div style={{ padding: 64, color: '#9ca3af' }}>
                    빌드 데이터가 없습니다. 에디터에서 Export 후 다시 시도하세요.
                </div>
            )}
        </div>
    );
}

function UnityBuildPanel({ sceneJson }: { sceneJson: any }) {
    const handleSend = async () => {
        if (!sceneJson) {
            alert("Scene JSON이 없습니다.");
            return;
        }

        // Convert asset URLs to Unity-friendly format
        const finalJson = await UnitySceneExporter.convertAssetsToDataUris(sceneJson);

        await sendToUnity(finalJson);
    };

    return (
        <div style={{ padding: 64 }}>
            <h2>Unity로 전환</h2>
            <p>MetamongProtocol을 통해 에디터 프로젝트를 Unity로 전송합니다.</p>

            <div style={{
                marginTop: 20,
                marginBottom: 24,
                padding: '16px 18px',
                borderRadius: 12,
                border: '1px solid rgba(255,255,255,0.15)',
                background: 'rgba(8, 12, 40, 0.7)',
                color: '#cbd5f5',
                fontSize: 14,
                lineHeight: 1.6
            }}>
                <div style={{ fontWeight: 700, color: '#e6ecff', marginBottom: 8 }}>
                    전송 전에 확인하세요
                </div>
                <ul style={{ margin: 0, paddingLeft: 18 }}>
                    <li>Unity에서 MetamongProtocol이 실행 중이어야 합니다.</li>
                    <li>기본 수신 주소는 <strong>http://localhost:7777/import</strong> 입니다.</li>
                    <li>전송 시 프로젝트 데이터가 Unity 프로젝트로 변환/적용됩니다.</li>
                </ul>
            </div>

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
