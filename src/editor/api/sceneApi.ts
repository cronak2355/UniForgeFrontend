import type { SceneJSON } from "../core/SceneSerializer";

const API_BASE = "https://uniforge.kr/api";

export async function saveScenes(
    gameId: string,
    scene: SceneJSON
): Promise<void> {
    const token = localStorage.getItem('token');
    const headers: HeadersInit = {
        "Content-Type": "application/json",
    };
    if (token) {
        headers["Authorization"] = `Bearer ${token}`;
    }

    const res = await fetch(
        `${API_BASE}/games/${gameId}/versions`,
        {
            method: "POST",
            headers,
            body: JSON.stringify(scene),
        }
    );

    if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`Failed to save scene: ${errorText}`);
    }
}
