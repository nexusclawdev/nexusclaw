const http = require('http');
const fs = require('fs');
const path = require('path');
const https = require('https');

const PORT = 8899;
const DATA_FILE = path.join(__dirname, 'mc-data.json');
const ACTIVITY_FILE = path.join(__dirname, 'mc-activity.json');
const HTML_FILE = path.join(__dirname, 'mission-control.html');

// Ensure data files exist on startup
if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, JSON.stringify({}));
if (!fs.existsSync(ACTIVITY_FILE)) fs.writeFileSync(ACTIVITY_FILE, JSON.stringify([]));

// Helper: Parse JSON POST body
const parseBody = (req) => {
    return new Promise((resolve, reject) => {
        let body = '';
        req.on('data', chunk => body += chunk.toString());
        req.on('end', () => {
            try { resolve(JSON.parse(body)); }
            catch (e) { resolve(body); }
        });
        req.on('error', reject);
    });
};

const server = http.createServer(async (req, res) => {
    // Enable CORS for local development
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'OPTIONS, GET, POST, PUT, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    // Handle Preflight OPTIONS request
    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        return res.end();
    }

    const parsedUrl = new URL(req.url, `http://${req.headers.host}`);
    const pathname = parsedUrl.pathname;

    try {
        // Serve HTML file at root
        if (req.method === 'GET' && pathname === '/') {
            if (fs.existsSync(HTML_FILE)) {
                res.writeHead(200, { 'Content-Type': 'text/html' });
                return res.end(fs.readFileSync(HTML_FILE));
            } else {
                res.writeHead(404, { 'Content-Type': 'text/plain' });
                return res.end(`Mission Control UI not found. Please place 'mission-control.html' inside:\n${__dirname}`);
            }
        }

        // 1. GET /mc/status
        if (req.method === 'GET' && pathname === '/mc/status') {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({
                status: 'online',
                uptime: Math.floor(process.uptime()),
                timestamp: Date.now()
            }));
        }

        // 2. GET /mc/data
        if (req.method === 'GET' && pathname === '/mc/data') {
            const data = fs.readFileSync(DATA_FILE, 'utf8');
            res.writeHead(200, { 'Content-Type': 'application/json' });
            return res.end(data);
        }

        // 3. POST /mc/data
        if (req.method === 'POST' && pathname === '/mc/data') {
            const body = await parseBody(req);
            fs.writeFileSync(DATA_FILE, JSON.stringify(body, null, 2));
            res.writeHead(200, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ success: true, timestamp: Date.now() }));
        }

        // 4. GET /mc/weather?city=[CITY]
        if (req.method === 'GET' && pathname === '/mc/weather') {
            const city = parsedUrl.searchParams.get('city') || 'London';
            https.get(`https://wttr.in/${encodeURIComponent(city)}?format=j1`, (weatherRes) => {
                let data = '';
                weatherRes.on('data', chunk => data += chunk);
                weatherRes.on('end', () => {
                    try {
                        const w = JSON.parse(data);
                        const current = w.current_condition[0];
                        res.writeHead(200, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({
                            temperature: current.temp_C,
                            feels_like: current.FeelsLikeC,
                            condition: current.weatherDesc[0].value
                        }));
                    } catch (e) {
                        res.writeHead(500, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ error: 'Failed to parse weather data' }));
                    }
                });
            }).on('error', (e) => {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Failed to fetch weather from wttr.in' }));
            });
            return;
        }

        // 5. GET /mc/activity
        if (req.method === 'GET' && pathname === '/mc/activity') {
            const activities = JSON.parse(fs.readFileSync(ACTIVITY_FILE, 'utf8'));
            res.writeHead(200, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify(activities.slice(-50)));
        }

        // 6. POST /mc/activity
        if (req.method === 'POST' && pathname === '/mc/activity') {
            const body = await parseBody(req);
            const activities = JSON.parse(fs.readFileSync(ACTIVITY_FILE, 'utf8'));
            activities.push({
                ...body,
                timestamp: new Date().toISOString()
            });
            // Keep only the last 100 activities to prevent infinite file size scaling
            if (activities.length > 100) activities.shift();
            fs.writeFileSync(ACTIVITY_FILE, JSON.stringify(activities, null, 2));

            res.writeHead(200, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ success: true, count: activities.length }));
        }

        // 404 Route Not Found
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Endpoint Not Found', path: pathname }));

    } catch (error) {
        console.error("Server Error:", error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Internal Server Error', message: String(error) }));
    }
});

server.listen(PORT, '0.0.0.0', () => {
    console.log(`\n🚀 Mission Control Local Server Initialized!`);
    console.log(`📡 URL:      http://localhost:${PORT}`);
    console.log(`📂 DB Path:  ${DATA_FILE}`);
    console.log(`📜 Log Path: ${ACTIVITY_FILE}\n`);
    console.log(`Waiting for connections...\n`);
});
