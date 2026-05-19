import React, { useState, useEffect } from 'react';
import './BackToTopButton.css';

const BackToTopButton = () => {
    const [isVisible, setIsVisible] = useState(false);

    // Show button when page is scrolled down past 300px
    const toggleVisibility = () => {
        if (window.pageYOffset > 300) {
            setIsVisible(true);
        } else {
            setIsVisible(false);
        }
    };

    // Scroll to top smoothly
    const scrollToTop = () => {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    };

    useEffect(() => {
        window.addEventListener('scroll', toggleVisibility);
        return () => {
            window.removeEventListener('scroll', toggleVisibility);
        };
    }, []);

    return (
        <button 
            type="button"
            className={`back-to-top-btn ${isVisible ? 'visible' : ''}`}
            onClick={scrollToTop}
            aria-label="ページトップへ戻る"
            title="ページトップへ戻る"
        >
            <span className="arrow-icon">▲</span>
        </button>
    );
};

export default BackToTopButton;
