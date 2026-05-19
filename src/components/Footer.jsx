import React from 'react';
import { Link } from 'react-router-dom';
import './Footer.css';

const Footer = () => {
    return (
        <footer className="app-footer">
            <div className="footer-content">
                <nav className="footer-links">
                    <Link to="/useful-sites" className="footer-link">お役立ちサイト集 🌐</Link>
                </nav>
                <p className="footer-copy">DBDキラー攻略データベース</p>
            </div>
        </footer>
    );
};

export default Footer;
