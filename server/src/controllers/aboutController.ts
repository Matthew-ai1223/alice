import { Request, Response } from 'express';
import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { About } from '../models/About.js';
import { DEFAULT_ABOUT, type AboutContent } from '../data/aboutContent.js';

let memoryAbout: AboutContent | null = null;

function isDbConnected(): boolean {
  return mongoose.connection.readyState === 1;
}

function getAboutFilePath(): string {
  const serverPath = path.resolve(process.cwd(), 'server', 'data', 'about.json');
  if (fs.existsSync(serverPath)) return serverPath;
  const directPath = path.resolve(process.cwd(), 'data', 'about.json');
  if (fs.existsSync(directPath)) return directPath;
  const relativeData = path.resolve(process.cwd(), 'data');
  if (fs.existsSync(relativeData)) return path.join(relativeData, 'about.json');
  return serverPath;
}

function mergeAbout(partial: Partial<AboutContent> | null | undefined): AboutContent {
  return { ...DEFAULT_ABOUT, ...(partial || {}) };
}

function readLocalAbout(): AboutContent {
  if (memoryAbout) return memoryAbout;

  const filePath = getAboutFilePath();
  if (fs.existsSync(filePath)) {
    try {
      const raw = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      memoryAbout = mergeAbout(raw);
      return memoryAbout;
    } catch (_) {}
  }

  memoryAbout = { ...DEFAULT_ABOUT };
  try {
    const dirPath = path.dirname(filePath);
    if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify(memoryAbout, null, 2), 'utf-8');
  } catch (_) {}
  return memoryAbout;
}

function saveLocalAbout(data: AboutContent): void {
  memoryAbout = data;
  const filePath = getAboutFilePath();
  try {
    const dirPath = path.dirname(filePath);
    if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
  } catch (_) {
    console.warn('[About Notice] Filesystem is read-only, updated in-memory state.');
  }
}

function toPublicAbout(doc: Record<string, any>): AboutContent {
  const { _id, __v, key, createdAt, updatedAt, ...rest } = doc;
  return mergeAbout(rest);
}

export async function getAbout(_req: Request, res: Response): Promise<void> {
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
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to load About page content',
      error: error.message,
    });
  }
}

export async function updateAbout(req: Request, res: Response): Promise<void> {
  try {
    const incoming = { ...(req.body || {}) } as Partial<AboutContent>;
    delete (incoming as any).key;
    delete (incoming as any)._id;
    delete (incoming as any).id;

    if (isDbConnected()) {
      const updated = await About.findOneAndUpdate(
        { key: 'about' },
        { $set: { key: 'about', ...incoming } },
        { new: true, upsert: true, setDefaultsOnInsert: true }
      );
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
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to update About page',
      error: error.message,
    });
  }
}

export async function updateAboutPortrait(req: Request, res: Response): Promise<void> {
  try {
    const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
    const file = files?.image?.[0];
    if (!file) {
      res.status(400).json({ success: false, message: 'Please choose a portrait image.' });
      return;
    }

    const portraitUrl = `/uploads/images/${file.filename}`;

    if (isDbConnected()) {
      const updated = await About.findOneAndUpdate(
        { key: 'about' },
        { $set: { portraitUrl } },
        { new: true, upsert: true, setDefaultsOnInsert: true }
      );
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
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to update portrait',
      error: error.message,
    });
  }
}
