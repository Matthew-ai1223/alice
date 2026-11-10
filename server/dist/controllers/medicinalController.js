import mongoose from 'mongoose';
import { Medicinal } from '../models/Medicinal.js';
import { SEED_DATA } from '../data/seedData.js';
import fs from 'fs';
import path from 'path';
// In-memory cache for serverless/read-only environments
let memoryData = null;
function getDataFilePath() {
    const serverPath = path.resolve(process.cwd(), 'server', 'data', 'medicinals.json');
    if (fs.existsSync(serverPath))
        return serverPath;
    const directPath = path.resolve(process.cwd(), 'data', 'medicinals.json');
    if (fs.existsSync(directPath))
        return directPath;
    const relativeData = path.resolve(process.cwd(), 'data');
    if (fs.existsSync(relativeData))
        return path.join(relativeData, 'medicinals.json');
    return serverPath;
}
function isDbConnected() {
    return mongoose.connection.readyState === 1;
}
function publicMediaUrl(id, kind) {
    return `/api/medicinals/${id}/${kind}`;
}
function withoutMediaPayload(item) {
    const { imageData, audioData, ...rest } = item;
    return rest;
}
function toMediaBuffer(data) {
    if (!data)
        return null;
    if (Buffer.isBuffer(data))
        return data;
    if (typeof data === 'string')
        return Buffer.from(data, 'base64');
    if (typeof data === 'object' && data !== null && 'buffer' in data) {
        return Buffer.from(data.buffer);
    }
    return null;
}
function sendMedia(res, data, mime, fallbackMime) {
    const buffer = toMediaBuffer(data);
    if (!buffer?.length)
        return false;
    res.setHeader('Content-Type', mime || fallbackMime);
    res.setHeader('Content-Disposition', 'inline');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.send(buffer);
    return true;
}
function parseExtraFields(raw) {
    if (!raw)
        return [];
    let parsed = raw;
    if (typeof raw === 'string') {
        try {
            parsed = JSON.parse(raw);
        }
        catch {
            return [];
        }
    }
    if (!Array.isArray(parsed))
        return [];
    return parsed
        .map((field) => ({
        label: String(field?.label || '').trim(),
        value: String(field?.value || '').trim(),
    }))
        .filter((field) => field.label && field.value);
}
function getLocalData() {
    if (memoryData && memoryData.length > 0) {
        return memoryData;
    }
    const filePath = getDataFilePath();
    const dirPath = path.dirname(filePath);
    if (fs.existsSync(filePath)) {
        try {
            const raw = fs.readFileSync(filePath, 'utf-8');
            memoryData = JSON.parse(raw);
            return memoryData || [];
        }
        catch (_) { }
    }
    // Initialize with seed data
    const initial = SEED_DATA.map((item, index) => {
        const slug = item.name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');
        const now = new Date().toISOString();
        return {
            _id: `local_${index + 1}_${Date.now()}`,
            id: slug,
            ...item,
            audioUrl: null,
            extraFields: [],
            createdAt: now,
            updatedAt: now,
        };
    });
    try {
        if (!fs.existsSync(dirPath)) {
            fs.mkdirSync(dirPath, { recursive: true });
        }
        fs.writeFileSync(filePath, JSON.stringify(initial, null, 2), 'utf-8');
    }
    catch (err) {
        // Read-only filesystem (Vercel) - keep in memory
    }
    memoryData = initial;
    return memoryData;
}
function saveLocalData(data) {
    memoryData = data;
    const filePath = getDataFilePath();
    const dirPath = path.dirname(filePath);
    try {
        if (!fs.existsSync(dirPath)) {
            fs.mkdirSync(dirPath, { recursive: true });
        }
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
    }
    catch (err) {
        console.warn('[Medicinal Notice] Filesystem is read-only, updated in-memory state.');
    }
}
// Helper to determine the alphabetical group letter from Yorùbá headwords
function getLetterGroup(name) {
    if (!name)
        return 'A';
    const clean = name.trim();
    if (clean.toLowerCase().startsWith('gb')) {
        return 'Gb';
    }
    const firstChar = clean.charAt(0);
    const normalized = firstChar.normalize('NFD');
    if (firstChar === 'Ẹ' || firstChar === 'ẹ' || (normalized[0].toUpperCase() === 'E' && normalized.includes('\u0329'))) {
        return 'Ẹ';
    }
    if (firstChar === 'Ọ' || firstChar === 'ọ' || (normalized[0].toUpperCase() === 'O' && normalized.includes('\u0329'))) {
        return 'Ọ';
    }
    return normalized[0].toUpperCase();
}
// 1. Get all medicinals with optional filters
export async function getAllMedicinals(req, res) {
    try {
        const { category, letter, hasAudio, hasPicture, search } = req.query;
        if (isDbConnected()) {
            const filter = {};
            if (category && category !== 'all') {
                filter.category = String(category).toLowerCase();
            }
            if (letter && letter !== 'All') {
                filter.letter = String(letter);
            }
            if (hasAudio === 'true') {
                filter.hasAudio = true;
            }
            if (hasPicture === 'true') {
                filter.hasPicture = true;
            }
            if (search && String(search).trim() !== '') {
                const q = String(search).trim();
                const regex = new RegExp(q, 'i');
                filter.$or = [
                    { name: regex },
                    { definition: regex },
                    { ipa: regex },
                    { exampleYoruba: regex },
                    { exampleEnglish: regex },
                    { 'extraFields.label': regex },
                    { 'extraFields.value': regex },
                ];
            }
            const items = await Medicinal.find(filter).select('-imageData -audioData').sort({ letter: 1, name: 1 });
            res.json({
                success: true,
                count: items.length,
                data: items,
            });
            return;
        }
        // Fallback: Local file data
        let items = getLocalData();
        if (category && category !== 'all') {
            const catLower = String(category).toLowerCase();
            items = items.filter((item) => item.category.toLowerCase() === catLower);
        }
        if (letter && letter !== 'All') {
            items = items.filter((item) => item.letter === String(letter));
        }
        if (hasAudio === 'true') {
            items = items.filter((item) => item.hasAudio);
        }
        if (hasPicture === 'true') {
            items = items.filter((item) => item.hasPicture);
        }
        if (search && String(search).trim() !== '') {
            const q = String(search).trim().toLowerCase();
            items = items.filter((item) => item.name.toLowerCase().includes(q) ||
                item.definition.toLowerCase().includes(q) ||
                (item.ipa && item.ipa.toLowerCase().includes(q)) ||
                (item.exampleYoruba && item.exampleYoruba.toLowerCase().includes(q)) ||
                (item.exampleEnglish && item.exampleEnglish.toLowerCase().includes(q)) ||
                (item.extraFields || []).some((field) => field.label.toLowerCase().includes(q) ||
                    field.value.toLowerCase().includes(q)));
        }
        items.sort((a, b) => a.name.localeCompare(b.name));
        res.json({
            success: true,
            count: items.length,
            data: items.map((item) => withoutMediaPayload(item)),
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve medicinals',
            error: error.message,
        });
    }
}
// 2. Get single medicinal by ID
export async function getMedicinalById(req, res) {
    try {
        const id = req.params.id;
        if (isDbConnected()) {
            const item = await Medicinal.findById(id).select('-imageData -audioData');
            if (!item) {
                res.status(404).json({ success: false, message: 'Medicinal entry not found' });
                return;
            }
            res.json({ success: true, data: item });
            return;
        }
        const items = getLocalData();
        const item = items.find((i) => i._id === id || i.id === id);
        if (!item) {
            res.status(404).json({ success: false, message: 'Medicinal entry not found' });
            return;
        }
        res.json({ success: true, data: withoutMediaPayload(item) });
    }
    catch (error) {
        res.status(500).json({ success: false, message: 'Error retrieving entry', error: error.message });
    }
}
export async function getMedicinalImage(req, res) {
    await sendEntryMedia(req, res, 'image');
}
export async function getMedicinalAudio(req, res) {
    await sendEntryMedia(req, res, 'audio');
}
async function sendEntryMedia(req, res, kind) {
    const id = req.params.id;
    const fallbackMime = kind === 'image' ? 'image/jpeg' : 'audio/mpeg';
    try {
        if (isDbConnected()) {
            const item = await Medicinal.findById(id).select(kind === 'image' ? '+imageData imageMime imageUrl' : '+audioData audioMime audioUrl');
            if (!item) {
                res.status(404).json({ success: false, message: 'Entry not found' });
                return;
            }
            const data = kind === 'image' ? item.imageData : item.audioData;
            const mime = kind === 'image' ? item.imageMime : item.audioMime;
            if (sendMedia(res, data, mime, fallbackMime))
                return;
            const legacyUrl = kind === 'image' ? item.imageUrl : item.audioUrl;
            if (legacyUrl && legacyUrl.startsWith('/uploads/')) {
                const diskPath = path.resolve(process.cwd(), legacyUrl.replace(/^\//, ''));
                if (fs.existsSync(diskPath)) {
                    res.sendFile(diskPath);
                    return;
                }
            }
            res.status(404).json({ success: false, message: 'Media not found' });
            return;
        }
        const item = getLocalData().find((entry) => entry._id === id || entry.id === id);
        if (!item) {
            res.status(404).json({ success: false, message: 'Entry not found' });
            return;
        }
        const data = kind === 'image' ? item.imageData : item.audioData;
        const mime = kind === 'image' ? item.imageMime : item.audioMime;
        if (sendMedia(res, data, mime, fallbackMime))
            return;
        const legacyUrl = kind === 'image' ? item.imageUrl : item.audioUrl;
        if (legacyUrl && legacyUrl.startsWith('/uploads/')) {
            const diskPath = path.resolve(process.cwd(), legacyUrl.replace(/^\//, ''));
            if (fs.existsSync(diskPath)) {
                res.sendFile(diskPath);
                return;
            }
        }
        res.status(404).json({ success: false, message: 'Media not found' });
    }
    catch (error) {
        res.status(500).json({ success: false, message: 'Failed to load media', error: error.message });
    }
}
// 3. Create new medicinal with file uploads
export async function createMedicinal(req, res) {
    try {
        const { name, ipa, pos, definition, exampleYoruba, exampleEnglish, extraFields, letter, } = req.body;
        if (!name || !definition) {
            res.status(400).json({
                success: false,
                message: 'Name and Definition are required fields.',
            });
            return;
        }
        const parsedExtraFields = parseExtraFields(extraFields);
        const files = req.files;
        const imageFile = files?.image?.[0];
        const audioFile = files?.audio?.[0];
        const determinedLetter = letter ? String(letter).trim() : getLetterGroup(name);
        if (isDbConnected()) {
            const id = new mongoose.Types.ObjectId();
            const newMedicinal = new Medicinal({
                _id: id,
                name: name.trim(),
                ipa: (ipa || '').trim(),
                pos: (pos || 'n.').trim(),
                category: '',
                definition: definition.trim(),
                exampleYoruba: (exampleYoruba || '').trim(),
                exampleEnglish: (exampleEnglish || '').trim(),
                extraFields: parsedExtraFields,
                letter: determinedLetter,
                imageUrl: imageFile ? publicMediaUrl(String(id), 'image') : null,
                audioUrl: audioFile ? publicMediaUrl(String(id), 'audio') : null,
                imageMime: imageFile?.mimetype || null,
                audioMime: audioFile?.mimetype || null,
                imageData: imageFile?.buffer,
                audioData: audioFile?.buffer,
                hasPicture: Boolean(imageFile),
                hasAudio: Boolean(audioFile),
            });
            const saved = await newMedicinal.save();
            res.status(201).json({
                success: true,
                message: 'Medicinal entry created successfully',
                data: saved,
            });
            return;
        }
        // Local storage creation
        const items = getLocalData();
        const newId = `local_${Date.now()}`;
        const slug = name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');
        const now = new Date().toISOString();
        const newEntry = {
            _id: newId,
            id: slug || newId,
            name: name.trim(),
            ipa: (ipa || '').trim(),
            pos: (pos || 'n.').trim(),
            category: '',
            definition: definition.trim(),
            exampleYoruba: (exampleYoruba || '').trim(),
            exampleEnglish: (exampleEnglish || '').trim(),
            extraFields: parsedExtraFields,
            letter: determinedLetter,
            imageUrl: imageFile ? publicMediaUrl(newId, 'image') : null,
            audioUrl: audioFile ? publicMediaUrl(newId, 'audio') : null,
            imageMime: imageFile?.mimetype || null,
            audioMime: audioFile?.mimetype || null,
            imageData: imageFile?.buffer ? imageFile.buffer.toString('base64') : null,
            audioData: audioFile?.buffer ? audioFile.buffer.toString('base64') : null,
            hasPicture: Boolean(imageFile),
            hasAudio: Boolean(audioFile),
            createdAt: now,
            updatedAt: now,
        };
        items.push(newEntry);
        saveLocalData(items);
        res.status(201).json({
            success: true,
            message: 'Medicinal entry created successfully (Local Storage)',
            data: withoutMediaPayload(newEntry),
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to create medicinal entry',
            error: error.message,
        });
    }
}
// 4. Update medicinal
export async function updateMedicinal(req, res) {
    try {
        const id = req.params.id;
        const { name, ipa, pos, definition, exampleYoruba, exampleEnglish, extraFields, letter, removeImage, removeAudio, } = req.body;
        const parsedExtraFields = extraFields !== undefined ? parseExtraFields(extraFields) : undefined;
        const files = req.files;
        if (isDbConnected()) {
            const item = await Medicinal.findById(id);
            if (!item) {
                res.status(404).json({ success: false, message: 'Entry not found' });
                return;
            }
            if (name)
                item.name = name.trim();
            if (ipa !== undefined)
                item.ipa = ipa.trim();
            if (pos !== undefined)
                item.pos = pos.trim();
            if (definition)
                item.definition = definition.trim();
            if (exampleYoruba !== undefined)
                item.exampleYoruba = exampleYoruba.trim();
            if (exampleEnglish !== undefined)
                item.exampleEnglish = exampleEnglish.trim();
            if (parsedExtraFields)
                item.extraFields = parsedExtraFields;
            if (letter)
                item.letter = letter.trim();
            else if (name)
                item.letter = getLetterGroup(name);
            if (files?.image?.[0]) {
                item.imageData = files.image[0].buffer;
                item.imageMime = files.image[0].mimetype;
                item.imageUrl = publicMediaUrl(String(item._id), 'image');
                item.hasPicture = true;
            }
            else if (removeImage === 'true') {
                item.imageData = undefined;
                item.imageMime = null;
                item.imageUrl = null;
                item.hasPicture = false;
            }
            if (files?.audio?.[0]) {
                item.audioData = files.audio[0].buffer;
                item.audioMime = files.audio[0].mimetype;
                item.audioUrl = publicMediaUrl(String(item._id), 'audio');
                item.hasAudio = true;
            }
            else if (removeAudio === 'true') {
                item.audioData = undefined;
                item.audioMime = null;
                item.audioUrl = null;
                item.hasAudio = false;
            }
            const updated = await item.save();
            res.json({
                success: true,
                message: 'Medicinal entry updated successfully',
                data: updated,
            });
            return;
        }
        // Local storage update
        const items = getLocalData();
        const index = items.findIndex((i) => i._id === id || i.id === id);
        if (index === -1) {
            res.status(404).json({ success: false, message: 'Entry not found' });
            return;
        }
        const item = items[index];
        if (name)
            item.name = name.trim();
        if (ipa !== undefined)
            item.ipa = ipa.trim();
        if (pos !== undefined)
            item.pos = pos.trim();
        if (definition)
            item.definition = definition.trim();
        if (exampleYoruba !== undefined)
            item.exampleYoruba = exampleYoruba.trim();
        if (exampleEnglish !== undefined)
            item.exampleEnglish = exampleEnglish.trim();
        if (parsedExtraFields)
            item.extraFields = parsedExtraFields;
        if (letter)
            item.letter = letter.trim();
        else if (name)
            item.letter = getLetterGroup(name);
        if (files?.image?.[0]) {
            item.imageData = files.image[0].buffer.toString('base64');
            item.imageMime = files.image[0].mimetype;
            item.imageUrl = publicMediaUrl(item._id, 'image');
            item.hasPicture = true;
        }
        else if (removeImage === 'true') {
            item.imageData = null;
            item.imageMime = null;
            item.imageUrl = null;
            item.hasPicture = false;
        }
        if (files?.audio?.[0]) {
            item.audioData = files.audio[0].buffer.toString('base64');
            item.audioMime = files.audio[0].mimetype;
            item.audioUrl = publicMediaUrl(item._id, 'audio');
            item.hasAudio = true;
        }
        else if (removeAudio === 'true') {
            item.audioData = null;
            item.audioMime = null;
            item.audioUrl = null;
            item.hasAudio = false;
        }
        item.updatedAt = new Date().toISOString();
        items[index] = item;
        saveLocalData(items);
        res.json({
            success: true,
            message: 'Medicinal entry updated successfully (Local Storage)',
            data: withoutMediaPayload(item),
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to update medicinal entry',
            error: error.message,
        });
    }
}
// 5. Delete medicinal
export async function deleteMedicinal(req, res) {
    try {
        const id = req.params.id;
        if (isDbConnected()) {
            const item = await Medicinal.findByIdAndDelete(id);
            if (!item) {
                res.status(404).json({ success: false, message: 'Entry not found' });
                return;
            }
            if (item.imageUrl && item.imageUrl.startsWith('/uploads/')) {
                const imgPath = path.resolve(process.cwd(), item.imageUrl.replace(/^\//, ''));
                if (fs.existsSync(imgPath)) {
                    try {
                        fs.unlinkSync(imgPath);
                    }
                    catch (_) { }
                }
            }
            if (item.audioUrl && item.audioUrl.startsWith('/uploads/')) {
                const audPath = path.resolve(process.cwd(), item.audioUrl.replace(/^\//, ''));
                if (fs.existsSync(audPath)) {
                    try {
                        fs.unlinkSync(audPath);
                    }
                    catch (_) { }
                }
            }
            res.json({ success: true, message: 'Entry deleted successfully' });
            return;
        }
        // Local storage delete
        const items = getLocalData();
        const index = items.findIndex((i) => i._id === id || i.id === id);
        if (index === -1) {
            res.status(404).json({ success: false, message: 'Entry not found' });
            return;
        }
        const [deleted] = items.splice(index, 1);
        saveLocalData(items);
        if (deleted.imageUrl && deleted.imageUrl.startsWith('/uploads/')) {
            const imgPath = path.resolve(process.cwd(), deleted.imageUrl.replace(/^\//, ''));
            if (fs.existsSync(imgPath)) {
                try {
                    fs.unlinkSync(imgPath);
                }
                catch (_) { }
            }
        }
        if (deleted.audioUrl && deleted.audioUrl.startsWith('/uploads/')) {
            const audPath = path.resolve(process.cwd(), deleted.audioUrl.replace(/^\//, ''));
            if (fs.existsSync(audPath)) {
                try {
                    fs.unlinkSync(audPath);
                }
                catch (_) { }
            }
        }
        res.json({ success: true, message: 'Entry deleted successfully (Local Storage)' });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to delete entry',
            error: error.message,
        });
    }
}
// 6. Get Summary Stats
export async function getStats(req, res) {
    try {
        if (isDbConnected()) {
            const totalEntries = await Medicinal.countDocuments();
            const audioCount = await Medicinal.countDocuments({ hasAudio: true });
            const imageCount = await Medicinal.countDocuments({ hasPicture: true });
            const letters = await Medicinal.distinct('letter');
            const categories = await Medicinal.distinct('category');
            res.json({
                success: true,
                data: {
                    totalEntries,
                    audioCount,
                    imageCount,
                    letterCount: letters.length,
                    letters: letters.sort(),
                    categories: categories.sort(),
                },
            });
            return;
        }
        const items = getLocalData();
        const totalEntries = items.length;
        const audioCount = items.filter((i) => i.hasAudio).length;
        const imageCount = items.filter((i) => i.hasPicture).length;
        const letters = Array.from(new Set(items.map((i) => i.letter))).sort();
        const categories = Array.from(new Set(items.map((i) => i.category))).sort();
        res.json({
            success: true,
            data: {
                totalEntries,
                audioCount,
                imageCount,
                letterCount: letters.length,
                letters,
                categories,
            },
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to calculate stats',
            error: error.message,
        });
    }
}
