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

    const text = await res.text();

    // Check if response is HTML (e.g. 404 page from frontend server)
    if (text.trim().startsWith("<")) {
        console.warn("[sceneApi] Received HTML instead of JSON. Treating as empty/404.");
        return null;
    }

    try {
        const data = JSON.parse(text);
        return JSON.parse(data.sceneJson);
    } catch (e) {
        console.error("[sceneApi] Failed to parse response:", text);
        // If it's not JSON, it might be an unhandled error page
        return null;
    }
}
