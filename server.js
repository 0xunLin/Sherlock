const express = require('express');
const path = require('path');
const fs = require('fs');
const zlib = require('zlib');
const multer = require('multer');
const { exec } = require('child_process');

const app = express();

// Multer setup for temporarily storing uploaded block files
const upload = multer({ dest: 'uploads/' });

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ ok: true });
});

// File upload endpoint for importing new blocks (blk, rev, xor)
app.post('/api/upload', upload.fields([
    { name: 'blkFile', maxCount: 1 },
    { name: 'revFile', maxCount: 1 },
    { name: 'xorFile', maxCount: 1 }
]), (req, res) => {
    try {
        if (!req.files || !req.files.blkFile || !req.files.revFile || !req.files.xorFile) {
            return res.status(400).json({ error: 'Missing one or more required files (blk, rev, xor)' });
        }

        const blk = req.files.blkFile[0];
        const rev = req.files.revFile[0];
        const xor = req.files.xorFile[0];

        // Rename multer temp files to their original names so cli.js
        // generates output files with meaningful stems (e.g. blk05051.json)
        const uploadDir = 'uploads';
        const blkPath = path.join(uploadDir, blk.originalname);
        const revPath = path.join(uploadDir, rev.originalname);
        const xorPath = path.join(uploadDir, xor.originalname);

        fs.renameSync(blk.path, blkPath);
        fs.renameSync(rev.path, revPath);
        fs.renameSync(xor.path, xorPath);

        const cmd = `./cli.sh --block ${blkPath} ${revPath} ${xorPath}`;

        exec(cmd, { timeout: 120000 }, (error, stdout, stderr) => {
            // The stem matches the original blk filename without extension
            const stem = path.basename(blk.originalname, '.dat');

            // Clean up uploaded temporary files
            if (fs.existsSync(blkPath)) fs.unlinkSync(blkPath);
            if (fs.existsSync(revPath)) fs.unlinkSync(revPath);
            if (fs.existsSync(xorPath)) fs.unlinkSync(xorPath);

            if (error) {
                console.error(`Execution error: ${error.message}`);
                console.error(`stderr: ${stderr}`);
                return res.status(500).json({ error: 'Failed to process block files' });
            }

            res.json({ ok: true, stem: stem });
        });
    } catch (err) {
        console.error('Upload handler error:', err);
        res.status(500).json({ error: 'Internal server error during upload' });
    }
});

// List all analyzed blocks in the 'out' directory
app.get('/api/blocks', (req, res) => {
    const outDir = path.join(__dirname, 'out');
    if (!fs.existsSync(outDir)) {
        return res.json({ blocks: [] });
    }

    fs.readdir(outDir, (err, files) => {
        if (err) {
            return res.status(500).json({ error: 'Failed to read output directory' });
        }

        const jsonFiles = files.filter(f => f.endsWith('.json'));
        const stems = jsonFiles.map(f => f.replace('.json', ''));
        res.json({ blocks: stems });
    });
});

// Serve specific block data
app.get('/api/blocks/:stem', (req, res) => {
    const stem = req.params.stem;
    const jsonPath = path.join(__dirname, 'out', `${stem}.json`);

    if (!fs.existsSync(jsonPath)) {
        return res.status(404).json({ error: 'Block data not found' });
    }

    try {
        const data = fs.readFileSync(jsonPath, 'utf8');
        res.type('json').send(data);
    } catch (err) {
        res.status(500).json({ error: 'Failed to read block data' });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Web visualizer running at http://127.0.0.1:${PORT}`);
});
