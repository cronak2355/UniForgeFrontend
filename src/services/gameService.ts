export interface GameSummary {
    gameId: number;
    title: string;
    description?: string;
    thumbnailUrl?: string | null;
    authorId: number;
    latestVersionId?: number | null;
    createdAt: string;
}

const API_BASE = "/api";

export async function fetchMyGames(authorId: number): Promise<GameSummary[]> {
    const res = await fetch(`${API_BASE}/games/my?authorId=${authorId}`);
    if (!res.ok) {
        throw new Error("Failed to fetch my games");
    }
    return res.json();
}

export async function fetchPublicGames(): Promise<GameSummary[]> {
    const res = await fetch(`${API_BASE}/games/public`);
    if (!res.ok) {
        throw new Error("Failed to fetch public games");
    }
    return res.json();
}
