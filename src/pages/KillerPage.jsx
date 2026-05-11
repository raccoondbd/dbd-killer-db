import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import killers from '../data/killers.json';
import CustomYouTubePlaylist from '../components/CustomYouTubePlaylist';
import './KillerPage.css';

// Dynamically import all killer images
const killerImages = import.meta.glob('../assets/killers/*.{png,webp}', { eager: true });

const KillerPage = () => {
    const { id } = useParams();
    const killer = killers.find(k => k.id === id);
    const killerIndex = killers.findIndex(k => k.id === id);
    const prevKiller = killerIndex > 0 ? killers[killerIndex - 1] : null;
    const nextKiller = killerIndex < killers.length - 1 ? killers[killerIndex + 1] : null;
    const [visibleChunks, setVisibleChunks] = useState(1);

    if (!killer) {
        return <div className="error-message">Killer not found. <Link to="/">Return to Top</Link></div>;
    }

    const getKillerImage = (imageName) => {
        const path = `../assets/killers/${imageName}`;
        const module = killerImages[path];
        return module ? module.default : null;
    };

    const imageSrc = getKillerImage(killer.imageName);

    // Split description into blocks by double newlines
    const blocks = killer.description ? killer.description.split('\n\n') : [];
    // Group blocks into chunks of 3
    const chunks = [];
    for (let i = 0; i < blocks.length; i += 3) {
        chunks.push(blocks.slice(i, i + 3).join('\n\n'));
    }

    return (
        <div className="killer-page">
            <nav className="breadcrumb">
                <Link to="/" className="back-link">&larr; Top Page</Link>
            </nav>

            <header className="killer-header">
                <h1>{killer.displayName}</h1>

                <div className="killer-main-content">
                    {imageSrc && (
                        <img src={imageSrc} alt={killer.displayName} className="detail-icon" />
                    )}
                    <div className="killer-description-container">
                        {chunks.map((chunk, index) => (
                            <div 
                                key={index} 
                                className={`description-chunk ${index < visibleChunks ? 'visible' : 'hidden'}`}
                            >
                                <p className="description-text">{chunk}</p>
                            </div>
                        ))}
                    </div>
                </div>

                {visibleChunks < chunks.length ? (
                    <button
                        className="description-toggle"
                        onClick={() => setVisibleChunks(visibleChunks + 1)}
                    >
                        続きを読む ({visibleChunks}/{chunks.length})
                    </button>
                ) : chunks.length > 1 && (
                    <button
                        className="description-toggle"
                        onClick={() => setVisibleChunks(1)}
                    >
                        閉じる
                    </button>
                )}
            </header>

            {killer.youtubePlaylistId && (
                <section className="content-section">
                    <h2>解説・攻略動画</h2>
                    <CustomYouTubePlaylist playlistId={killer.youtubePlaylistId} title="解説・攻略動画" />
                    <div className="playlist-link-wrapper">
                        <a href={`https://www.youtube.com/playlist?list=${killer.youtubePlaylistId.split('&')[0]}`} target="_blank" rel="noopener noreferrer" className="playlist-external-link">
                            ▶ YouTubeで再生リストを開く
                        </a>
                    </div>
                </section>
            )}

            {killer.montagePlaylistId && (
                <section className="content-section">
                    <h2>MONTAGE</h2>
                    <CustomYouTubePlaylist playlistId={killer.montagePlaylistId} title="Montage" />
                    <div className="playlist-link-wrapper">
                        <a href={`https://www.youtube.com/playlist?list=${killer.montagePlaylistId.split('&')[0]}`} target="_blank" rel="noopener noreferrer" className="playlist-external-link">
                            ▶ YouTubeで再生リストを開く
                        </a>
                    </div>
                </section>
            )}

            {killer.enjoyPlaylistId && (
                <section className="content-section">
                    <h2>エンジョイ</h2>
                    <CustomYouTubePlaylist playlistId={killer.enjoyPlaylistId} title="エンジョイ" />
                    <div className="playlist-link-wrapper">
                        <a href={`https://www.youtube.com/playlist?list=${killer.enjoyPlaylistId.split('&')[0]}`} target="_blank" rel="noopener noreferrer" className="playlist-external-link">
                            ▶ YouTubeで再生リストを開く
                        </a>
                    </div>
                </section>
            )}

            {killer.specialists && killer.specialists.length > 0 && (
                <section className="content-section">
                    <h2>スペシャリスト</h2>
                    <ul className="specialist-list">
                        {killer.specialists.map((player, index) => (
                            <li key={index} className="specialist-item">
                                <a href={player.url} target="_blank" rel="noopener noreferrer" className="specialist-link" title="外部サイトを開きます">
                                    {player.name} <span className="external-link-icon">↗</span>
                                </a>
                            </li>
                        ))}
                    </ul>
                </section>
            )}
            
            {killer.otherLinks && killer.otherLinks.length > 0 && (
                <section className="content-section">
                    <h2>その他の情報</h2>
                    <p className="section-note">※外部の解説サイト・ドキュメントへ遷移します</p>
                    <ul className="specialist-list">
                        {killer.otherLinks.map((link, index) => (
                            <li key={index} className="specialist-item">
                                <a href={link.url} target="_blank" rel="noopener noreferrer" className="specialist-link" title="外部サイトを開きます">
                                    {link.label} <span className="external-link-icon">↗</span>
                                </a>
                            </li>
                        ))}
                    </ul>
                </section>
            )}

            <div style={{ marginTop: '3rem', padding: '1.5rem', background: 'var(--color-surface)', borderRadius: '8px', textAlign: 'center' }}>
                <p>※ 参考になる・有益な動画があれば、ぜひ教えてください。内容は随時更新していきます。</p>
            </div>

            <nav className="killer-nav">
                {prevKiller ? (
                    <Link to={`/killer/${prevKiller.id}`} className="killer-nav-btn killer-nav-prev">
                        <span className="killer-nav-arrow">←</span>
                        <span className="killer-nav-name">{prevKiller.displayName}</span>
                    </Link>
                ) : <div />}
                {nextKiller ? (
                    <Link to={`/killer/${nextKiller.id}`} className="killer-nav-btn killer-nav-next">
                        <span className="killer-nav-name">{nextKiller.displayName}</span>
                        <span className="killer-nav-arrow">→</span>
                    </Link>
                ) : <div />}
            </nav>
        </div>
    );
};

export default KillerPage;
