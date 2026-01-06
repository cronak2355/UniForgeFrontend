import type { SceneJSON } from "../core/SceneSerializer";

const API_BASE = "/api";

export async function saveScenes(
    gameId: number,
    scene: SceneJSON
): Promise<void> {
    const res = await fetch(
        `${API_BASE}/games/${gameId}/versions`,
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(scene),
        }
    );

    if (!res.ok) {
        throw new Error("Failed to save scene");
    }
}
