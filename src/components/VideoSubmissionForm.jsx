import React, { useState, useEffect } from 'react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import './VideoSubmissionForm.css';

const VideoSubmissionForm = ({ killerId, killerName }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [url, setUrl] = useState('');
    const [message, setMessage] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isComplete, setIsComplete] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');

    // YouTubeのURL形式かどうかを厳密にチェックする関数
    const isValidYouTubeUrl = (testUrl) => {
        // youtube.com または youtu.be を含む標準的な動画URLのみ許可
        const pattern = /^(https?:\/\/)?(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/)[\w-]{11}.*$/;
        return pattern.test(testUrl);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setErrorMsg(''); // エラーのリセット
        
        const trimmedUrl = url.trim();
        if (!trimmedUrl) return;

        // 🚨 1日の送信回数制限（例: 1日3回まで）
        const today = new Date().toLocaleDateString();
        const dailyVideoDataStr = localStorage.getItem('dailyVideoCount');
        let dailyVideoData = dailyVideoDataStr ? JSON.parse(dailyVideoDataStr) : { date: today, count: 0 };
        
        if (dailyVideoData.date !== today) {
            dailyVideoData = { date: today, count: 0 };
        }

        if (dailyVideoData.count >= 20) {
            setErrorMsg("1日の動画送信上限（20回）に達しました。また明日お試しください。");
            return;
        }

        // 🚨 対策1：YouTube以外の怪しいURLを弾く
        if (!isValidYouTubeUrl(trimmedUrl)) {
            setErrorMsg('有効なYouTubeの動画URLを入力してください。');
            return;
        }

        // 🚨 対策2：スパム連投防止（連続送信の制限）
        const lastSubmitTime = localStorage.getItem('lastVideoSubmissionTime');
        if (lastSubmitTime) {
            const timeDiff = Date.now() - parseInt(lastSubmitTime, 10);
            const cooldownMs = 5000; // 5秒
            if (timeDiff < cooldownMs) {
                setErrorMsg(`連続送信はできません。少し待ってからお試しください。`);
                return;
            }
        }

        setIsSubmitting(true);
        try {
            await addDoc(collection(db, 'videoSubmissions'), {
                killerId,
                killerName,
                url: trimmedUrl,
                message: message.trim(),
                createdAt: serverTimestamp()
            });
            
            // 投稿完了時に時間を保存（スパム対策用）
            localStorage.setItem('lastVideoSubmissionTime', Date.now().toString());
            
            // 1日の送信回数をカウントアップ
            dailyVideoData.count += 1;
            localStorage.setItem('dailyVideoCount', JSON.stringify(dailyVideoData));
            
            setIsComplete(true);
            
            // 3秒後に元の状態に戻す
            setTimeout(() => {
                setIsOpen(false);
                setIsComplete(false);
                setUrl('');
                setMessage('');
            }, 3000);
        } catch (error) {
            console.error("Error submitting video: ", error);
            setErrorMsg("送信に失敗しました。時間をおいて再度お試しください。");
        }
        setIsSubmitting(false);
    };

    if (isComplete) {
        return (
            <div className="video-submission-box success">
                <p>✅ ありがとうございます！内容を確認させていただきます。</p>
            </div>
        );
    }

    if (!isOpen) {
        return (
            <div className="video-submission-box closed">
                <p>※ 参考になる・有益な動画があれば、ぜひ教えてください！</p>
                <button className="open-submission-btn" onClick={() => setIsOpen(true)}>
                    🎥 YouTubeリンクを送る
                </button>
            </div>
        );
    }

    return (
        <div className="video-submission-box open">
            <div className="submission-header">
                <h3>有益な動画を教える</h3>
                <button className="close-submission-btn" onClick={() => setIsOpen(false)}>×</button>
            </div>
            <form className="submission-form" onSubmit={handleSubmit}>
                <input 
                    type="url" 
                    className="submission-input url-input" 
                    placeholder="YouTubeのURL (必須)" 
                    value={url}
                    onChange={(e) => {
                        setUrl(e.target.value);
                        setErrorMsg('');
                    }}
                    required
                />
                <textarea 
                    className="submission-input msg-input" 
                    placeholder="おすすめの理由や解説など (任意)" 
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows="2"
                    maxLength="200"
                />
                
                {errorMsg && <p className="submission-error-msg">{errorMsg}</p>}
                
                <button type="submit" className="submission-submit-btn" disabled={isSubmitting || !url.trim()}>
                    {isSubmitting ? '送信中...' : '管理者に送信する'}
                </button>
            </form>
        </div>
    );
};

export default VideoSubmissionForm;
