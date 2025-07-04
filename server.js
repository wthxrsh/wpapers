const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { Pool } = require('pg');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Security HTTP headers
app.use(helmet());

// Logging
app.use(morgan('combined'));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    standardHeaders: true,
    legacyHeaders: false,
});
app.use(limiter);

// CORS (allow only your frontend domain in production)
const allowedOrigins = process.env.CORS_ORIGIN ? [process.env.CORS_ORIGIN] : ['http://localhost:3000'];
app.use(cors({
    origin: allowedOrigins,
    credentials: true,
}));

// Only serve static files from public/
app.use(express.static('public', { dotfiles: 'ignore', index: false }));

// PostgreSQL connection
const pool = new Pool({
    user: process.env.DB_USER || 'wpapersuser',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'wpapers',
    password: process.env.DB_PASSWORD || 'fsociety',
    port: process.env.DB_PORT ? parseInt(process.env.DB_PORT) : 5432,
});

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, 'public', 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// Multer configuration for file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadsDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB limit
    },
    fileFilter: function (req, file, cb) {
        const allowedTypes = /jpeg|jpg|png|gif|webp/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        
        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb(new Error('Only image files are allowed!'));
        }
    }
});

// Database initialization
async function initializeDatabase() {
    try {
        const client = await pool.connect();
        
        // Create wallpapers table
        await client.query(`
            CREATE TABLE IF NOT EXISTS wallpapers (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                tags TEXT[] NOT NULL,
                image_url VARCHAR(500) NOT NULL,
                file_name VARCHAR(255) NOT NULL,
                file_size INTEGER NOT NULL,
                mime_type VARCHAR(100) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        
        console.log('Database initialized successfully');
        client.release();
    } catch (error) {
        console.error('Database initialization error:', error);
    }
}

// Initialize database on startup
initializeDatabase();

// API Routes

// GET /api/wallpapers - Get all wallpapers
app.get('/api/wallpapers', async (req, res) => {
    try {
        const client = await pool.connect();
        const result = await client.query(`
            SELECT id, name, tags, image_url, file_name, file_size, mime_type, created_at 
            FROM wallpapers 
            ORDER BY created_at DESC
        `);
        client.release();
        
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching wallpapers:', error);
        res.status(500).json({ message: 'Failed to fetch wallpapers' });
    }
});

// POST /api/wallpapers - Upload a new wallpaper
app.post('/api/wallpapers', upload.single('image'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No image file provided' });
        }

        const { name, tags } = req.body;
        
        if (!name || !tags) {
            return res.status(400).json({ message: 'Name and tags are required' });
        }

        // Parse tags (comma-separated string to array)
        const tagsArray = tags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);
        
        if (tagsArray.length === 0) {
            return res.status(400).json({ message: 'At least one tag is required' });
        }

        const imageUrl = `/uploads/${req.file.filename}`;
        
        const client = await pool.connect();
        const result = await client.query(`
            INSERT INTO wallpapers (name, tags, image_url, file_name, file_size, mime_type)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING id, name, tags, image_url, file_name, file_size, mime_type, created_at
        `, [name, tagsArray, imageUrl, req.file.filename, req.file.size, req.file.mimetype]);
        
        client.release();
        
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Error uploading wallpaper:', error);
        
        // Clean up uploaded file if database insertion fails
        if (req.file) {
            fs.unlink(req.file.path, (err) => {
                if (err) console.error('Error deleting file:', err);
            });
        }
        
        res.status(500).json({ message: 'Failed to upload wallpaper' });
    }
});

// GET /api/wallpapers/search - Search wallpapers by tags or name
app.get('/api/wallpapers/search', async (req, res) => {
    try {
        const { q } = req.query;
        
        if (!q) {
            return res.status(400).json({ message: 'Search query is required' });
        }

        const client = await pool.connect();
        const result = await client.query(`
            SELECT id, name, tags, image_url, file_name, file_size, mime_type, created_at 
            FROM wallpapers 
            WHERE name ILIKE $1 OR $2 = ANY(tags)
            ORDER BY created_at DESC
        `, [`%${q}%`, q.toLowerCase()]);
        
        client.release();
        
        res.json(result.rows);
    } catch (error) {
        console.error('Error searching wallpapers:', error);
        res.status(500).json({ message: 'Failed to search wallpapers' });
    }
});

// DELETE /api/wallpapers/:id - Delete a wallpaper
app.delete('/api/wallpapers/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        const client = await pool.connect();
        
        // Get file information before deletion
        const fileResult = await client.query('SELECT file_name FROM wallpapers WHERE id = $1', [id]);
        
        if (fileResult.rows.length === 0) {
            client.release();
            return res.status(404).json({ message: 'Wallpaper not found' });
        }
        
        // Delete from database
        await client.query('DELETE FROM wallpapers WHERE id = $1', [id]);
        client.release();
        
        // Delete file from filesystem
        const filePath = path.join(uploadsDir, fileResult.rows[0].file_name);
        fs.unlink(filePath, (err) => {
            if (err) console.error('Error deleting file:', err);
        });
        
        res.json({ message: 'Wallpaper deleted successfully' });
    } catch (error) {
        console.error('Error deleting wallpaper:', error);
        res.status(500).json({ message: 'Failed to delete wallpaper' });
    }
});

// Error handling middleware
app.use((error, req, res, next) => {
    if (error instanceof multer.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ message: 'File size too large. Maximum size is 10MB.' });
        }
    }
    
    console.error('Server error:', error);
    res.status(500).json({ message: 'Internal server error' });
});

// Serve the main HTML file
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Start server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`API available at http://localhost:${PORT}/api`);
});

// Graceful shutdown
process.on('SIGINT', async () => {
    console.log('\nShutting down server...');
    await pool.end();
    process.exit(0);
}); 