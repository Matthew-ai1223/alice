import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import { connectDB } from './config/db.js';
import medicinalRoutes from './routes/medicinalRoutes.js';
import categoryRoutes from './routes/categoryRoutes.js';
import aboutRoutes from './routes/aboutRoutes.js';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env') });
const app = express();
const PORT = process.env.PORT || 5000;
// Connect to MongoDB
connectDB();
// CORS configuration (allow requests from frontend client)
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}));
// Body parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// Ensure upload folders exist
const isVercel = Boolean(process.env.VERCEL);
const uploadDir = isVercel
    ? path.join('/tmp', 'uploads')
    : path.resolve(process.cwd(), 'uploads');
const imagesDir = path.join(uploadDir, 'images');
const audioDir = path.join(uploadDir, 'audio');
try {
    [uploadDir, imagesDir, audioDir].forEach((dir) => {
        if (!fs.existsSync(dir))
            fs.mkdirSync(dir, { recursive: true });
    });
}
catch (e) {
    console.warn('[Uploads Notice] Read-only filesystem detected, upload directory creation skipped.');
}
// Serve static uploads
app.use('/uploads', express.static(uploadDir));
// Serve images directory for seed data assets (checks root and parent locations)
const localImagesDir = path.resolve(process.cwd(), 'images');
const parentImagesDir = path.resolve(process.cwd(), '../images');
if (fs.existsSync(localImagesDir)) {
    app.use('/images', express.static(localImagesDir));
}
else if (fs.existsSync(parentImagesDir)) {
    app.use('/images', express.static(parentImagesDir));
}
// Serve frontend static files from root when running standalone (not needed on Vercel as Vercel serves static assets directly)
if (!isVercel) {
    const frontendDir = fs.existsSync(path.resolve(process.cwd(), 'index.html'))
        ? process.cwd()
        : path.resolve(process.cwd(), '..');
    app.use(express.static(frontendDir, {
        index: 'index.html',
    }));
}
// Middleware to ensure DB connection is ready in serverless environments
app.use(async (req, res, next) => {
    if (mongoose.connection.readyState !== 1 && process.env.MONGODB_URI) {
        try {
            await connectDB();
        }
        catch (_) { }
    }
    next();
});
// Health check endpoint
app.get('/api/health', (req, res) => {
    const readyState = mongoose.connection.readyState;
    res.json({
        status: 'online',
        db: readyState === 1 ? 'connected' : 'disconnected',
        dbReadyState: readyState,
        system: 'Digital Dictionary of Yorùbá Traditional Medicinal Vocabulary API',
        version: '1.0.0',
        platform: isVercel ? 'Vercel Serverless' : 'Node.js Express',
        timestamp: new Date().toISOString(),
    });
});
// Mount medicinal routes
app.use('/api/medicinals', medicinalRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/about', aboutRoutes);
// Global Error Handler
app.use((err, req, res, next) => {
    console.error('[Server Error]', err);
    if (err.code === 'LIMIT_FILE_SIZE') {
        res.status(400).json({
            success: false,
            message: 'File is too large. Images and audio must be 4MB or smaller.',
        });
        return;
    }
    res.status(err.status || 500).json({
        success: false,
        message: err.message || 'Internal Server Error',
    });
});
// Only start the HTTP listener if directly executed (not imported by Vercel serverless function)
const isDirectRun = Boolean(process.argv[1] &&
    (process.argv[1].endsWith('server.ts') || process.argv[1].endsWith('server.js')));
if (isDirectRun && !isVercel) {
    app.listen(PORT, () => {
        console.log(`====================================================`);
        console.log(` Yorùbá Medicinal Backend Server Running`);
        console.log(` `);
        console.log(` Frontend:       http://localhost:${PORT}`);
        console.log(` Admin Portal:   http://localhost:${PORT}/admin.html`);
        console.log(` API Health:     http://localhost:${PORT}/api/health`);
        console.log(` Medicinals API: http://localhost:${PORT}/api/medicinals`);
        console.log(` Uploads:        http://localhost:${PORT}/uploads`);
        console.log(`====================================================`);
    });
}
export default app;
