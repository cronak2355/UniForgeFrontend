export interface GameSummary {
    gameId: number;
    title: string;
    description?: string;
    thumbnailUrl?: string | null;
    authorId: string;
    latestVersionId?: number | null;
    createdAt: string;
}

const API_BASE = "/api";

export async function fetchMyGames(authorId: number | string): Promise<GameSummary[]> {
    const token = localStorage.getItem('token');
    const headers: HeadersInit = {};
    if (token) {
        headers["Authorization"] = `Bearer ${token}`;
    }

    const res = await fetch(`${API_BASE}/games/my?authorId=${authorId}`, {
        headers
    });
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

export async function createGame(authorId: string, title: string, description: string): Promise<GameSummary> {
    const token = localStorage.getItem('token');
    const headers: HeadersInit = {};
    if (token) {
        headers["Authorization"] = `Bearer ${token}`;
    }

    // Backend expects RequestParams, not JSON body for this endpoint
    const params = new URLSearchParams();
    params.append('authorId', authorId);
    params.append('title', title);
    if (description) params.append('description', description);

    const res = await fetch(`${API_BASE}/games?${params.toString()}`, {
        method: "POST",
        headers,
    });

    if (!res.ok) {
        throw new Error("Failed to create game");
    }
    const data = await res.json();
    // Map backend Entity (id) to Frontend Interface (gameId)
    return { ...data, gameId: data.id };
}
