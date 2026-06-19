import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import creators from '../data/creators.json';
import killers from '../data/killers.json';
import CreatorApplicationForm from '../components/CreatorApplicationForm';
import './CreatorsPage.css';

const FIXED_TAGS = [
    { label: '専門', color: 'tag-pro' },
    { label: 'キラー専', color: 'tag-killer' },
    { label: 'サバイバー専', color: 'tag-survivor' },
    { label: '両陣営', color: 'tag-both' },
    { label: 'キラー多め', color: 'tag-killer-leaning' },
    { label: 'サバイバー多め', color: 'tag-surv-leaning' },
    { label: '配信', color: 'tag-stream' },
    { label: '動画投稿', color: 'tag-youtube' },
    { label: '解説・攻略', color: 'tag-guide' },
    { label: 'ネタ・おもしろ', color: 'tag-enjoy' },
    { label: 'エンジョイ勢', color: 'tag-enjoy' },
    { label: 'ガチ勢', color: 'tag-pro' },
    { label: '大会勢', color: 'tag-pro' },
    { label: '初心者歓迎', color: 'tag-guide' },
];

const FIXED_TAG_COLOR_MAP = Object.fromEntries(FIXED_TAGS.map(t => [t.label, t.color]));

const getTagColor = (tag) => FIXED_TAG_COLOR_MAP[tag] || 'tag-killer-name';

const SNS_ICONS = {
    youtube: { icon: '▶', label: 'YouTube', class: 'sns-youtube' },
    x: { icon: '𝕏', label: 'X (Twitter)', class: 'sns-x' },
    twitch: { icon: '◈', label: 'Twitch', class: 'sns-twitch' },
    niconico: { icon: 'Nico', label: 'ニコニコ', class: 'sns-nico' },
    tiktok: { icon: '♪', label: 'TikTok', class: 'sns-tiktok' },
};

