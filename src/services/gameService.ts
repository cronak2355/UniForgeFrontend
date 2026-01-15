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
    await fetch(`${API_BASE}/images`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            ...headers
        },
        body: JSON.stringify({
            ownerType: "GAME",
            ownerId: gameId,
            imageType: "thumbnail",
            s3Key: s3Key,
            isActive: true
        })
    });

    // 4. Update Game with CloudFront URL
    const CLOUDFRONT_DOMAIN = "d3268cfwjiozkv.cloudfront.net"; // Hardcoded or import if possible. Let's reuse import if easiest, but for now safe to hardcode or import.
    // Actually importing from utils is better.
    const finalUrl = `https://${CLOUDFRONT_DOMAIN}/${s3Key}`;

    // We do NOT update the game here automatically? 
    // The plan said "Update Game Entity". 
    // Yes, we should probably update it here or let the caller do it.
    // The caller (PublishModal) might want to update title/desc too.
    // So let's just return the keys/url and let the caller update the game info?
    // OR, update it here to be safe.
    // Let's update it here.

    await updateGameInfo(gameId, undefined, undefined, finalUrl);

    return finalUrl;
}
