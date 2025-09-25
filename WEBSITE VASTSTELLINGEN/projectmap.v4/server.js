const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 8000;

// MIME types voor verschillende bestandstypen
const mimeTypes = {
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpg',
    '.gif': 'image/gif',
    '.ico': 'image/x-icon',
    '.svg': 'image/svg+xml'
};

const server = http.createServer((req, res) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    
    // Default naar index.html voor root requests
    let filePath = req.url === '/' ? '/projectmap.v4/index.html' : req.url;
    
    // Voeg workingfolder path toe
    filePath = path.join(__dirname, filePath);
    
    // Bepaal content type
    const extname = String(path.extname(filePath)).toLowerCase();
    const contentType = mimeTypes[extname] || 'application/octet-stream';
    
    // CORS headers toevoegen
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');
    
    // Handle OPTIONS preflight requests
    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }
    
    fs.readFile(filePath, (error, content) => {
        if (error) {
            if (error.code == 'ENOENT') {
                // File not found - probeer index.html als fallback
                fs.readFile(path.join(__dirname, 'projectmap.v4', 'index.html'), (error, content) => {
                    if (error) {
                        res.writeHead(404, { 'Content-Type': 'text/html' });
                        res.end(`
                            <h1>404 - Bestand niet gevonden</h1>
                            <p>Het gevraagde bestand <code>${req.url}</code> kon niet worden gevonden.</p>
                            <p><a href="/projectmap.v4/index.html">Ga naar Vaststellingen App</a></p>
                        `, 'utf-8');
                    } else {
                        res.writeHead(200, { 'Content-Type': 'text/html' });
                        res.end(content, 'utf-8');
                    }
                });
            } else {
                res.writeHead(500);
                res.end(`Server Error: ${error.code}`);
            }
        } else {
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content, 'utf-8');
        }
    });
});

server.listen(PORT, () => {
    console.log(`🚀 Vaststellingen Server running at http://localhost:${PORT}/`);
    console.log(`📋 Main App: http://localhost:${PORT}/projectmap.v4/index.html`);
    console.log(`⚙️  Config: ${path.join(__dirname, 'projectmap.v4')}`);
    console.log(`🛑 Stop with Ctrl+C`);
});