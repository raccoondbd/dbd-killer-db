import React, { useState, useEffect } from 'react';
import { collection, addDoc, getDocs, query, where, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import creators from '../data/creators.json';
import killers from '../data/killers.json';
import './CreatorApplicationForm.css';

const CreatorApplicationForm = ({ onClose }) => {
    const [requestType, setRequestType] = useState('new'); // new, edit, delete
    const [allCreators, setAllCreators] = useState([]);
    const [selectedCreatorId, setSelectedCreatorId] = useState('');

    const [formData, setFormData] = useState({
        name: '',
        tags: [],
        xUrl: '',
        youtubeUrl: '',
        twitchUrl: '',
        description: '',
        avatarUrl: ''
    });
    
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isComplete, setIsComplete] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');

    // クリエイター一覧をロード
    useEffect(() => {
        const fetchCreators = async () => {
            try {
                // Firebaseから承認済みのクリエイターを取得
                const q = query(collection(db, 'creatorApplications'), where('status', '==', 'approved'));
                const snapshot = await getDocs(q);
                const fbCreators = snapshot.docs.map(doc => ({
                    id: doc.id,
                    name: doc.data().name,
                    xUrl: doc.data().xUrl || '',
                    youtubeUrl: doc.data().youtubeUrl || '',
                    twitchUrl: doc.data().twitchUrl || '',
                    tags: doc.data().tags ? doc.data().tags.split(',') : [],
                    description: doc.data().description || '',
                    avatarUrl: doc.data().avatarUrl || '',
                    source: 'firebase'
                }));

                const jsonCreators = creators.map((c, index) => ({
                    id: `json-${index}`,
                    name: c.name,
                    xUrl: c.sns?.x || '',
                    youtubeUrl: c.sns?.youtube || '',
                    twitchUrl: c.sns?.twitch || '',
                    tags: c.tags || [],
                    description: c.description || '',
                    avatarUrl: c.avatarUrl || '',
                    source: 'json'
                }));

                setAllCreators([...jsonCreators, ...fbCreators]);
            } catch (e) {
                console.error("Error loading creators:", e);
            }
        };
        fetchCreators();
    }, []);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleTagChange = (e) => {
        const { value, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            tags: checked ? [...prev.tags, value] : prev.tags.filter(t => t !== value)
        }));
    };

    const selectedCreator = allCreators.find(c => c.id === selectedCreatorId);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setErrorMsg('');

        if (requestType !== 'new' && !selectedCreatorId) {
            setErrorMsg('対象のクリエイターを選択してください。');
            return;
        }

        if (!formData.name.trim() || !formData.xUrl.trim()) {
            setErrorMsg('必須項目を入力してください。');
            return;
        }

        if (requestType === 'new' && formData.tags.length === 0) {
            setErrorMsg('タグまたはメイン使用キラーを1つ以上選択してください。');
            return;
        }

        if (!formData.xUrl.includes('x.com/') && !formData.xUrl.includes('twitter.com/')) {
            setErrorMsg('X(Twitter)のURLが正しくありません。');
            return;
        }

        // 🚨 YouTube URLのチェック
        if (formData.youtubeUrl.trim() && !formData.youtubeUrl.includes('youtube.com/') && !formData.youtubeUrl.includes('youtu.be/')) {
            setErrorMsg('YouTubeのURLが正しくありません。');
            return;
        }

        // 🚨 Twitch URLのチェック
        if (formData.twitchUrl.trim() && !formData.twitchUrl.includes('twitch.tv/')) {
            setErrorMsg('TwitchのURLが正しくありません。');
            return;
        }

        // 🚨 アバターURLのスキーマチェック（http/httpsのみ許可。javascript:などのXSS対策）
        if (formData.avatarUrl.trim() && !/^https?:\/\//i.test(formData.avatarUrl.trim())) {
            setErrorMsg('アイコン画像URLは「http://」または「https://」で始まる必要があります。');
            return;
        }

        // 1日の申請制限
        const today = new Date().toLocaleDateString();
        const dailyAppCountStr = localStorage.getItem('dailyAppCount');
        let dailyAppCount = dailyAppCountStr ? JSON.parse(dailyAppCountStr) : { date: today, count: 0 };
        
        if (dailyAppCount.date !== today) {
            dailyAppCount = { date: today, count: 0 };
        }

        if (dailyAppCount.count >= 10) {
            setErrorMsg("1日の申請上限に達しました。");
            return;
        }

        setIsSubmitting(true);
        try {
            await addDoc(collection(db, 'creatorApplications'), {
                type: requestType,
                targetCreatorId: requestType === 'new' ? '' : selectedCreatorId,
                targetSource: requestType === 'new' ? '' : (selectedCreator?.source || ''),
                name: formData.name,
                tags: requestType === 'delete' ? '' : formData.tags.join(','),
                xUrl: formData.xUrl,
                youtubeUrl: requestType === 'delete' ? '' : formData.youtubeUrl,
                twitchUrl: requestType === 'delete' ? '' : formData.twitchUrl,
                description: requestType === 'delete' ? '' : formData.description,
                avatarUrl: requestType === 'delete' ? '' : formData.avatarUrl,
                status: 'pending',
                createdAt: serverTimestamp()
            });
            
            dailyAppCount.count += 1;
            localStorage.setItem('dailyAppCount', JSON.stringify(dailyAppCount));
            
            setIsComplete(true);
        } catch (error) {
            console.error("Error submitting application: ", error);
            setErrorMsg("送信に失敗しました。時間をおいて再度お試しください。");
        }
        setIsSubmitting(false);
    };

    return (
        <div className="creator-app-modal-overlay">
            {isComplete ? (
                <div className="creator-app-modal success">
                    <h3>✅ 申請を受け付けました！</h3>
                    <p>
                        ご登録ありがとうございます。<br/>
                        なりすまし防止のため、入力いただいたX(Twitter)アカウントへ<br/>
                        <b>DMにて簡単なご本人確認</b>を行わせていただく場合がございます。
                    </p>
                    <button className="close-btn" onClick={onClose}>閉じる</button>
                </div>
            ) : (
                <div className="creator-app-modal">
                    <div className="modal-header">
                        <h2>クリエイター名鑑 申請</h2>
                        <button className="close-icon-btn" onClick={onClose} title="閉じる">×</button>
                    </div>
                    
                    <div style={{ marginBottom: '1.5rem', display: 'flex', gap: '1rem', background: 'rgba(255,255,255,0.05)', padding: '0.8rem', borderRadius: '8px' }}>
                        <label style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            <input type="radio" name="reqType" value="new" checked={requestType === 'new'} onChange={() => { setRequestType('new'); setSelectedCreatorId(''); }} /> 新規掲載
                        </label>
                        <label style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            <input type="radio" name="reqType" value="edit" checked={requestType === 'edit'} onChange={() => setRequestType('edit')} /> 内容の変更
                        </label>
                        <label style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            <input type="radio" name="reqType" value="delete" checked={requestType === 'delete'} onChange={() => setRequestType('delete')} /> 掲載の削除
                        </label>
                    </div>

                    <p className="modal-desc" style={{ marginBottom: '1.5rem' }}>
                        {requestType === 'new' && '当サイトの「クリエイター名鑑」への掲載を申請できます。'}
                        {requestType === 'edit' && '変更したい項目のみ新しい内容を入力して送信してください。'}
                        {requestType === 'delete' && '掲載の取り下げ（削除）を申請します。本人確認のためX(Twitter)のURLが必要です。'}
                        <br/>※なりすまし防止のため、ご本人のX(Twitter)アカウントURLが必須となります。
                    </p>

                    <form className="creator-app-form" onSubmit={handleSubmit}>
                        {requestType !== 'new' && (
                            <div className="form-group">
                                <label>対象のクリエイター <span className="req">必須</span></label>
                                <select 
                                    value={selectedCreatorId} 
                                    onChange={(e) => {
                                        const cid = e.target.value;
                                        setSelectedCreatorId(cid);
                                        const creator = allCreators.find(c => c.id === cid);
                                        if (creator) {
                                            setFormData({
                                                name: creator.name || '',
                                                tags: creator.tags || [],
                                                xUrl: creator.xUrl || '',
                                                youtubeUrl: creator.youtubeUrl || '',
                                                twitchUrl: creator.twitchUrl || '',
                                                description: creator.description || '',
                                                avatarUrl: creator.avatarUrl || ''
                                            });
                                        }
                                    }} 
                                    required
                                >
                                    <option value="">-- 選択してください --</option>
                                    {allCreators.map(c => (
                                        <option key={c.id} value={c.id}>
                                            {c.name}{c.source === 'json' ? ' (専門)' : ''}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {selectedCreator?.source === 'json' && requestType === 'edit' && (
                            <div style={{ padding: '1rem', background: 'rgba(231, 76, 60, 0.15)', borderLeft: '4px solid #e74c3c', borderRadius: '6px', fontSize: '0.85rem', color: '#f39c12', marginBottom: '1.5rem', lineHeight: '1.5' }}>
                                <p style={{ margin: 0, fontWeight: 'bold' }}>
                                    ※専門欄のクリエイター様へ：システムの都合上、内容の変更をご希望の場合は『新規掲載』より新しい内容で再申請をお願いいたします。確認後、古いカードと入れ替えさせていただきます。
                                </p>
                            </div>
                        )}

                        {/* JSONソースかつ変更申請の場合は、フォーム入力を無効化 */}
                        {!(selectedCreator?.source === 'json' && requestType === 'edit') && (
                            <>
                                <div className="form-group">
                                    <label>クリエイター名 <span className="req">必須</span></label>
                                    <input type="text" name="name" value={formData.name} onChange={handleChange} placeholder="例: らこん" maxLength="30" required />
                                </div>

                                <div className="form-group">
                                    <label>X (Twitter) のURL <span className="req">必須</span></label>
                                    <input type="url" name="xUrl" value={formData.xUrl} onChange={handleChange} placeholder="例: https://x.com/..." required />
                                    <span className="help-text">※本人確認のDMをお送りする場合があります。</span>
                                </div>

                                {requestType !== 'delete' && (
                                    <>
                                        <div className="form-group">
                                            <label>YouTube チャンネルURL <span className="opt">任意</span></label>
                                            <input type="url" name="youtubeUrl" value={formData.youtubeUrl} onChange={handleChange} placeholder="例: https://youtube.com/..." />
                                        </div>

                                        <div className="form-group">
                                            <label>Twitch チャンネルURL <span className="opt">任意</span></label>
                                            <input type="url" name="twitchUrl" value={formData.twitchUrl} onChange={handleChange} placeholder="例: https://twitch.tv/..." />
                                        </div>

                                        <div className="form-group">
                                            <label>タグ</label>
                                            {requestType === 'new' ? (
                                                <span className="help-text" style={{ color: '#f39c12', fontSize: '0.8rem', marginTop: '-0.3rem' }}>
                                                    ※1つ以上選択してください（複数選択可）。
                                                </span>
                                            ) : (
                                                <span className="help-text" style={{ fontSize: '0.8rem', marginTop: '-0.3rem' }}>
                                                    ※変更する場合のみ選択してください。
                                                </span>
                                            )}
                                            
                                            <div className="tag-category-section">
                                                <h4 className="tag-category-title">🎮 プレイ陣営・比率</h4>
                                                <div className="tag-options-grid">
                                                    {['キラー専', 'サバイバー専', '両陣営', 'キラー多め', 'サバイバー多め'].map(tag => (
                                                        <label key={tag} className="tag-checkbox">
                                                            <input type="checkbox" value={tag} checked={formData.tags.includes(tag)} onChange={handleTagChange} />
                                                            <span>{tag}</span>
                                                        </label>
                                                    ))}
                                                </div>
                                            </div>

                                            <div className="tag-category-section">
                                                <h4 className="tag-category-title">📺 活動内容</h4>
                                                <div className="tag-options-grid">
                                                    {['配信', '動画投稿', '解説・攻略', 'ネタ・おもしろ'].map(tag => (
                                                        <label key={tag} className="tag-checkbox">
                                                            <input type="checkbox" value={tag} checked={formData.tags.includes(tag)} onChange={handleTagChange} />
                                                            <span>{tag}</span>
                                                        </label>
                                                    ))}
                                                </div>
                                            </div>

                                            <div className="tag-category-section">
                                                <h4 className="tag-category-title">✨ プレイスタイル</h4>
                                                <div className="tag-options-grid">
                                                    {['エンジョイ勢', 'ガチ勢', '大会勢', '初心者歓迎'].map(tag => (
                                                        <label key={tag} className="tag-checkbox">
                                                            <input type="checkbox" value={tag} checked={formData.tags.includes(tag)} onChange={handleTagChange} />
                                                            <span>{tag}</span>
                                                        </label>
                                                    ))}
                                                </div>
                                            </div>

                                            <div className="tag-category-section">
                                                <h4 className="tag-category-title">💀 メイン使用キラー</h4>
                                                <div className="tag-options-grid killer-tag-grid">
                                                    {killers.map(k => (
                                                        <label key={k.id} className="tag-checkbox">
                                                            <input type="checkbox" value={k.displayName} checked={formData.tags.includes(k.displayName)} onChange={handleTagChange} />
                                                            <span>{k.displayName}</span>
                                                        </label>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="form-group">
                                            <label>アイコン画像のURL {requestType === 'new' ? <span className="opt">任意</span> : <span className="opt">変更する場合のみ</span>}</label>
                                            <p style={{ fontSize: '0.8rem', color: '#888', margin: '-0.3rem 0 0.5rem 0' }}>ご自身のXやYouTubeのアイコンを右クリックし「画像アドレスをコピー」して貼り付けてください。</p>
                                            <input type="url" name="avatarUrl" value={formData.avatarUrl} onChange={handleChange} placeholder="https://..." />
                                        </div>

                                        <div className="form-group">
                                            <label>自己紹介・アピールポイント {requestType === 'new' ? <span className="req">必須</span> : <span className="opt">変更する場合のみ</span>}</label>
                                            <textarea name="description" value={formData.description} onChange={handleChange} placeholder="どんなキラーを使っているか、どんな配信をしているかなど教えてください！（150文字以内）" rows="3" maxLength="150" required={requestType === 'new'} />
                                        </div>
                                    </>
                                )}
                            </>
                        )}

                        {errorMsg && <p className="error-msg">{errorMsg}</p>}

                        <div className="form-actions">
                            <button type="button" className="cancel-btn" onClick={onClose} disabled={isSubmitting}>キャンセル</button>
                            <button 
                                type="submit" 
                                className="submit-btn" 
                                disabled={isSubmitting || (selectedCreator?.source === 'json' && requestType === 'edit')}
                            >
                                {isSubmitting ? '送信中...' : '送信する'}
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
};

export default CreatorApplicationForm;
