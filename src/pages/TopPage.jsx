import React from 'react';
import { Link } from 'react-router-dom';
import killers from '../data/killers.json';
import updates from '../data/updates.json';
import './TopPage.css';

// Dynamically import all killer images
const killerImages = import.meta.glob('../assets/killers/*.{png,webp}', { eager: true });

const TopPage = () => {
    const getKillerImage = (imageName) => {
        const path = `../assets/killers/${imageName}`;
        const module = killerImages[path];
        return module ? module.default : null;
    };

    return (
        <div className="top-page">
            <header className="hero-section">
                <h1 className="main-title">
                    <span>DBDキラー攻略</span>
                    <span>データベース</span>
                </h1>
                <p className="subtitle">各キラーのトップレベルの知識に最短で触れられるよう、有益な動画を整理しています。</p>
                <div className="social-links-minimal">
                    <a href="https://www.youtube.com/@raccoondbd" target="_blank" rel="noopener noreferrer">YouTube</a>
                    <span className="separator">|</span>
                    <a href="https://x.com/dbdraccoon" target="_blank" rel="noopener noreferrer">X</a>
                    <span className="separator">|</span>
                    <a href="https://www.twitch.tv/rakondbd" target="_blank" rel="noopener noreferrer">Twitch</a>
                </div>
            </header>

            <section className="common-guides">
                <Link to="/common-guide/killer" className="guide-button killer-guide">
                    キラー共通技術
                </Link>
                <Link to="/common-guide/survivor" className="guide-button survivor-guide">
                    サバイバー共通技術
                </Link>
                <Link to="/creators" className="guide-button creators-guide">
                    クリエイター名鑑
                </Link>
            </section>

            <main className="killer-grid">
                {killers.map((killer) => {
                    const imageSrc = getKillerImage(killer.imageName);
                    return (
                        <Link to={`/killer/${killer.id}`} key={killer.id} className="killer-card">
                            <div className="killer-icon-wrapper">
                                {imageSrc ? (
                                    <img src={imageSrc} alt={killer.displayName} className="killer-icon" />
                                ) : (
                                    <div className="killer-icon-placeholder">No Image</div>
                                )}
                                {killer.isNew && <span className="new-badge">NEW</span>}
                                <div className="killer-name-overlay">
                                    <span className="killer-name-text">{killer.displayName}</span>
                                </div>
                            </div>
                        </Link>
                    );
                })}
            </main>

            <section className="update-info-section">
                <h2>更新情報</h2>
                <ul className="update-list">
                    {updates.slice(0, 3).map((update, index) => (
                        <li key={index}>
                            <span className="update-date">{update.date}</span>
                            {update.content}
                        </li>
                    ))}
                </ul>
            </section>
        </div>
    );
};

export default TopPage;
