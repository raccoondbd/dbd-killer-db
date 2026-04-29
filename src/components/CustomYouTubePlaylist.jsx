import React, { useState, useEffect } from 'react';
import './CustomYouTubePlaylist.css';

const CustomYouTubePlaylist = ({ playlistId, title }) => {
    const [videos, setVideos] = useState([]);
    const [currentVideoId, setCurrentVideoId] = useState(null);
    const [error, setError] = useState(null);
    const [hasUserClicked, setHasUserClicked] = useState(false);

    useEffect(() => {
        const fetchPlaylist = async () => {
            const apiKey = import.meta.env.VITE_YOUTUBE_API_KEY;
            
            if (!apiKey) {
                setError('APIキーが設定されていません。');
                return;
            }

            try {
                // Fetch the playlist items
                const cleanPlaylistId = playlistId.split('&')[0];
                const response = await fetch(
                    `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&maxResults=50&playlistId=${cleanPlaylistId}&key=${apiKey}`
                );
                
                if (!response.ok) {
                    throw new Error('プレイリストの取得に失敗しました。');
                }

                const data = await response.json();
                const videoItems = data.items
                    .filter(item => item.snippet.resourceId && item.snippet.resourceId.videoId)
                    .map(item => ({
                        id: item.snippet.resourceId.videoId,
                        title: item.snippet.title,
                        thumbnail: item.snippet.thumbnails?.medium?.url || item.snippet.thumbnails?.default?.url
                    }));
                
                if (videoItems.length > 0) {
                    setVideos(videoItems);
                    setCurrentVideoId(videoItems[0].id);
                } else {
                    setError('プレイリストに動画がありません。');
                }
            } catch (err) {
                setError('YouTube APIとの通信でエラーが発生しました。');
                console.error(err);
            }
        };

        if (playlistId) {
            fetchPlaylist();
        }
    }, [playlistId]);

    if (error) {
        return (
            <div className="custom-playlist-error">
                {/* Fallback to normal iframe if API fails (e.g. while user is getting their API key) */}
                <div className="video-container">
                    <iframe
                        width="560"
                        height="315"
                        src={`https://www.youtube.com/embed/videoseries?list=${playlistId.split('&')[0]}`}
                        title={title}
                        frameBorder="0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                    ></iframe>
                </div>
            </div>
        );
    }

    if (!currentVideoId) {
        return <div className="custom-playlist-loading">読み込み中...</div>;
    }

    return (
        <div className="custom-youtube-playlist">
            <div className="video-container">
                <iframe
                    width="560"
                    height="315"
                    src={`https://www.youtube.com/embed/${currentVideoId}?autoplay=${hasUserClicked ? 1 : 0}`}
                    title={title || "YouTube video player"}
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                ></iframe>
            </div>
            
            <div className="playlist-thumbnail-list">
                {videos.map((vid, index) => (
                    <div 
                        key={`${vid.id}-${index}`} 
                        className={`thumbnail-item ${vid.id === currentVideoId ? 'active' : ''}`}
                        onClick={() => {
                            setCurrentVideoId(vid.id);
                            setHasUserClicked(true);
                        }}
                    >
                        <div className="thumbnail-wrapper">
                            <img src={vid.thumbnail} alt={vid.title} loading="lazy" />
                            {vid.id === currentVideoId && <div className="now-playing-overlay">再生中</div>}
                        </div>
                        <p className="thumbnail-title">{vid.title}</p>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default CustomYouTubePlaylist;
