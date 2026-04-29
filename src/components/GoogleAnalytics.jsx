import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const GA_MEASUREMENT_ID = import.meta.env.VITE_GA_MEASUREMENT_ID;

const GoogleAnalytics = () => {
    const location = useLocation();

    useEffect(() => {
        // IDが設定されていない場合（ローカルでわざと外している時など）は何もしない
        if (!GA_MEASUREMENT_ID) return;

        // <script> タグがまだ head になければ動的に追加する
        if (!document.getElementById('ga-script')) {
            const script = document.createElement('script');
            script.id = 'ga-script';
            script.async = true;
            script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
            document.head.appendChild(script);

            window.dataLayer = window.dataLayer || [];
            function gtag() { window.dataLayer.push(arguments); }
            window.gtag = gtag;
            gtag('js', new Date());
        }

        // ページ遷移（URLの切り替わり）を検知するたびにGAへページビュー（閲覧数）を送る
        window.gtag('config', GA_MEASUREMENT_ID, {
            page_path: location.pathname + location.search + location.hash
        });
    }, [location]);

    return null; // このコンポーネント自体は画面上に何も表示しない
};

export default GoogleAnalytics;
