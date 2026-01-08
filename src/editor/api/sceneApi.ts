import type { SceneJSON } from "../core/SceneSerializer";

const API_BASE = "/api";

export async function saveScenes(
    gameId: number,
    scene: SceneJSON
): Promise<void> {
    const token = localStorage.getItem("token");

    const res = await fetch(
        `${API_BASE}/games/${gameId}/versions`,
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                ...(token ? { "Authorization": `Bearer ${token}` } : {}),
            },
            body: JSON.stringify(scene),
        }
    );

    if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`Failed to save scene: ${errorText}`);
    }
}
