import React, { useState, useEffect } from 'react';
import { commentService, CommentResponse } from '../../services/commentService';
import { useAuth } from '../../contexts/AuthContext';

interface CommentSectionProps {
    gameId: string;
}

const formatTimeAgo = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diff < 60) return '방금 전';
    if (diff < 3600) return `${Math.floor(diff / 60)}분 전`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`;
    if (diff < 2592000) return `${Math.floor(diff / 86400)}일 전`;
    return date.toLocaleDateString();
};

const CommentSection: React.FC<CommentSectionProps> = ({ gameId }) => {
    const { user } = useAuth();
    const [comments, setComments] = useState<CommentResponse[]>([]);
    const [newComment, setNewComment] = useState('');
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        loadComments();
    }, [gameId]);

    const loadComments = async () => {
        try {
            setLoading(true);
            const data = await commentService.getComments(gameId);
            setComments(data);
        } catch (e) {
            console.error('Failed to load comments', e);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !newComment.trim() || submitting) return;

        try {
            setSubmitting(true);
            const added = await commentService.addComment(gameId, user.id, newComment);
            setComments([added, ...comments]);
            setNewComment('');
        } catch (e) {
            console.error('Failed to post comment', e);
            alert('댓글 작성에 실패했습니다.');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (commentId: string) => {
        if (!user || !window.confirm('댓글을 삭제하시겠습니까?')) return;

        try {
            await commentService.deleteComment(gameId, commentId, user.id);
            setComments(comments.filter(c => c.id !== commentId));
        } catch (e) {
            console.error('Failed to delete comment', e);
            alert('댓글 삭제에 실패했습니다.');
        }
    };

    if (loading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '40px 0' }}>
                <i className="fa-solid fa-circle-notch fa-spin" style={{ color: '#666', fontSize: '24px' }}></i>
            </div>
        );
    }

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            backgroundColor: '#111',
            borderRadius: '12px',
            overflow: 'hidden',
            border: '1px solid #222'
        }}>
            <div style={{ padding: '16px', borderBottom: '1px solid #222', backgroundColor: '#0a0a0a' }}>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <i className="fa-solid fa-comments" style={{ color: '#3b82f6' }}></i>
                    댓글 <span style={{ color: '#666', fontSize: '0.9rem' }}>{comments.length}</span>
                </h3>
            </div>

            {/* Comment List */}
            <div style={{
                flex: 1,
                overflowY: 'auto',
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px'
            }} className="custom-scrollbar">
                {comments.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px 0', color: '#444' }}>
                        <i className="fa-regular fa-message" style={{ fontSize: '40px', marginBottom: '12px', display: 'block', opacity: 0.2 }}></i>
                        첫 번째 댓글을 남겨보세요!
                    </div>
                ) : (
                    comments.map((comment) => (
                        <div key={comment.id} style={{ display: 'flex', gap: '12px' }}>
                            {/* Avatar */}
                            <div style={{
                                flexShrink: 0,
                                width: '40px',
                                height: '40px',
                                borderRadius: '50%',
                                backgroundColor: '#1a1a1a',
                                border: '1px solid #333',
                                overflow: 'hidden',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}>
                                {comment.authorProfileImage ? (
                                    <img src={comment.authorProfileImage} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                ) : (
                                    <i className="fa-solid fa-user" style={{ color: '#444' }}></i>
                                )}
                            </div>

                            {/* Content */}
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'between', marginBottom: '4px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
                                        <span style={{ fontWeight: 600, fontSize: '0.9rem', color: '#eee' }}>{comment.authorName}</span>
                                        <span style={{ fontSize: '0.75rem', color: '#555' }}>
                                            {formatTimeAgo(comment.createdAt)}
                                        </span>
                                    </div>
                                    {user?.id === comment.authorId && (
                                        <button
                                            onClick={() => handleDelete(comment.id)}
                                            style={{
                                                background: 'transparent',
                                                border: 'none',
                                                color: '#444',
                                                cursor: 'pointer',
                                                padding: '4px',
                                                transition: 'color 0.2s'
                                            }}
                                            onMouseEnter={e => e.currentTarget.style.color = '#ef4444'}
                                            onMouseLeave={e => e.currentTarget.style.color = '#444'}
                                            title="삭제"
                                        >
                                            <i className="fa-solid fa-trash-can" style={{ fontSize: '12px' }}></i>
                                        </button>
                                    )}
                                </div>
                                <div style={{
                                    backgroundColor: '#1a1a1a',
                                    padding: '12px',
                                    borderRadius: '16px',
                                    borderTopLeftRadius: 0,
                                    border: '1px solid #222',
                                    fontSize: '0.9rem',
                                    color: '#ccc',
                                    lineHeight: 1.5,
                                    wordBreak: 'break-word'
                                }}>
                                    {comment.content}
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Input Area */}
            {user ? (
                <form onSubmit={handleSubmit} style={{ padding: '16px', backgroundColor: '#0a0a0a', borderTop: '1px solid #222' }}>
                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <textarea
                            value={newComment}
                            onChange={(e) => setNewComment(e.target.value)}
                            placeholder="멋진 댓글을 남겨보세요..."
                            style={{
                                flex: 1,
                                backgroundColor: '#1a1a1a',
                                border: '1px solid #333',
                                borderRadius: '20px',
                                padding: '10px 16px',
                                fontSize: '0.9rem',
                                color: '#eee',
                                outline: 'none',
                                transition: 'border-color 0.2s',
                                resize: 'none',
                                height: '44px',
                                lineHeight: '1.4'
                            }}
                            onFocus={e => e.target.style.borderColor = '#2563eb'}
                            onBlur={e => e.target.style.borderColor = '#333'}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleSubmit(e);
                                }
                            }}
                        />
                        <button
                            type="submit"
                            disabled={!newComment.trim() || submitting}
                            style={{
                                weight: '44px',
                                height: '44px',
                                width: '44px',
                                borderRadius: '50%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                border: 'none',
                                backgroundColor: newComment.trim() && !submitting ? '#2563eb' : '#222',
                                color: newComment.trim() && !submitting ? 'white' : '#555',
                                cursor: newComment.trim() && !submitting ? 'pointer' : 'default',
                                transition: 'all 0.2s'
                            }}
                        >
                            {submitting ? (
                                <i className="fa-solid fa-spinner fa-spin"></i>
                            ) : (
                                <i className="fa-solid fa-paper-plane"></i>
                            )}
                        </button>
                    </div>
                </form>
            ) : (
                <div style={{ padding: '16px', backgroundColor: '#0a0a0a', borderTop: '1px solid #222', textAlign: 'center', fontSize: '0.85rem', color: '#555' }}>
                    로그인 후 댓글을 남길 수 있습니다.
                </div>
            )}
        </div>
    );
};

export default CommentSection;
