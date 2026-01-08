import { GameSummary } from "./gameService";

const API_BASE = "/api";

export async function fetchMarketplaceGames(): Promise<GameSummary[]> {
    const res = await fetch(`${API_BASE}/games/public`);
    if (!res.ok) {
        throw new Error("Failed to fetch marketplace games");
    }
    return res.json();
}
