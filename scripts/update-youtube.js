import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const API_KEY = process.env.YOUTUBE_API_KEY;
if (!API_KEY) {
    console.error('YOUTUBE_API_KEY is not set');
    process.exit(1);
}

// 過去何日以内の追加を「NEW」とするか
const NEW_THRESHOLD_DAYS = 3;
const thresholdDate = new Date();
thresholdDate.setDate(thresholdDate.getDate() - NEW_THRESHOLD_DAYS);

const killersPath = path.join(__dirname, '../src/data/killers.json');
const updatesPath = path.join(__dirname, '../src/data/updates.json');

// YouTube Data APIを叩いて最新の動画追加日を取得
async function getLatestVideoDate(playlistId) {
    if (!playlistId) return null;
    let latestDate = null;
    let pageToken = '';
    try {
        do {
            const url = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=${playlistId}&maxResults=50${pageToken ? '&pageToken=' + pageToken : ''}&key=${API_KEY}`;
            const res = await fetch(url);
            if (!res.ok) {
                console.error(`Error fetching playlist ${playlistId}: ${res.statusText}`);
                break;
            }
            const data = await res.json();
            if (data.items && data.items.length > 0) {
                for (const item of data.items) {
                    // snippet.publishedAt はプレイリストに動画が追加された日時
                    const itemDate = new Date(item.snippet.publishedAt);
                    if (!latestDate || itemDate > latestDate) {
                        latestDate = itemDate;
                    }
                }
            }
            pageToken = data.nextPageToken;
        } while (pageToken);
        return latestDate;
    } catch (e) {
        console.error(`Failed to fetch playlist ${playlistId}:`, e);
    }
    return null;
}

async function main() {
    const killersData = JSON.parse(await fs.readFile(killersPath, 'utf8'));
    let updatesData = JSON.parse(await fs.readFile(updatesPath, 'utf8'));
    let hasChanges = false;
    
    // 今日の日付を YYYY/MM/DD 形式で取得
    const today = new Date();
    // 日本時間にするために一応調整 (単純な文字列化)
    const jstDate = new Date(today.getTime() + 9 * 60 * 60 * 1000);
    const todayStr = `${jstDate.getUTCFullYear()}/${String(jstDate.getUTCMonth() + 1).padStart(2, '0')}/${String(jstDate.getUTCDate()).padStart(2, '0')}`;

    console.log(`Starting YouTube check... threshold date is ${thresholdDate.toISOString()}`);

    for (const killer of killersData) {
        let isNew = false;
        let latestDate = null;

        const playlists = [killer.youtubePlaylistId, killer.enjoyPlaylistId, killer.montagePlaylistId].filter(Boolean);
        
        for (const pid of playlists) {
            // パラメータなどを取り除いて純粋なプレイリストIDにする
            const cleanPid = pid.split('&')[0];
            const date = await getLatestVideoDate(cleanPid);
            if (date) {
                if (!latestDate || date > latestDate) {
                    latestDate = date;
                }
            }
        }

        if (latestDate && latestDate >= thresholdDate) {
            isNew = true;
        }

        const wasNew = killer.isNew === true;
        if (isNew !== wasNew) {
            hasChanges = true;
            if (isNew) {
                killer.isNew = true;
                const newUpdate = {
                    date: todayStr,
                    content: `${killer.displayName}に動画を追加しました。`
                };
                
                // すでに同じ内容が今日の分として存在しないかチェック
                const exists = updatesData.some(u => u.date === newUpdate.date && u.content === newUpdate.content);
                if (!exists) {
                    updatesData.unshift(newUpdate);
                    console.log(`Added update: ${newUpdate.content}`);
                }
            } else {
                delete killer.isNew;
                console.log(`Removed NEW badge from ${killer.displayName}`);
            }
        }
    }

    if (hasChanges) {
        // 更新情報は最新30件を保持
        updatesData = updatesData.slice(0, 30);
        
        await fs.writeFile(killersPath, JSON.stringify(killersData, null, 2) + '\n');
        await fs.writeFile(updatesPath, JSON.stringify(updatesData, null, 2) + '\n');
        console.log('Successfully updated killers.json and updates.json');
    } else {
        console.log('No updates found.');
    }
}

main().catch(console.error);
