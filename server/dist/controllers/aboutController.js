import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { About } from '../models/About.js';
import { DEFAULT_ABOUT } from '../data/aboutContent.js';
let memoryAbout = null;
function isDbConnected() {
    return mongoose.connection.readyState === 1;
}
function getAboutFilePath() {
    const serverPath = path.resolve(process.cwd(), 'server', 'data', 'about.json');
    if (fs.existsSync(serverPath))
        return serverPath;
    const directPath = path.resolve(process.cwd(), 'data', 'about.json');
    if (fs.existsSync(directPath))
        return directPath;
    const relativeData = path.resolve(process.cwd(), 'data');
    if (fs.existsSync(relativeData))
        return path.join(relativeData, 'about.json');
    return serverPath;
}
function mergeAbout(partial) {
    return { ...DEFAULT_ABOUT, ...(partial || {}) };
}
function readLocalAbout() {
    if (memoryAbout)
        return memoryAbout;
    const filePath = getAboutFilePath();
    if (fs.existsSync(filePath)) {
        try {
            const raw = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
            memoryAbout = mergeAbout(raw);
            return memoryAbout;
        }
        catch (_) { }
    }
    memoryAbout = { ...DEFAULT_ABOUT };
    try {
        const dirPath = path.dirname(filePath);
        if (!fs.existsSync(dirPath))
            fs.mkdirSync(dirPath, { recursive: true });
        fs.writeFileSync(filePath, JSON.stringify(memoryAbout, null, 2), 'utf-8');
    }
    catch (_) { }
    return memoryAbout;
}
function saveLocalAbout(data) {
    memoryAbout = data;
    const filePath = getAboutFilePath();
    try {
        const dirPath = path.dirname(filePath);
        if (!fs.existsSync(dirPath))
            fs.mkdirSync(dirPath, { recursive: true });
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
    }
    catch (_) {
        console.warn('[About Notice] Filesystem is read-only, updated in-memory state.');
    }
}
function toPublicAbout(doc) {
    const { _id, __v, key, createdAt, updatedAt, ...rest } = doc;
    return mergeAbout(rest);
}
export async function getAbout(_req, res) {
    try {
        if (isDbConnected()) {
            let item = await About.findOne({ key: 'about' });
            if (!item) {
                item = await About.create({ key: 'about', ...DEFAULT_ABOUT });
            }
            res.json({ success: true, data: toPublicAbout(item.toJSON()) });
            return;
        }
        res.json({ success: true, data: readLocalAbout() });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to load About page content',
            error: error.message,
        });
    }
}
export async function updateAbout(req, res) {
    try {
        const incoming = { ...(req.body || {}) };
        delete incoming.key;
        delete incoming._id;
        delete incoming.id;
        if (isDbConnected()) {
            const updated = await About.findOneAndUpdate({ key: 'about' }, { $set: { key: 'about', ...incoming } }, { new: true, upsert: true, setDefaultsOnInsert: true });
            res.json({
                success: true,
                message: 'About page updated successfully',
                data: toPublicAbout(updated ? updated.toJSON() : incoming),
            });
            return;
        }
        const next = mergeAbout({ ...readLocalAbout(), ...incoming });
        saveLocalAbout(next);
        res.json({
            success: true,
            message: 'About page updated successfully (Local Storage)',
            data: next,
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to update About page',
            error: error.message,
        });
    }
}
export async function updateAboutPortrait(req, res) {
    try {
        const files = req.files;
        const file = files?.image?.[0];
        if (!file) {
            res.status(400).json({ success: false, message: 'Please choose a portrait image.' });
            return;
        }
        const portraitUrl = file.buffer
            ? `data:${file.mimetype};base64,${file.buffer.toString('base64')}`
            : `/uploads/images/${file.filename}`;
        if (isDbConnected()) {
            const updated = await About.findOneAndUpdate({ key: 'about' }, { $set: { portraitUrl } }, { new: true, upsert: true, setDefaultsOnInsert: true });
            res.json({
                success: true,
                message: 'Portrait updated successfully',
                data: toPublicAbout(updated ? updated.toJSON() : { portraitUrl }),
            });
            return;
        }
        const next = mergeAbout({ ...readLocalAbout(), portraitUrl });
        saveLocalAbout(next);
        res.json({
            success: true,
            message: 'Portrait updated successfully (Local Storage)',
            data: next,
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to update portrait',
            error: error.message,
        });
    }
}
