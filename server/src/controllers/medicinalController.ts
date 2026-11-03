import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { Medicinal } from '../models/Medicinal.js';
import { SEED_DATA } from '../data/seedData.js';
import fs from 'fs';
import path from 'path';

// In-memory cache for serverless/read-only environments
let memoryData: LocalEntry[] | null = null;

function getDataFilePath(): string {
  const serverPath = path.resolve(process.cwd(), 'server', 'data', 'medicinals.json');
  if (fs.existsSync(serverPath)) return serverPath;
  const directPath = path.resolve(process.cwd(), 'data', 'medicinals.json');
  if (fs.existsSync(directPath)) return directPath;
  const relativeData = path.resolve(process.cwd(), 'data');
  if (fs.existsSync(relativeData)) return path.join(relativeData, 'medicinals.json');
  return serverPath;
}

function isDbConnected(): boolean {
  return mongoose.connection.readyState === 1;
}

// Local file-backed storage helpers
interface LocalEntry {
  _id: string;
  id: string;
  name: string;
  ipa: string;
  pos: string;
  category: string;
  definition: string;
  exampleYoruba: string;
  exampleEnglish: string;
  imageUrl: string | null;
  audioUrl: string | null;
  hasAudio: boolean;
  hasPicture: boolean;
  letter: string;
  createdAt: string;
  updatedAt: string;
}

function getLocalData(): LocalEntry[] {
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
    } catch (_) {}
  }

  // Initialize with seed data
  const initial: LocalEntry[] = SEED_DATA.map((item, index) => {
    const slug = item.name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');
    const now = new Date().toISOString();
    return {
      _id: `local_${index + 1}_${Date.now()}`,
      id: slug,
      ...item,
      audioUrl: null,
      createdAt: now,
      updatedAt: now,
    };
  });

  try {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
    fs.writeFileSync(filePath, JSON.stringify(initial, null, 2), 'utf-8');
  } catch (err) {
    // Read-only filesystem (Vercel) - keep in memory
  }

  memoryData = initial;
  return memoryData;
}

function saveLocalData(data: LocalEntry[]): void {
  memoryData = data;
  const filePath = getDataFilePath();
  const dirPath = path.dirname(filePath);

  try {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.warn('[Medicinal Notice] Filesystem is read-only, updated in-memory state.');
  }
}

// Helper to determine the alphabetical group letter from Yorùbá headwords
function getLetterGroup(name: string): string {
  if (!name) return 'A';
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
export async function getAllMedicinals(req: Request, res: Response): Promise<void> {
  try {
    const { category, letter, hasAudio, hasPicture, search } = req.query;

    if (isDbConnected()) {
      const filter: Record<string, any> = {};

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
        ];
      }

      const items = await Medicinal.find(filter).sort({ letter: 1, name: 1 });
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
      items = items.filter(
        (item) =>
          item.name.toLowerCase().includes(q) ||
          item.definition.toLowerCase().includes(q) ||
          (item.ipa && item.ipa.toLowerCase().includes(q)) ||
          (item.exampleYoruba && item.exampleYoruba.toLowerCase().includes(q)) ||
          (item.exampleEnglish && item.exampleEnglish.toLowerCase().includes(q))
      );
    }

    items.sort((a, b) => a.name.localeCompare(b.name));

    res.json({
      success: true,
      count: items.length,
      data: items,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve medicinals',
      error: error.message,
    });
  }
}

