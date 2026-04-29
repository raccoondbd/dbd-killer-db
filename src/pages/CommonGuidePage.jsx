import React from 'react';
import { useParams, Link } from 'react-router-dom';
import CustomYouTubePlaylist from '../components/CustomYouTubePlaylist';
import './KillerPage.css';

const CommonGuidePage = () => {
    const { type } = useParams();

    const title = type === 'killer' ? 'キラー共通技術' : 'サバイバー共通技術';
    const content = type === 'killer'
        ? 'キラー共通'
        : 'サバイバー共通';

    const playlistId = type === 'killer'
        ? 'PLp1FBdXwpJDUif8o9bqOnUxyWR202AJDa&pp=0gcJCbUEOCosWNinsAgC'
        : 'PLp1FBdXwpJDVaKNwMJVndcKdI64S5B82s&pp=sAgC';

    return (
        <div className="common-page" style={{ padding: '2rem', maxWidth: '1000px', margin: '0 auto' }}>
            <Link to="/" style={{ color: 'var(--color-primary)' }}>&larr; Top Page</Link>
            <h1 style={{ marginTop: '1rem', marginBottom: '2rem' }}>{title}</h1>
            <p style={{ marginTop: '1rem', whiteSpace: 'pre-wrap', marginBottom: '2rem' }}>{content}</p>

            <section className="content-section">
                <h2>解説・攻略動画</h2>
                <CustomYouTubePlaylist playlistId={playlistId} title={`${title} 解説動画`} />
                <div className="playlist-link-wrapper">
                    <a href={`https://www.youtube.com/playlist?list=${playlistId.split('&')[0]}`} target="_blank" rel="noopener noreferrer" className="playlist-external-link">
                        ▶ YouTubeで再生リストを開く
                    </a>
                </div>
            </section>

            <div style={{ marginTop: '2rem', padding: '1rem', background: 'var(--color-surface)', borderRadius: '8px' }}>
                <p>※ 参考になる・有益な動画があれば、ぜひ教えてください。内容は随時更新していきます。</p>
            </div>
        </div>
    );
};

export default CommonGuidePage;
