export interface GameSummary {
    gameId: string;
    title: string;
    description?: string;
    thumbnailUrl?: string | null;
    authorId: string;
    latestVersionId?: string | null;
    isPublic?: boolean;
    createdAt: string;
}

const API_BASE = "/api";

export async function fetchMyGames(authorId: string): Promise<GameSummary[]> {
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
    return { ...data, gameId: data.gameId || data.id }; // Ensure gameId is set correctly
}

export async function updateGameThumbnail(gameId: string, thumbnailUrl: string): Promise<GameSummary> {
    const token = localStorage.getItem('token');
    const headers: HeadersInit = {
        "Content-Type": "application/json",
    };
    if (token) {
        headers["Authorization"] = `Bearer ${token}`;
    }

    const res = await fetch(`${API_BASE}/games/${gameId}`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({ thumbnailUrl }),
    });

    if (!res.ok) {
        throw new Error("Failed to update game thumbnail");
    }
    return res.json();
}

export async function deleteGame(gameId: string): Promise<void> {
    const token = localStorage.getItem('token');
    const headers: HeadersInit = {};
    if (token) {
        headers["Authorization"] = `Bearer ${token}`;
    }

    const res = await fetch(`${API_BASE}/games/${gameId}`, {
        method: "DELETE",
        headers,
    });

    if (!res.ok) {
        throw new Error("Failed to delete game");
    }
}

export async function saveGameVersion(gameId: string, sceneData: any): Promise<void> {
    const token = localStorage.getItem('token');
    const headers: HeadersInit = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const res = await fetch(`${API_BASE}/games/${gameId}/versions`, {
        method: "POST",
        headers,
        body: JSON.stringify(sceneData),
    });

    if (!res.ok) throw new Error("Failed to save game version");
}

export async function updateGameInfo(gameId: string, title?: string, description?: string, thumbnailUrl?: string, isPublic?: boolean): Promise<GameSummary> {
    const token = localStorage.getItem('token');
    const headers: HeadersInit = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const body: any = {};
    if (title) body.title = title;
    if (description) body.description = description;
    if (thumbnailUrl) body.thumbnailUrl = thumbnailUrl;
    if (isPublic !== undefined) body.isPublic = isPublic;

    const res = await fetch(`${API_BASE}/games/${gameId}`, {
        method: "PATCH",
        headers,
        body: JSON.stringify(body),
    });

    if (!res.ok) throw new Error("Failed to update game info");
    return res.json();
}

export async function uploadGameThumbnail(gameId: string, file: File): Promise<string> {
    const token = localStorage.getItem('token');
    const headers: HeadersInit = {};
    if (token) headers["Authorization"] = `Bearer ${token}`;

    // 1. Get Presigned URL
    // We reuse the backend endpoint used by assets: /uploads/presign/image
    // ownerType=GAME, ownerId=gameId, imageType=thumbnail
    const presignRes = await fetch(`${API_BASE}/uploads/presign/image?ownerType=GAME&ownerId=${gameId}&imageType=thumbnail&contentType=${encodeURIComponent(file.type)}`, {
        method: "POST",
        headers
    });

    if (!presignRes.ok) throw new Error("Failed to get upload URL");
    const { uploadUrl, s3Key } = await presignRes.json();

    // 2. Upload to S3
    const uploadRes = await fetch(uploadUrl, {
        method: "PUT",
        body: file,
        headers: {
            "Content-Type": file.type
        }
    });

    if (!uploadRes.ok) throw new Error("Failed to upload image to S3");

    // 3. Register Image Resource (Optional for now but good practice)
    // 3. Register Image Resource
    const regRes = await fetch(`${API_BASE}/images`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            ...headers
        },
        body: JSON.stringify({
            ownerType: "GAME",
            ownerId: gameId,
            imageType: "thumbnail",
            s3Key: s3Key
        })
    });

    if (!regRes.ok) {
        console.error("Failed to register image resource", await regRes.text());
        throw new Error("Failed to register image resource");
    }

    // 4. Update Game with Proxy URL
    // Use the backend proxy endpoint we just created
    const finalUrl = `/api/games/s3/${encodeURIComponent(gameId)}?imageType=thumbnail`;

    // Update the game entity with this local proxy URL
    await updateGameInfo(gameId, undefined, undefined, finalUrl);

    return finalUrl;
}
