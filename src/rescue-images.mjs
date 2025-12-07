import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { fileURLToPath } from 'url';
import https from 'https';

// --- CONFIG ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PLAYERS_DIR = path.resolve(__dirname, '../src/content/players');
const SAVE_DIR = path.resolve(__dirname, '../public/players'); // Safe folder

// Ensure folder exists
if (!fs.existsSync(SAVE_DIR)) {
    fs.mkdirSync(SAVE_DIR, { recursive: true });
}

// Helper: Download Image
const downloadImage = (url, filepath) => {
    return new Promise((resolve, reject) => {
        // Use proxy to bypass 403, but the token MUST be valid for this to work
        const proxyUrl = `https://wsrv.nl/?url=${encodeURIComponent(url)}&w=1000&output=jpg`;
        
        const file = fs.createWriteStream(filepath);
        https.get(proxyUrl, response => {
            if (response.statusCode !== 200) {
                reject(new Error(`Status ${response.statusCode}`));
                return;
            }
            response.pipe(file);
            file.on('finish', () => {
                file.close();
                resolve();
            });
        }).on('error', err => {
            fs.unlink(filepath, () => {});
            reject(err);
        });
    });
};

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// --- RECURSIVE FINDER ---
function getAllFiles(dirPath, arrayOfFiles = []) {
    const files = fs.readdirSync(dirPath);
    files.forEach(file => {
        const fullPath = path.join(dirPath, file);
        if (fs.statSync(fullPath).isDirectory()) {
            getAllFiles(fullPath, arrayOfFiles);
        } else {
            if (file.endsWith('.md') || file.endsWith('.mdx')) arrayOfFiles.push(fullPath);
        }
    });
    return arrayOfFiles;
}

async function main() {
    console.log(`\n🚨 STARTING EMERGENCY BACKUP...`);
    
    const playerFiles = getAllFiles(PLAYERS_DIR);
    console.log(`📂 Scanning ${playerFiles.length} files.\n`);

    let count = 0;

    for (const filepath of playerFiles) {
        const content = fs.readFileSync(filepath, 'utf-8');
        const parsed = matter(content);
        const url = parsed.data.headshot;
        
        // Only download if it's a remote URL (Greenfly)
        if (url && url.startsWith('http')) {
            const slug = path.basename(filepath, path.extname(filepath)); // proper.md -> proper
            const filename = `${slug}.jpg`;
            const savePath = path.join(SAVE_DIR, filename);

            process.stdout.write(`Saving ${parsed.data.name}... `);

            try {
                await downloadImage(url, savePath);
                console.log("✅ SAVED");
                count++;
            } catch (e) {
                console.log(`❌ FAILED`);
            }
            await sleep(200); // Go fast
        }
    }

    console.log(`\n📦 BACKUP COMPLETE: ${count} images saved to public/players/`);
}

main();