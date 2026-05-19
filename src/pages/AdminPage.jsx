import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, getDocs, doc, updateDoc, deleteDoc, getDoc } from 'firebase/firestore';
import { signInWithPopup, onAuthStateChanged, signOut } from 'firebase/auth';
import { db, auth, googleProvider } from '../firebase';
import './AdminPage.css';

const AdminPage = () => {
    const [applications, setApplications] = useState([]);
    const [videos, setVideos] = useState([]);
    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(false);
    const [adminUser, setAdminUser] = useState(null);
    const [authChecking, setAuthChecking] = useState(true);
    const [editingItem, setEditingItem] = useState(null); // { id, type }
    const [editForm, setEditForm] = useState({
        name: '',
        tags: '',
        xUrl: '',
        youtubeUrl: '',
        twitchUrl: '',
        description: '',
        avatarUrl: ''
    });

    const ADMIN_UID = 'tZWguxrnhVTP9YlEMG4DQ6c0OlP2'; // 管理者のUID

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            if (user && user.providerData && user.providerData.length > 0) {
                setAdminUser(user);
            } else {
                setAdminUser(null);
            }
            setAuthChecking(false);
        });
        return () => unsubscribe();
    }, []);

    useEffect(() => {
        if (adminUser) {
            fetchAllData();
        }
    }, [adminUser]);

    const handleLogin = async () => {
        try {
            await signInWithPopup(auth, googleProvider);
        } catch (error) {
            console.error("Login failed:", error);
            alert("ログインに失敗しました。");
        }
    };

    const handleLogout = async () => {
        if (window.confirm("ログアウトしますか？")) {
            await signOut(auth);
            setApplications([]);
            setVideos([]);
            setReports([]);
        }
    };

    const fetchAllData = async () => {
        setLoading(true);
        try {
            // 1. クリエイター申請
            const appQ = query(collection(db, 'creatorApplications'), orderBy('createdAt', 'desc'));
            const appSnap = await getDocs(appQ);
            setApplications(appSnap.docs.map(d => ({ id: d.id, ...d.data() })));

            // 2. 動画推薦
            const vidQ = query(collection(db, 'videoSubmissions'), orderBy('createdAt', 'desc'));
            const vidSnap = await getDocs(vidQ);
            setVideos(vidSnap.docs.map(d => ({ id: d.id, ...d.data() })));

            // 3. 通報データ
            const repQ = query(collection(db, 'reports'), orderBy('createdAt', 'desc'));
            const repSnap = await getDocs(repQ);
            
            const reportsData = [];
            for (const rDoc of repSnap.docs) {
                const rData = rDoc.data();
                let commentContent = "（コメントは既に削除されています）";
                let commentAuthor = "不明";
                if (rData.commentId) {
                    const cSnap = await getDoc(doc(db, 'comments', rData.commentId));
                    if (cSnap.exists()) {
                        commentContent = cSnap.data().content;
                        commentAuthor = cSnap.data().authorName;
                    }
                }
                reportsData.push({ id: rDoc.id, ...rData, commentContent, commentAuthor });
            }
            setReports(reportsData);

        } catch (error) {
            console.error("Error fetching data:", error);
        }
        setLoading(false);
    };

    // --- クリエイター申請の処理 ---
    const handleApproveApp = async (id, type, targetCreatorId, targetSource) => {
        const confirmMsg = type === 'delete' 
            ? "本当にこの削除申請を承認し、対象のクリエイターをデータベースから削除しますか？" 
            : type === 'edit'
                ? "この変更内容を承認し、元のカードに反映しますか？"
                : "このクリエイターを承認してサイトに表示しますか？";
        
        if (!window.confirm(confirmMsg)) return;

        try {
            if (type === 'edit') {
                // 変更申請の承認処理
                if (targetSource === 'firebase' && targetCreatorId) {
                    const editSnap = await getDoc(doc(db, 'creatorApplications', id));
                    if (editSnap.exists()) {
                        const editData = editSnap.data();
                        const targetRef = doc(db, 'creatorApplications', targetCreatorId);
                        
                        // 送信されてきた項目の中で、空文字（または空配列）でないデータのみをマージして更新
                        const updates = {};
                        if (editData.name) updates.name = editData.name;
                        if (editData.tags) updates.tags = editData.tags;
                        if (editData.xUrl) updates.xUrl = editData.xUrl;
                        if (editData.youtubeUrl) updates.youtubeUrl = editData.youtubeUrl;
                        if (editData.twitchUrl) updates.twitchUrl = editData.twitchUrl;
                        if (editData.description) updates.description = editData.description;
                        if (editData.avatarUrl) updates.avatarUrl = editData.avatarUrl;

                        await updateDoc(targetRef, updates);
                    }
                }
                // 変更申請ドキュメント自体は削除する
                await deleteDoc(doc(db, 'creatorApplications', id));
                alert("変更内容を元のカードにマージして更新しました。");
            } else if (type === 'delete') {
                // 削除申請の承認処理
                if (targetSource === 'firebase' && targetCreatorId) {
                    await deleteDoc(doc(db, 'creatorApplications', targetCreatorId));
                }
                // 削除申請ドキュメント自体も削除
                await deleteDoc(doc(db, 'creatorApplications', id));
                alert("データベースから対象のクリエイターを削除し、依頼を完了しました。");
            } else {
                // 通常の新規掲載
                await updateDoc(doc(db, 'creatorApplications', id), { status: 'approved' });
                alert("承認して掲載しました。");
            }
            fetchAllData();
        } catch (error) {
            console.error("Operation failed:", error);
            alert("処理に失敗しました。");
        }
    };

    const handleDeleteApp = async (id) => {
        if (!window.confirm("本当にこの申請を却下（削除）しますか？")) return;
        try {
            await deleteDoc(doc(db, 'creatorApplications', id));
            setApplications(prev => prev.filter(app => app.id !== id));
        } catch (error) { alert("削除に失敗しました。"); }
    };

    // --- 編集モード開始 ---
    const startEdit = (item, type) => {
        setEditingItem({ id: item.id, type });
        setEditForm({
            name: item.name || '',
            tags: item.tags || '',
            xUrl: item.xUrl || '',
            youtubeUrl: item.youtubeUrl || '',
            twitchUrl: item.twitchUrl || '',
            description: item.description || '',
            avatarUrl: item.avatarUrl || ''
        });
    };

    // --- 編集の保存 ---
    const handleSaveEdit = async (e) => {
        e.preventDefault();
        if (!editingItem) return;

        try {
            const docRef = doc(db, 'creatorApplications', editingItem.id);
            await updateDoc(docRef, {
                name: editForm.name,
                tags: editForm.tags,
                xUrl: editForm.xUrl,
                youtubeUrl: editForm.youtubeUrl,
                twitchUrl: editForm.twitchUrl,
                description: editForm.description,
                avatarUrl: editForm.avatarUrl
            });

            alert("情報を更新しました。");
            setEditingItem(null);
            fetchAllData();
        } catch (error) {
            console.error("Failed to update creator info:", error);
            alert("更新に失敗しました。");
        }
    };

    // --- 動画推薦の処理 ---
    const handleDeleteVideo = async (id) => {
        if (!window.confirm("この動画推薦を削除（確認済みに）しますか？")) return;
        try {
            await deleteDoc(doc(db, 'videoSubmissions', id));
            setVideos(prev => prev.filter(v => v.id !== id));
        } catch (e) { alert("削除に失敗しました。"); }
    };

    // --- 通報の処理 ---
    const handleDeleteReportOnly = async (id) => {
        if (!window.confirm("問題なしと判断し、通報だけを削除（確認済みに）しますか？")) return;
        try {
            await deleteDoc(doc(db, 'reports', id));
            setReports(prev => prev.filter(r => r.id !== id));
        } catch (e) { alert("削除に失敗しました。"); }
    };

    const handleDeleteCommentAndReport = async (reportId, commentId) => {
        if (!window.confirm("悪質と判断し、対象の【コメント】と【通報】の両方を完全に削除しますか？")) return;
        try {
            if (commentId) {
                await deleteDoc(doc(db, 'comments', commentId));
            }
            await deleteDoc(doc(db, 'reports', reportId));
            setReports(prev => prev.filter(r => r.id !== reportId));
            alert("コメントと通報を削除しました。");
        } catch (e) { alert("削除に失敗しました。"); }
    };


    if (authChecking) return <div className="admin-page">認証チェック中...</div>;

    if (!adminUser) {
        return (
            <div className="admin-page" style={{ textAlign: 'center', marginTop: '5rem' }}>
                <h1>管理者専用ページ</h1>
                <p style={{ marginBottom: '2rem' }}>アクセスするには管理者アカウントでログインしてください。</p>
                <button className="approve-btn" onClick={handleLogin}>🔑 Googleでログイン</button>
            </div>
        );
    }

    if (adminUser.uid !== ADMIN_UID) {
        return (
            <div className="admin-page" style={{ textAlign: 'center', marginTop: '5rem' }}>
                <h1 style={{ color: '#e74c3c' }}>アクセス拒否</h1>
                <p style={{ marginBottom: '2rem' }}>このアカウントには管理者権限がありません。</p>
                <button className="cancel-btn" onClick={handleLogout}>ログアウトして戻る</button>
            </div>
        );
    }

    if (loading) return <div className="admin-page">読み込み中...</div>;

    const pendingNew = applications.filter(app => app.status === 'pending' && (!app.type || app.type === 'new'));
    const pendingEdit = applications.filter(app => app.status === 'pending' && app.type === 'edit');
    const pendingDelete = applications.filter(app => app.status === 'pending' && app.type === 'delete');
    const approvedApps = applications.filter(app => app.status === 'approved');

    return (
        <div className="admin-page">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <h1 style={{ margin: 0 }}>管理画面</h1>
                <button className="cancel-btn" onClick={handleLogout}>ログアウト</button>
            </div>
            
            <div style={{ background: '#2c3e50', padding: '1rem', borderRadius: '8px', marginBottom: '2rem' }}>
                <p style={{ margin: 0, color: '#ecf0f1', fontSize: '0.9rem' }}>
                    <strong>【重要】あなたの管理者UID:</strong> {adminUser.uid}<br/>
                </p>
            </div>

            {/* ====== 通報セクション ====== */}
            <section className="admin-section">
                <h2>🚨 通報されたコメント ({reports.length}件)</h2>
                {reports.length === 0 ? <p>現在、通報はありません。</p> : (
                    <div className="admin-card-list">
                        {reports.map(rep => (
                            <div key={rep.id} className="admin-card report">
                                <p><strong>キラーID:</strong> {rep.killerId}</p>
                                <p><strong>投稿者:</strong> {rep.commentAuthor}</p>
                                <div style={{ background: '#1e1e1e', padding: '1rem', borderRadius: '6px', margin: '1rem 0', fontStyle: 'italic', borderLeft: '3px solid #e74c3c' }}>
                                    {rep.commentContent}
                                </div>
                                <div className="admin-actions">
                                    <button className="delete-btn" onClick={() => handleDeleteCommentAndReport(rep.id, rep.commentId)}>
                                        🗑 コメントごと完全に削除
                                    </button>
                                    <button className="cancel-btn" onClick={() => handleDeleteReportOnly(rep.id)}>
                                        ✅ 問題なし (通報のみ削除)
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </section>

            {/* ====== クリエイター申請セクション ====== */}
            <section className="admin-section">
                <h2>✍️ 新規の掲載申請 ({pendingNew.length}件)</h2>
                {pendingNew.length === 0 ? <p>現在、新規の申請はありません。</p> : (
                    <div className="admin-card-list">
                        {pendingNew.map(app => (
                            <div key={app.id} className="admin-card pending">
                                <h3>{app.name}</h3>
                                <p><strong>タグ:</strong> {app.tags}</p>
                                <p><strong>自己紹介:</strong> {app.description}</p>
                                <p><strong>アイコン:</strong> {app.avatarUrl || 'なし'}</p>
                                <div className="admin-links">
                                    <a href={app.xUrl} target="_blank" rel="noopener noreferrer">X(Twitter)確認</a>
                                    {app.youtubeUrl && <a href={app.youtubeUrl} target="_blank" rel="noopener noreferrer">YouTube</a>}
                                    {app.twitchUrl && <a href={app.twitchUrl} target="_blank" rel="noopener noreferrer">Twitch</a>}
                                </div>
                                <div className="admin-actions">
                                    <button className="approve-btn" onClick={() => handleApproveApp(app.id, app.type || 'new', app.targetCreatorId, app.targetSource)}>✅ 承認して掲載</button>
                                    <button className="edit-btn" onClick={() => startEdit(app, 'pending')}>✏️ 修正する</button>
                                    <button className="delete-btn" onClick={() => handleDeleteApp(app.id)}>🗑 却下(削除)</button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </section>

            <section className="admin-section">
                <h2>📝 内容の変更依頼 ({pendingEdit.length}件)</h2>
                {pendingEdit.length === 0 ? <p>現在、変更依頼はありません。</p> : (
                    <div className="admin-card-list">
                        {pendingEdit.map(app => (
                            <div key={app.id} className="admin-card pending" style={{ borderLeftColor: '#9b59b6' }}>
                                <h3>{app.name}</h3>
                                <p style={{ color: '#2ecc71', fontSize: '0.85rem' }}>※承認すると自動的に元のカードに変更分が上書きマージされます。</p>
                                <p><strong>タグ:</strong> {app.tags || '(変更なし)'}</p>
                                <p><strong>自己紹介:</strong> {app.description || '(変更なし)'}</p>
                                <p><strong>アイコン:</strong> {app.avatarUrl || '(変更なし)'}</p>
                                <div className="admin-links">
                                    <a href={app.xUrl} target="_blank" rel="noopener noreferrer">X(Twitter)確認</a>
                                    {app.youtubeUrl && <a href={app.youtubeUrl} target="_blank" rel="noopener noreferrer">YouTube</a>}
                                    {app.twitchUrl && <a href={app.twitchUrl} target="_blank" rel="noopener noreferrer">Twitch</a>}
                                </div>
                                <div className="admin-actions">
                                    <button className="approve-btn" onClick={() => handleApproveApp(app.id, app.type, app.targetCreatorId, app.targetSource)}>✅ 承認して変更を反映</button>
                                    <button className="edit-btn" onClick={() => startEdit(app, 'pending')}>✏️ 修正する</button>
                                    <button className="delete-btn" onClick={() => handleDeleteApp(app.id)}>🗑 却下(削除)</button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </section>

            <section className="admin-section">
                <h2>🗑 掲載の削除依頼 ({pendingDelete.length}件)</h2>
                {pendingDelete.length === 0 ? <p>現在、削除依頼はありません。</p> : (
                    <div className="admin-card-list">
                        {pendingDelete.map(app => (
                            <div key={app.id} className="admin-card pending" style={{ borderLeftColor: '#e74c3c' }}>
                                <h3>{app.name}</h3>
                                <p>本人確認URL: <a href={app.xUrl} target="_blank" rel="noopener noreferrer">{app.xUrl}</a></p>
                                <p style={{ color: '#e74c3c', fontSize: '0.85rem' }}>
                                    ※承認すると自動的にデータベースから削除されます。
                                    {app.targetSource === 'json' && '（※専門欄の人のため、JSONファイルから手動で記述を削除してください）'}
                                </p>
                                <div className="admin-actions">
                                    <button className="delete-btn" onClick={() => handleApproveApp(app.id, app.type, app.targetCreatorId, app.targetSource)}>🗑 承認して削除を実行</button>
                                    <button className="cancel-btn" onClick={() => handleDeleteApp(app.id)}>❌ 却下(依頼を削除)</button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </section>

            {/* ====== 動画推薦セクション ====== */}
            <section className="admin-section">
                <h2>🎥 動画推薦 ({videos.length}件)</h2>
                {videos.length === 0 ? <p>現在、推薦された動画はありません。</p> : (
                    <div className="admin-card-list">
                        {videos.map(vid => (
                            <div key={vid.id} className="admin-card video">
                                <h3>{vid.killerName}</h3>
                                <p><strong>URL:</strong> <a href={vid.url} target="_blank" rel="noopener noreferrer">{vid.url}</a></p>
                                <p style={{ background: '#1e1e1e', padding: '0.8rem', borderRadius: '4px', marginTop: '0.5rem' }}>
                                    {vid.message || 'メッセージなし'}
                                </p>
                                <div className="admin-actions">
                                    <button className="delete-btn" onClick={() => handleDeleteVideo(vid.id)}>🗑 確認済み (削除)</button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </section>

            {/* ====== 承認済みクリエイター ====== */}
            <section className="admin-section">
                <h2>✅ 掲載中のクリエイター ({approvedApps.length}件)</h2>
                {approvedApps.length === 0 ? <p>なし</p> : (
                    <div className="admin-card-list">
                        {approvedApps.map(app => (
                            <div key={app.id} className="admin-card approved">
                                <h3>{app.name}</h3>
                                <p><strong>タグ:</strong> {app.tags}</p>
                                <p><strong>自己紹介:</strong> {app.description || 'なし'}</p>
                                <div className="admin-links">
                                    <a href={app.xUrl} target="_blank" rel="noopener noreferrer">X(Twitter)</a>
                                    {app.youtubeUrl && <a href={app.youtubeUrl} target="_blank" rel="noopener noreferrer">YouTube</a>}
                                    {app.twitchUrl && <a href={app.twitchUrl} target="_blank" rel="noopener noreferrer">Twitch</a>}
                                </div>
                                <div className="admin-actions">
                                    <button className="edit-btn" onClick={() => startEdit(app, 'approved')}>✏️ 編集する</button>
                                    <button className="delete-btn" onClick={() => handleDeleteApp(app.id)}>🗑 掲載を取り消す(削除)</button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </section>

            {/* ====== 編集モーダル ====== */}
            {editingItem && (
                <div className="admin-modal-overlay">
                    <div className="admin-modal">
                        <h2>✏️ クリエイター情報の編集 ({editingItem.type === 'pending' ? '申請データ' : '掲載データ'})</h2>
                        <form onSubmit={handleSaveEdit}>
                            <div className="form-group">
                                <label>名前</label>
                                <input 
                                    type="text" 
                                    value={editForm.name} 
                                    onChange={e => setEditForm(prev => ({ ...prev, name: e.target.value }))} 
                                    required 
                                />
                            </div>
                            <div className="form-group">
                                <label>X (Twitter) URL</label>
                                <input 
                                    type="url" 
                                    value={editForm.xUrl} 
                                    onChange={e => setEditForm(prev => ({ ...prev, xUrl: e.target.value }))} 
                                    required 
                                />
                            </div>
                            <div className="form-group">
                                <label>YouTube URL</label>
                                <input 
                                    type="url" 
                                    value={editForm.youtubeUrl} 
                                    onChange={e => setEditForm(prev => ({ ...prev, youtubeUrl: e.target.value }))} 
                                />
                            </div>
                            <div className="form-group">
                                <label>Twitch URL</label>
                                <input 
                                    type="url" 
                                    value={editForm.twitchUrl} 
                                    onChange={e => setEditForm(prev => ({ ...prev, twitchUrl: e.target.value }))} 
                                />
                            </div>
                            <div className="form-group">
                                <label>タグ (カンマ区切り)</label>
                                <input 
                                    type="text" 
                                    value={editForm.tags} 
                                    onChange={e => setEditForm(prev => ({ ...prev, tags: e.target.value }))} 
                                    placeholder="例: キラー専,ナース,解説・攻略"
                                />
                            </div>
                            <div className="form-group">
                                <label>アイコン画像URL</label>
                                <input 
                                    type="url" 
                                    value={editForm.avatarUrl} 
                                    onChange={e => setEditForm(prev => ({ ...prev, avatarUrl: e.target.value }))} 
                                />
                            </div>
                            <div className="form-group">
                                <label>自己紹介 (150文字以内)</label>
                                <textarea 
                                    value={editForm.description} 
                                    onChange={e => setEditForm(prev => ({ ...prev, description: e.target.value }))} 
                                    rows="4"
                                    maxLength="150"
                                />
                            </div>
                            <div className="admin-modal-actions">
                                <button type="button" className="cancel-btn" onClick={() => setEditingItem(null)}>キャンセル</button>
                                <button type="submit" className="approve-btn">💾 保存する</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

        </div>
    );
};

export default AdminPage;
