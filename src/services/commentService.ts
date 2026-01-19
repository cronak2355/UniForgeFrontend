export interface CommentResponse {
    id: string;
    content: string;
    authorId: string;
    authorName: string;
    authorProfileImage: string | null;
    createdAt: string;
}

const API_BASE = "/api";

export const commentService = {
    getComments: async (gameId: string): Promise<CommentResponse[]> => {
        const res = await fetch(`${API_BASE}/games/${gameId}/comments`);
        if (!res.ok) throw new Error("Failed to fetch comments");
        return res.json();
    },

    addComment: async (gameId: string, authorId: string, content: string): Promise<CommentResponse> => {
        const token = localStorage.getItem('token');
        const headers: HeadersInit = { "Content-Type": "application/json" };
        if (token) headers["Authorization"] = `Bearer ${token}`;

        const res = await fetch(`${API_BASE}/games/${gameId}/comments?authorId=${authorId}`, {
            method: "POST",
            headers,
            body: JSON.stringify({ content })
        });
        if (!res.ok) throw new Error("Failed to post comment");
        return res.json();
    },

    deleteComment: async (gameId: string, commentId: string, userId: string): Promise<void> => {
        const token = localStorage.getItem('token');
        const headers: HeadersInit = {};
        if (token) headers["Authorization"] = `Bearer ${token}`;

        const res = await fetch(`${API_BASE}/games/${gameId}/comments/${commentId}?userId=${userId}`, {
            method: "DELETE",
            headers
        });
        if (!res.ok) throw new Error("Failed to delete comment");
    }
};