const CreatorsPage = () => {
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedTags, setSelectedTags] = useState([]);
    const [showKillerTags, setShowKillerTags] = useState(false);
    const [isAppModalOpen, setIsAppModalOpen] = useState(false);
    const [firebaseCreators, setFirebaseCreators] = useState([]);
    const [sortBy, setSortBy] = useState('default'); // 'default' (初期値/古い順), 'newest' (新着順), 'name' (50音順)
    const [isSortOpen, setIsSortOpen] = useState(false);

    const [isSpecialistsOpen, setIsSpecialistsOpen] = useState(false);
    const sortWrapperRef = useRef(null);
    const filterSectionRef = useRef(null);
    const specialistsSectionRef = useRef(null);
    const firebaseCreatorsRef = useRef(null);

    // スペシャリストのトグルハンドラー（折りたたんだ際に位置調整）
    const handleSpecialistsToggle = () => {
        setIsSpecialistsOpen(prev => {
            const next = !prev;
            if (!next) {
                // 折りたたむ瞬間に、折りたたまれたボタンが画面の上の方（上端から約250px下）に見えるようにスクロール
                setTimeout(() => {
                    if (specialistsSectionRef.current) {
                        const elementPosition = specialistsSectionRef.current.getBoundingClientRect().top + window.pageYOffset;
                        // 折りたたまれた状態でのボタン位置（セクション上端から約520px下）が
                        // 画面の上端から約270px下に見えるように、スクロール位置を調整
                        const offsetPosition = elementPosition + 250;
                        
                        window.scrollTo({
                            top: offsetPosition,
                            behavior: 'smooth'
                        });
                    }
                }, 100);
            }
            return next;
        });
    };

    // ドロップダウンの外側をクリックした時に閉じる
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (sortWrapperRef.current && !sortWrapperRef.current.contains(event.target)) {
                setIsSortOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        const fetchApprovedCreators = async () => {
            try {
                const q = query(collection(db, 'creatorApplications'), where('status', '==', 'approved'));
                const snapshot = await getDocs(q);
                const loaded = snapshot.docs.map(doc => {
                    const data = doc.data();
                    const tagsArray = data.tags ? data.tags.split(',').map(t => t.trim()).filter(Boolean) : [];
                    const sns = {};
                    if (data.xUrl) sns.x = data.xUrl;
                    if (data.youtubeUrl) sns.youtube = data.youtubeUrl;
                    if (data.twitchUrl) sns.twitch = data.twitchUrl;

                    return {
                        id: doc.id,
                        name: data.name,
                        description: data.description,
                        tags: tagsArray,
                        sns: sns,
                        avatarUrl: data.avatarUrl || '',
                        isSpecialist: data.isSpecialist || false,
                        createdAt: data.createdAt ? data.createdAt.toDate() : new Date()
                    };
                });
                setFirebaseCreators(loaded);
            } catch (error) {
                console.error("Error fetching approved creators:", error);
            }
        };
        fetchApprovedCreators();
    }, []);

    const filteredJson = useMemo(() => {
        return creators.filter(creator => {
            const matchesName = creator.name.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesTags =
                selectedTags.length === 0 ||
                selectedTags.every(tag => creator.tags.includes(tag));
            return matchesName && matchesTags;
        });
    }, [searchQuery, selectedTags]);

    const filteredFirebase = useMemo(() => {
        let list = firebaseCreators.filter(creator => {
            const matchesName = creator.name.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesTags =
                selectedTags.length === 0 ||
                selectedTags.every(tag => creator.tags.includes(tag));
            return matchesName && matchesTags;
        });

        if (sortBy === 'name') {
            list = [...list].sort((a, b) => a.name.localeCompare(b.name, 'ja'));
        } else if (sortBy === 'newest') {
            list = [...list].sort((a, b) => b.createdAt - a.createdAt); // 新着順（新しい順）
        } else {
            list = [...list].sort((a, b) => a.createdAt - b.createdAt); // デフォルト（古い順）
        }

        // 「らこん」を常に最後尾に配置する
        const raconIndex = list.findIndex(c => c.name.includes('らこん'));
        if (raconIndex !== -1) {
            const [racon] = list.splice(raconIndex, 1);
            list.push(racon);
        }

        return list;
    }, [searchQuery, selectedTags, firebaseCreators, sortBy]);

    const allCreators = useMemo(() => [...creators, ...firebaseCreators], [firebaseCreators]);
    const totalVisible = filteredJson.length + filteredFirebase.length;

    const toggleTag = (tag) => {
        setSelectedTags(prev =>
            prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
        );
    };

    // データに存在するタグを固定タグとキラー名タグに分ける
    const usedTagSet = useMemo(() => new Set(allCreators.flatMap(c => c.tags)), [allCreators]);
    const usedFixedTags = FIXED_TAGS.filter(t => usedTagSet.has(t.label));
    const killerNameTags = [...usedTagSet].filter(t => {
        if (FIXED_TAG_COLOR_MAP[t]) return false;
        // killers.jsonに登録されているキラー名を含むタグのみをキラー名タグとする
        return killers.some(k => t.includes(k.displayName));
    }).sort((a, b) => {
        const getKillerIndex = (tag) => {
            const index = killers.findIndex(k => tag.includes(k.displayName));
            return index === -1 ? 999 : index;
        };
        const indexA = getKillerIndex(a);
        const indexB = getKillerIndex(b);
        if (indexA !== indexB) {
            return indexA - indexB;
        }
        return a.localeCompare(b);
    });

    return (
        <div className="creators-page">
            <header className="creators-hero">
                <Link to="/" className="back-link creators-back">← トップへ戻る</Link>
                <h1 className="creators-title">DBDクリエイター名鑑</h1>
                <p className="creators-subtitle">
                    DBDをコンテンツとして活動するプレイヤー・クリエイターの紹介ページです。
                </p>
                <button className="apply-creator-btn" onClick={() => setIsAppModalOpen(true)}>
                    ✍️ クリエイターとして掲載申請する
                </button>
            </header>

            {isAppModalOpen && <CreatorApplicationForm onClose={() => setIsAppModalOpen(false)} />}

            {/* 検索 & フィルター */}
            <section ref={filterSectionRef} className="creators-filter-section">
                <div className="creators-filter-controls">
                    <div className="creators-search-wrapper">
                        <span className="search-icon">🔍</span>
                        <input
                            id="creator-search"
                            type="text"
                            className="creators-search"
                            placeholder="名前で検索..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                        />
                        {searchQuery && (
                            <button className="search-clear" onClick={() => setSearchQuery('')} aria-label="検索をクリア">✕</button>
                        )}
                    </div>

                    <div className="creators-sort-container" ref={sortWrapperRef}>
                        <span className="sort-label">並び替え：</span>
                        <div className={`custom-sort-dropdown ${isSortOpen ? 'open' : ''}`}>
                            <button 
                                type="button"
                                className="sort-dropdown-toggle"
                                onClick={() => setIsSortOpen(prev => !prev)}
                            >
                                <span>
                                    {sortBy === 'default' && 'デフォルト'}
                                    {sortBy === 'newest' && '新着順'}
                                    {sortBy === 'name' && '50音順 (簡易)'}
                                </span>
                                <span className="dropdown-arrow">▼</span>
                            </button>
                            {isSortOpen && (
                                <ul className="sort-dropdown-menu">
                                    <li 
                                        className={sortBy === 'default' ? 'active' : ''}
                                        onClick={() => { setSortBy('default'); setIsSortOpen(false); }}
                                    >
                                        デフォルト
                                    </li>
                                    <li 
                                        className={sortBy === 'newest' ? 'active' : ''}
                                        onClick={() => { setSortBy('newest'); setIsSortOpen(false); }}
                                    >
                                        新着順
                                    </li>
                                    <li 
                                        className={sortBy === 'name' ? 'active' : ''}
                                        onClick={() => { setSortBy('name'); setIsSortOpen(false); }}
                                    >
                                        50音順 (簡易)
                                    </li>
                                </ul>
                            )}
                        </div>
                    </div>
                </div>

                <div className="tag-filter-area">
                    <span className="tag-filter-label">タグで絞り込み：</span>
                    <div className="tag-filter-list">
                        {FIXED_TAGS.map(tag => (
                            <button
                                key={tag.label}
                                className={`tag-chip ${tag.color} ${selectedTags.includes(tag.label) ? 'active' : ''}`}
                                onClick={() => toggleTag(tag.label)}
                            >
                                {tag.label}
                            </button>
                        ))}
                        <button
                            className={`tag-chip tag-killer-name ${showKillerTags ? 'active' : ''}`}
                            onClick={() => setShowKillerTags(p => !p)}
                        >
                            キラー名 {showKillerTags ? '▲' : '▼'}
                        </button>
                        {selectedTags.length > 0 && (
                            <button className="tag-chip tag-clear" onClick={() => setSelectedTags([])}>
                                リセット ✕
                            </button>
                        )}
                    </div>
                </div>

                {showKillerTags && (
                    <div className="tag-filter-list killer-name-tags">
                        {killerNameTags.map(tag => (
                            <button
                                key={tag}
                                className={`tag-chip tag-killer-name ${selectedTags.includes(tag) ? 'active' : ''}`}
                                onClick={() => toggleTag(tag)}
                            >
                                {tag}
                            </button>
                        ))}
                    </div>
                )}

                <div className="creators-count">
                    {totalVisible} 件表示中 / 全 {allCreators.length} 件
                </div>
            </section>

            {totalVisible === 0 ? (
                <div className="creators-empty">
                    <p>条件に一致するクリエイターが見つかりませんでした。</p>
                    <button className="tag-chip tag-clear" onClick={() => { setSearchQuery(''); setSelectedTags([]); }}>
                        検索条件をクリア
                    </button>
                </div>
            ) : (
                <>
                    {filteredJson.length > 0 && (
                        <div ref={specialistsSectionRef} className="specialists-section">
                            <div className={`specialists-wrapper ${isSpecialistsOpen ? 'expanded' : 'collapsed'}`}>
                                <div className="creators-grid">
                                    {filteredJson.map(creator => (
                                        <CreatorCard key={creator.id} creator={creator} />
                                    ))}
                                </div>
                                {filteredJson.length > 6 && !isSpecialistsOpen && (
                                    <div className="specialists-fade-overlay" />
                                )}
                            </div>
                            {filteredJson.length > 6 && (
                                <div className="specialists-action-area">
                                    <button 
                                        type="button" 
                                        className="specialists-toggle-trigger-btn"
                                        onClick={handleSpecialistsToggle}
                                    >
                                        {isSpecialistsOpen ? '▲ スペシャリストを折りたたむ' : `▼ すべてのスペシャリストを表示する (${filteredJson.length})`}
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    {filteredFirebase.length > 0 && (
                        <div ref={firebaseCreatorsRef} className="creators-grid">
                            {filteredFirebase.map(creator => (
                                <CreatorCard key={creator.id} creator={creator} />
                            ))}
                        </div>
                    )}
                </>
            )}

            <footer className="creators-footer">
                <p>
                </p>
            </footer>
        </div>
    );
};

const CreatorCard = ({ creator }) => {
    const [expanded, setExpanded] = useState(false);
    const [tagsExpanded, setTagsExpanded] = useState(false);
    const [avatarError, setAvatarError] = useState(false);
    const isLong = creator.description && creator.description.length > 80;

    // アバターURLが変わったらエラー状態をリセット
    useEffect(() => {
        setAvatarError(false);
    }, [creator.avatarUrl]);

    return (
        <article className="creator-card">
            <div className="creator-card-inner">
                <div className="creator-card-header">
                    <div className="creator-avatar">
                        {creator.avatarUrl && !avatarError ? (
                            <img
                                src={creator.avatarUrl}
                                alt={creator.name}
                                className="creator-avatar-img"
                                onError={() => setAvatarError(true)}
                            />
                        ) : (
                            <span className="creator-avatar-initial">{creator.name.charAt(0)}</span>
                        )}
                    </div>
                    <div className="creator-name-area">
                        <h2 className="creator-name">{creator.name}</h2>
                        <div className="creator-tags">
                            {(creator.tags.length <= 8 || tagsExpanded 
                                ? creator.tags 
                                : creator.tags.slice(0, 6)
                            ).map(tag => (
                                <span key={tag} className={`tag-badge ${getTagColor(tag)}`}>
                                    {tag}
                                </span>
                            ))}
                            {creator.tags.length > 8 && (
                                <button 
                                    type="button" 
                                    className="tag-toggle-btn"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        setTagsExpanded(!tagsExpanded);
                                    }}
                                >
                                    {tagsExpanded ? '閉じる ▲' : `+他${creator.tags.length - 6}件`}
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {creator.description && (
                    <div className={`creator-description ${!expanded && isLong ? 'collapsed' : ''}`}>
                        <p>{creator.description}</p>
                        {isLong && (
                            <button className="desc-toggle" onClick={() => setExpanded(p => !p)}>
                                {expanded ? '折りたたむ ▲' : 'もっと見る ▼'}
                            </button>
                        )}
                    </div>
                )}

                {creator.sns && Object.keys(creator.sns).length > 0 && (
                    <div className="creator-sns">
                        {Object.entries(creator.sns).map(([platform, url]) => {
                            const info = SNS_ICONS[platform];
                            if (!info || !url) return null;
                            return (
                                <a key={platform} href={url} target="_blank" rel="noopener noreferrer"
                                    className={`sns-link ${info.class}`} title={info.label}>
                                    <span className="sns-icon">{info.icon}</span>
                                    <span className="sns-label">{info.label}</span>
                                </a>
                            );
                        })}
                    </div>
                )}
            </div>
        </article>
    );
};

export default CreatorsPage;
