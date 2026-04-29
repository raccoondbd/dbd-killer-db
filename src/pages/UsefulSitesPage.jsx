import React from 'react';
import { Link } from 'react-router-dom';
import usefulSites from '../data/usefulSites.json';
import './UsefulSitesPage.css';

const UsefulSitesPage = () => {
    return (
        <div className="useful-sites-page">
            <header className="page-header">
                <h1>お役立ちサイト集</h1>
                <p>Dead by Daylightの攻略やデータ確認に役立つおすすめのサイト一覧です。</p>
            </header>

            <div className="back-link-container">
                <Link to="/" className="back-link">← トップページに戻る</Link>
            </div>

            <div className="sites-grid">
                {usefulSites.map(site => (
                    <a key={site.id} href={site.url} target="_blank" rel="noopener noreferrer" className="site-card">
                        <div className="site-info">
                            <h2 className="site-title">{site.title}</h2>
                            <p className="site-description">{site.description}</p>
                        </div>
                        <div className="site-link-icon">
                            🔗
                        </div>
                    </a>
                ))}
            </div>
            
            <div className="back-link-container bottom">
                <Link to="/" className="back-link">← トップページに戻る</Link>
            </div>
        </div>
    );
};

export default UsefulSitesPage;