// 2. Get single medicinal by ID
export async function getMedicinalById(req: Request, res: Response): Promise<void> {
  try {
    const id = req.params.id;

    if (isDbConnected()) {
      const item = await Medicinal.findById(id);
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

    res.json({ success: true, data: item });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Error retrieving entry', error: error.message });
  }
}

// 3. Create new medicinal with file uploads
export async function createMedicinal(req: Request, res: Response): Promise<void> {
  try {
    const {
      name,
      ipa,
      pos,
      category,
      definition,
      exampleYoruba,
      exampleEnglish,
      letter,
    } = req.body;

    if (!name || !category || !definition) {
      res.status(400).json({
        success: false,
        message: 'Name, Category, and Definition are required fields.',
      });
      return;
    }

    const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
    let imageUrl: string | null = null;
    let audioUrl: string | null = null;

    if (files?.image && files.image[0]) {
      imageUrl = `/uploads/images/${files.image[0].filename}`;
    }
    if (files?.audio && files.audio[0]) {
      audioUrl = `/uploads/audio/${files.audio[0].filename}`;
    }

    const determinedLetter = letter ? String(letter).trim() : getLetterGroup(name);

    if (isDbConnected()) {
      const newMedicinal = new Medicinal({
        name: name.trim(),
        ipa: (ipa || '').trim(),
        pos: (pos || 'n.').trim(),
        category: category.trim().toLowerCase(),
        definition: definition.trim(),
        exampleYoruba: (exampleYoruba || '').trim(),
        exampleEnglish: (exampleEnglish || '').trim(),
        letter: determinedLetter,
        imageUrl,
        audioUrl,
        hasPicture: Boolean(imageUrl),
        hasAudio: Boolean(audioUrl),
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

    const newEntry: LocalEntry = {
      _id: newId,
      id: slug || newId,
      name: name.trim(),
      ipa: (ipa || '').trim(),
      pos: (pos || 'n.').trim(),
      category: category.trim().toLowerCase(),
      definition: definition.trim(),
      exampleYoruba: (exampleYoruba || '').trim(),
      exampleEnglish: (exampleEnglish || '').trim(),
      letter: determinedLetter,
      imageUrl,
      audioUrl,
      hasPicture: Boolean(imageUrl),
      hasAudio: Boolean(audioUrl),
      createdAt: now,
      updatedAt: now,
    };

    items.push(newEntry);
    saveLocalData(items);

    res.status(201).json({
      success: true,
      message: 'Medicinal entry created successfully (Local Storage)',
      data: newEntry,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to create medicinal entry',
      error: error.message,
    });
  }
}

// 4. Update medicinal
export async function updateMedicinal(req: Request, res: Response): Promise<void> {
  try {
    const id = req.params.id;
    const {
      name,
      ipa,
      pos,
      category,
      definition,
      exampleYoruba,
      exampleEnglish,
      letter,
      removeImage,
      removeAudio,
    } = req.body;

    const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;

    if (isDbConnected()) {
      const item = await Medicinal.findById(id);
      if (!item) {
        res.status(404).json({ success: false, message: 'Entry not found' });
        return;
      }

      if (name) item.name = name.trim();
      if (ipa !== undefined) item.ipa = ipa.trim();
      if (pos !== undefined) item.pos = pos.trim();
      if (category) item.category = category.trim().toLowerCase();
      if (definition) item.definition = definition.trim();
      if (exampleYoruba !== undefined) item.exampleYoruba = exampleYoruba.trim();
      if (exampleEnglish !== undefined) item.exampleEnglish = exampleEnglish.trim();
      if (letter) item.letter = letter.trim();
      else if (name) item.letter = getLetterGroup(name);

      // Handle Image replacement or removal
      if (files?.image && files.image[0]) {
        if (item.imageUrl && item.imageUrl.startsWith('/uploads/')) {
          const oldPath = path.resolve(process.cwd(), item.imageUrl.replace(/^\//, ''));
          if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
        }
        item.imageUrl = `/uploads/images/${files.image[0].filename}`;
        item.hasPicture = true;
      } else if (removeImage === 'true') {
        if (item.imageUrl && item.imageUrl.startsWith('/uploads/')) {
          const oldPath = path.resolve(process.cwd(), item.imageUrl.replace(/^\//, ''));
          if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
        }
        item.imageUrl = null;
        item.hasPicture = false;
      }

      // Handle Audio replacement or removal
      if (files?.audio && files.audio[0]) {
        if (item.audioUrl && item.audioUrl.startsWith('/uploads/')) {
          const oldPath = path.resolve(process.cwd(), item.audioUrl.replace(/^\//, ''));
          if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
        }
        item.audioUrl = `/uploads/audio/${files.audio[0].filename}`;
        item.hasAudio = true;
      } else if (removeAudio === 'true') {
        if (item.audioUrl && item.audioUrl.startsWith('/uploads/')) {
          const oldPath = path.resolve(process.cwd(), item.audioUrl.replace(/^\//, ''));
          if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
        }
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
    if (name) item.name = name.trim();
    if (ipa !== undefined) item.ipa = ipa.trim();
    if (pos !== undefined) item.pos = pos.trim();
    if (category) item.category = category.trim().toLowerCase();
    if (definition) item.definition = definition.trim();
    if (exampleYoruba !== undefined) item.exampleYoruba = exampleYoruba.trim();
    if (exampleEnglish !== undefined) item.exampleEnglish = exampleEnglish.trim();
    if (letter) item.letter = letter.trim();
    else if (name) item.letter = getLetterGroup(name);

    if (files?.image && files.image[0]) {
      if (item.imageUrl && item.imageUrl.startsWith('/uploads/')) {
        const oldPath = path.resolve(process.cwd(), item.imageUrl.replace(/^\//, ''));
        if (fs.existsSync(oldPath)) {
          try { fs.unlinkSync(oldPath); } catch (_) {}
        }
      }
      item.imageUrl = `/uploads/images/${files.image[0].filename}`;
      item.hasPicture = true;
    } else if (removeImage === 'true') {
      if (item.imageUrl && item.imageUrl.startsWith('/uploads/')) {
        const oldPath = path.resolve(process.cwd(), item.imageUrl.replace(/^\//, ''));
        if (fs.existsSync(oldPath)) {
          try { fs.unlinkSync(oldPath); } catch (_) {}
        }
      }
      item.imageUrl = null;
      item.hasPicture = false;
    }

    if (files?.audio && files.audio[0]) {
      if (item.audioUrl && item.audioUrl.startsWith('/uploads/')) {
        const oldPath = path.resolve(process.cwd(), item.audioUrl.replace(/^\//, ''));
        if (fs.existsSync(oldPath)) {
          try { fs.unlinkSync(oldPath); } catch (_) {}
        }
      }
      item.audioUrl = `/uploads/audio/${files.audio[0].filename}`;
      item.hasAudio = true;
    } else if (removeAudio === 'true') {
      if (item.audioUrl && item.audioUrl.startsWith('/uploads/')) {
        const oldPath = path.resolve(process.cwd(), item.audioUrl.replace(/^\//, ''));
        if (fs.existsSync(oldPath)) {
          try { fs.unlinkSync(oldPath); } catch (_) {}
        }
      }
      item.audioUrl = null;
      item.hasAudio = false;
    }

    item.updatedAt = new Date().toISOString();
    items[index] = item;
    saveLocalData(items);

    res.json({
      success: true,
      message: 'Medicinal entry updated successfully (Local Storage)',
      data: item,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to update medicinal entry',
      error: error.message,
    });
  }
}

// 5. Delete medicinal
export async function deleteMedicinal(req: Request, res: Response): Promise<void> {
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
          try { fs.unlinkSync(imgPath); } catch (_) {}
        }
      }
      if (item.audioUrl && item.audioUrl.startsWith('/uploads/')) {
        const audPath = path.resolve(process.cwd(), item.audioUrl.replace(/^\//, ''));
        if (fs.existsSync(audPath)) {
          try { fs.unlinkSync(audPath); } catch (_) {}
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
        try { fs.unlinkSync(imgPath); } catch (_) {}
      }
    }
    if (deleted.audioUrl && deleted.audioUrl.startsWith('/uploads/')) {
      const audPath = path.resolve(process.cwd(), deleted.audioUrl.replace(/^\//, ''));
      if (fs.existsSync(audPath)) {
        try { fs.unlinkSync(audPath); } catch (_) {}
      }
    }

    res.json({ success: true, message: 'Entry deleted successfully (Local Storage)' });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to delete entry',
      error: error.message,
    });
  }
}

// 6. Get Summary Stats
export async function getStats(req: Request, res: Response): Promise<void> {
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
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to calculate stats',
      error: error.message,
    });
  }
}
