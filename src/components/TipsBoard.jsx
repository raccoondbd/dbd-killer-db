import React, { useState, useEffect } from 'react';
import { signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { collection, query, where, orderBy, onSnapshot, addDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../firebase';
import './TipsBoard.css';

const TipsBoard = ({ killerId }) => {
    const [comments, setComments] = useState([]);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [authorName, setAuthorName] = useState("");
    const [newComment, setNewComment] = useState("");
    const [replyTo, setReplyTo] = useState(null);
    const [user, setUser] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [visibleCount, setVisibleCount] = useState(5);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            if (currentUser) {
                setUser(currentUser);
            } else {
                signInAnonymously(auth).catch((error) => console.error("Anonymous auth failed", error));
            }
        });
        return () => unsubscribe();
    }, []);

    useEffect(() => {
        if (!killerId) return;
        
        const q = query(
            collection(db, 'comments'),
            where('killerId', '==', killerId),
            orderBy('createdAt', 'desc')
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const commentsData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            
            // 新規投稿直後など、createdAt が未設定(null)の場合はローカルの現在時刻として扱う
            commentsData.sort((a, b) => {
                const timeA = a.createdAt?.toMillis() || Date.now();
                const timeB = b.createdAt?.toMillis() || Date.now();
                return timeB - timeA;
            });
            
            setComments(commentsData);
        }, (error) => {
            console.error("Error fetching comments: ", error);
        });

        return () => unsubscribe();
    }, [killerId]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!newComment.trim() || !user) return;

        // 🚨 1日の投稿回数制限（例: 1日20回まで）
        const today = new Date().toLocaleDateString();
        const dailyDataStr = localStorage.getItem('dailyTipCount');
        let dailyData = dailyDataStr ? JSON.parse(dailyDataStr) : { date: today, count: 0 };
        
        if (dailyData.date !== today) {
            dailyData = { date: today, count: 0 }; // 日付が変わったらリセット
        }

        if (dailyData.count >= 100) {
            alert("1日のコメント投稿上限（100回）に達しました。また明日お試しください。");
            return;
        }

        // 🚨 連投防止（5秒のクールタイム）
        const lastSubmitTime = localStorage.getItem('lastTipSubmissionTime');
        if (lastSubmitTime) {
            const timeDiff = Date.now() - parseInt(lastSubmitTime, 10);
            if (timeDiff < 5000) { // 5秒
                alert("連続投稿はできません。少し待ってから再度お試しください。");
                return;
            }
        }

        setIsSubmitting(true);
        try {
            await addDoc(collection(db, 'comments'), {
                killerId: killerId,
                userId: user.uid,
                authorName: authorName.trim() || "名無しさん",
                content: newComment.trim(),
                replyToId: replyTo ? replyTo.id : null,
                createdAt: serverTimestamp(),
            });
            
            // 投稿時間を記録（クールタイム用）
            localStorage.setItem('lastTipSubmissionTime', Date.now().toString());
            
            // 1日の投稿回数をカウントアップ
            dailyData.count += 1;
            localStorage.setItem('dailyTipCount', JSON.stringify(dailyData));
            
            setNewComment("");
            setReplyTo(null);
            setIsFormOpen(false);
        } catch (error) {
            console.error("Error adding comment: ", error);
            alert("コメントの投稿に失敗しました。");
        }
        setIsSubmitting(false);
    };

    const handleDelete = async (commentId) => {
        if (window.confirm("このコメントを削除してもよろしいですか？")) {
            try {
                await deleteDoc(doc(db, 'comments', commentId));
            } catch (error) {
                console.error("Error deleting comment: ", error);
                alert("削除に失敗しました。");
            }
        }
    };

    const handleReport = async (commentId) => {
        if (window.confirm("このコメントを不適切として通報しますか？")) {
            try {
                await addDoc(collection(db, 'reports'), {
                    commentId,
                    reporterId: user?.uid || 'unknown',
                    createdAt: serverTimestamp(),
                    killerId
                });
                alert("通報を受理しました。管理者が内容を確認します。");
            } catch (error) {
                console.error("Error reporting comment: ", error);
                alert("通報処理に失敗しました。");
            }
        }
    };

    const handleReplyClick = (comment) => {
        setReplyTo({ id: comment.id, name: comment.authorName || '名無しさん' });
        setIsFormOpen(true);
        // 少し待ってからテキストエリアにフォーカスを当てる
        setTimeout(() => {
            document.querySelector('.tips-input')?.focus();
        }, 100);
    };

    const cancelReply = () => {
        setReplyTo(null);
    };

    // 親コメントと子コメント（返信）を分離
    const rootComments = comments.filter(c => !c.replyToId);
    const childComments = comments.filter(c => c.replyToId);

    // 親コメントのみページネーションの対象にする
    const visibleRootComments = rootComments.slice(0, visibleCount);

    const renderComment = (comment, isChild = false) => {
        const isMine = user && user.uid === comment.userId;
        const commentDate = comment.createdAt?.toDate().toLocaleString('ja-JP', {
            year: 'numeric', month: '2-digit', day: '2-digit', 
            hour: '2-digit', minute: '2-digit'
        }) || '送信中...';

        return (
            <div key={comment.id} className={`tip-card ${isChild ? 'tip-child' : ''}`}>
                <div className="tip-header">
                    <span className="tip-author">{comment.authorName || '名無しさん'}</span>
                    <span className="tip-date">{commentDate}</span>
                </div>
                <p className="tip-content">{comment.content}</p>
                <div className="tip-actions">
                    {!isChild && (
                        <button className="tip-action-btn reply-btn" onClick={() => handleReplyClick(comment)}>
                            ↩ 返信
                        </button>
                    )}
                    {isMine && (
                        <button className="tip-action-btn delete-btn" onClick={() => handleDelete(comment.id)}>
                            🗑 削除
                        </button>
                    )}
                    <button className="tip-action-btn report-btn" onClick={() => handleReport(comment.id)}>
                        ⚠ 通報
                    </button>
                </div>
            </div>
        );
    };

    return (
        <section className="tips-board-section">
            <div className="tips-board-header">
                <h2>みんなのTIPS</h2>
                {!isFormOpen && (
                    <button className="open-form-btn" onClick={() => setIsFormOpen(true)}>
                        + コメントを書き込む
                    </button>
                )}
            </div>

            <div className="tips-board-container">
                {isFormOpen && (
                    <form className="tips-form" onSubmit={handleSubmit}>
                        {replyTo && (
                            <div className="reply-indicator">
                                <span>「{replyTo.name}」さんへの返信</span>
                                <button type="button" className="cancel-reply-btn" onClick={cancelReply}>×</button>
                            </div>
                        )}
                        <input 
                            type="text" 
                            className="tips-name-input" 
                            placeholder="名前 (省略可・名無しさん)" 
                            value={authorName}
                            onChange={(e) => setAuthorName(e.target.value)}
                            maxLength="20"
                        />
                        <textarea 
                            className="tips-input"
                            placeholder="このキラーのコツや対策、おすすめパークなどを共有しよう！"
                            value={newComment}
                            onChange={(e) => setNewComment(e.target.value)}
                            rows="4"
                            maxLength="500"
                            required
                        />
                        <div className="tips-form-footer">
                            <span className="tips-char-count">{newComment.length} / 500</span>
                            <div className="form-action-buttons">
                                <button type="button" className="cancel-btn" onClick={() => {
                                    setIsFormOpen(false);
                                    setReplyTo(null);
                                }}>
                                    キャンセル
                                </button>
                                <button type="submit" className="tips-submit-btn" disabled={isSubmitting || !newComment.trim()}>
                                    {isSubmitting ? '送信中...' : '書き込む'}
                                </button>
                            </div>
                        </div>
                    </form>
                )}

                <div className="tips-list">
                    {rootComments.length === 0 ? (
                        <p className="no-tips">まだコメントがありません。</p>
                    ) : (
                        visibleRootComments.map(rootComment => (
                            <div key={rootComment.id} className="tip-thread">
                                {renderComment(rootComment)}
                                {/* このコメントへの返信を表示（古い順） */}
                                {childComments
                                    .filter(child => child.replyToId === rootComment.id)
                                    .sort((a, b) => (a.createdAt?.toMillis() || 0) - (b.createdAt?.toMillis() || 0))
                                    .map(child => renderComment(child, true))
                                }
                            </div>
                        ))
                    )}
                </div>

                {rootComments.length > visibleCount && (
                    <button className="load-more-btn" onClick={() => setVisibleCount(prev => prev + 5)}>
                        もっと見る ({rootComments.length - visibleCount}件)
                    </button>
                )}
            </div>
        </section>
    );
};

export default TipsBoard;
