import type { SceneJSON, GameDataJSON } from "../core/SceneSerializer";

const API_BASE = "https://uniforge.kr/api";

export async function saveScenes(
    gameId: string,
    scene: SceneJSON | GameDataJSON | any
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

export async function loadScene(
    gameId: string
): Promise<SceneJSON | null> {
    const token = localStorage.getItem('token');
    const headers: HeadersInit = {};
    if (token) {
        headers["Authorization"] = `Bearer ${token}`;
    }

    const res = await fetch(
        `${API_BASE}/games/${gameId}/versions/latest`,
        { headers }
    );

    if (res.status === 404) {
        return null; // No version saved yet
    }

    if (!res.ok) {
        throw new Error("Failed to load scene");
    }

    const data = await res.json();
    return JSON.parse(data.sceneJson);
}
