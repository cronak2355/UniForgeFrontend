import type { SceneJSON } from "../core/SceneSerializer";

const API_BASE = "/api";

export async function saveScenes(
    gameId: number,
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
        throw new Error("Failed to save scene");
    }
}
