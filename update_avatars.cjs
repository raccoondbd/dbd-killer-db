const fs = require('fs');
const https = require('https');

const creatorsPath = './src/data/creators.json';
let creators = JSON.parse(fs.readFileSync(creatorsPath, 'utf8'));

function fetchJson(url) {
    return new Promise((resolve, reject) => {
        https.get(url, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try { resolve(JSON.parse(data)); }
                catch(e) { resolve(null); }
            });
        }).on('error', reject);
    });
}

function fetchHtml(url) {
    return new Promise((resolve, reject) => {
        https.get(url, (res) => {
            if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                return resolve(fetchHtml(res.headers.location));
            }
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve(data));
        }).on('error', reject);
    });
}

async function updateAvatars() {
    for (let i = 0; i < creators.length; i++) {
        let c = creators[i];
        if (c.avatarUrl && c.avatarUrl.includes('unavatar.io/twitch/')) {
            const username = c.avatarUrl.split('/').pop();
            console.log(`Fetching Twitch avatar for ${username}...`);
            const data = await fetchJson(`https://api.ivr.fi/v2/twitch/user?login=${username}`);
            if (data && data[0] && data[0].logo) {
                c.avatarUrl = data[0].logo;
                console.log(`  -> Updated: ${c.avatarUrl}`);
            } else {
                console.log(`  -> Failed`);
            }
        } 
        else if (c.avatarUrl && c.avatarUrl.includes('unavatar.io/youtube/')) {
            const ytUrl = c.sns?.youtube;
            if (ytUrl) {
                console.log(`Fetching Youtube avatar for ${c.name} via ${ytUrl}...`);
                const html = await fetchHtml(ytUrl);
                const match = html.match(/<meta property="og:image" content="([^"]+)"/);
                if (match && match[1]) {
                    c.avatarUrl = match[1];
                    console.log(`  -> Updated: ${c.avatarUrl}`);
                } else {
                    console.log(`  -> Failed (og:image not found)`);
                }
            }
        }
    }

    fs.writeFileSync(creatorsPath, JSON.stringify(creators, null, 2), 'utf8');
    console.log("Done updating creators.json");
}

updateAvatars();
