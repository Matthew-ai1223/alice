import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { Category } from '../models/Category.js';
import fs from 'fs';
import path from 'path';

// In-memory cache for serverless/read-only environments
let memoryCategories: LocalCategory[] | null = null;

function getCategoriesFilePath(): string {
  const serverPath = path.resolve(process.cwd(), 'server', 'data', 'categories.json');
  if (fs.existsSync(serverPath)) return serverPath;
  const directPath = path.resolve(process.cwd(), 'data', 'categories.json');
  if (fs.existsSync(directPath)) return directPath;
  // If running from server directory
  const relativeData = path.resolve(process.cwd(), 'data');
  if (fs.existsSync(relativeData)) return path.join(relativeData, 'categories.json');
  return serverPath;
}

function isDbConnected(): boolean {
  return mongoose.connection.readyState === 1;
}

// Default categories (matches the original hardcoded set)
const DEFAULT_CATEGORIES = [
  { name: 'Soup (Ọbẹ̀)', value: 'soup', color: '#2ecc71', order: 0 },
  { name: 'Swallow (Òkèlè)', value: 'swallow', color: '#9b59b6', order: 1 },
  { name: 'Stew (Ata)', value: 'stew', color: '#e74c3c', order: 2 },
  { name: 'Porridge (Àsáró / Ògì)', value: 'porridge', color: '#f39c12', order: 3 },
  { name: 'Pudding (Àbàrí / Mọ́ìn-mọ́ìn)', value: 'pudding', color: '#f1c40f', order: 4 },
  { name: 'Snack / Street food', value: 'snack', color: '#bdc3c7', order: 5 },
  { name: 'Herb / Botanical Flora', value: 'herb', color: '#2ecc71', order: 6 },
  { name: 'Infusion / Agbo', value: 'infusion', color: '#3498db', order: 7 },
];

// Local file-backed storage helpers
interface LocalCategory {
  _id: string;
  id: string;
  name: string;
  value: string;
  color: string;
  order: number;
  createdAt: string;
  updatedAt: string;
}

function getLocalCategories(): LocalCategory[] {
  if (memoryCategories && memoryCategories.length > 0) {
    return memoryCategories;
  }

  const filePath = getCategoriesFilePath();
  const dirPath = path.dirname(filePath);

  if (fs.existsSync(filePath)) {
    try {
      const raw = fs.readFileSync(filePath, 'utf-8');
      memoryCategories = JSON.parse(raw);
      return memoryCategories || [];
    } catch (_) {}
  }

  // Initialize with default categories
  const now = new Date().toISOString();
  const initial: LocalCategory[] = DEFAULT_CATEGORIES.map((cat, index) => ({
    _id: `cat_${index + 1}_${Date.now()}`,
    id: `cat_${index + 1}_${Date.now()}`,
    ...cat,
    createdAt: now,
    updatedAt: now,
  }));

  try {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
    fs.writeFileSync(filePath, JSON.stringify(initial, null, 2), 'utf-8');
  } catch (err) {
    // Read-only filesystem (Vercel) - keep in memory
  }

  memoryCategories = initial;
  return memoryCategories;
}

function saveLocalCategories(data: LocalCategory[]): void {
  memoryCategories = data;
  const filePath = getCategoriesFilePath();
  const dirPath = path.dirname(filePath);

  try {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    // On Vercel, read-only disk is expected, memoryCategories preserves the update
    console.warn('[Category Notice] Filesystem is read-only, updated in-memory state.');
  }
}

// 1. Get all categories
export async function getAllCategories(req: Request, res: Response): Promise<void> {
  try {
    if (isDbConnected()) {
      let items = await Category.find().sort({ order: 1, name: 1 });

      // If empty (first-time DB), seed the default categories
      if (items.length === 0) {
        await Category.insertMany(DEFAULT_CATEGORIES);
        items = await Category.find().sort({ order: 1, name: 1 });
      }

      res.json({ success: true, count: items.length, data: items });
      return;
    }

    // Fallback: Local file data
    const items = getLocalCategories();
    items.sort((a, b) => a.order - b.order);

    res.json({ success: true, count: items.length, data: items });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve categories',
      error: error.message,
    });
  }
}

// 2. Create a new category
export async function createCategory(req: Request, res: Response): Promise<void> {
  try {
    const { name, value, color, order } = req.body;

    if (!name || !value) {
      res.status(400).json({
        success: false,
        message: 'Category name and value are required.',
      });
      return;
    }

    const slug = value.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

    if (isDbConnected()) {
      // Check for duplicates
      const existing = await Category.findOne({ value: slug });
      if (existing) {
        res.status(409).json({
          success: false,
          message: `A category with value "${slug}" already exists.`,
        });
        return;
      }

      const newCat = new Category({
        name: name.trim(),
        value: slug,
        color: (color || '#c4953a').trim(),
        order: typeof order === 'number' ? order : 999,
      });

      const saved = await newCat.save();
      res.status(201).json({
        success: true,
        message: 'Category created successfully',
        data: saved,
      });
      return;
    }

    // Local storage creation
    const items = getLocalCategories();
    const exists = items.find((c) => c.value === slug);
    if (exists) {
      res.status(409).json({
        success: false,
        message: `A category with value "${slug}" already exists.`,
      });
      return;
    }

    const now = new Date().toISOString();
    const newId = `cat_${Date.now()}`;
    const newEntry: LocalCategory = {
      _id: newId,
      id: newId,
      name: name.trim(),
      value: slug,
      color: (color || '#c4953a').trim(),
      order: typeof order === 'number' ? order : 999,
      createdAt: now,
      updatedAt: now,
    };

    items.push(newEntry);
    saveLocalCategories(items);

    res.status(201).json({
      success: true,
      message: 'Category created successfully (Local Storage)',
      data: newEntry,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to create category',
      error: error.message,
    });
  }
}

// 3. Update a category
export async function updateCategory(req: Request, res: Response): Promise<void> {
  try {
    const id = req.params.id;
    const { name, value, color, order } = req.body;

    if (isDbConnected()) {
      const item = await Category.findById(id);
      if (!item) {
        res.status(404).json({ success: false, message: 'Category not found' });
        return;
      }

      const oldValue = item.value;
      if (name) item.name = name.trim();
      if (value) {
        const slug = value.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
        // Check no duplicate
        if (slug !== oldValue) {
          const duplicate = await Category.findOne({ value: slug, _id: { $ne: id } });
          if (duplicate) {
            res.status(409).json({
              success: false,
              message: `A category with value "${slug}" already exists.`,
            });
            return;
          }
        }
        item.value = slug;
      }
      if (color) item.color = color.trim();
      if (typeof order === 'number') item.order = order;

      const updated = await item.save();

      // If the slug changed, update all medicinals with the old category value
      if (value && item.value !== oldValue) {
        const { Medicinal } = await import('../models/Medicinal.js');
        await Medicinal.updateMany({ category: oldValue }, { category: item.value });
      }

      res.json({
        success: true,
        message: 'Category updated successfully',
        data: updated,
      });
      return;
    }

    // Local storage update
    const items = getLocalCategories();
    const index = items.findIndex((i) => i._id === id || i.id === id);
    if (index === -1) {
      res.status(404).json({ success: false, message: 'Category not found' });
      return;
    }

    const item = items[index];
    const oldValue = item.value;

    if (name) item.name = name.trim();
    if (value) {
      const slug = value.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
      const duplicate = items.find((c, i) => i !== index && c.value === slug);
      if (duplicate) {
        res.status(409).json({
          success: false,
          message: `A category with value "${slug}" already exists.`,
        });
        return;
      }
      item.value = slug;
    }
    if (color) item.color = color.trim();
    if (typeof order === 'number') item.order = order;
    item.updatedAt = new Date().toISOString();

    items[index] = item;
    saveLocalCategories(items);

    // If slug changed, update all medicinals with the old value
    if (item.value !== oldValue) {
      const medFile = path.join(path.dirname(getCategoriesFilePath()), 'medicinals.json');
      if (fs.existsSync(medFile)) {
        try {
          const medRaw = fs.readFileSync(medFile, 'utf-8');
          const meds = JSON.parse(medRaw);
          let changed = false;
          for (const med of meds) {
            if (med.category === oldValue) {
              med.category = item.value;
              changed = true;
            }
          }
          if (changed) {
            fs.writeFileSync(medFile, JSON.stringify(meds, null, 2), 'utf-8');
          }
        } catch (_) {}
      }
    }

    res.json({
      success: true,
      message: 'Category updated successfully (Local Storage)',
      data: item,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to update category',
      error: error.message,
    });
  }
}

// 4. Delete a category
export async function deleteCategory(req: Request, res: Response): Promise<void> {
  try {
    const id = req.params.id;

    if (isDbConnected()) {
      const item = await Category.findByIdAndDelete(id);
      if (!item) {
        res.status(404).json({ success: false, message: 'Category not found' });
        return;
      }

      res.json({ success: true, message: `Category "${item.name}" deleted successfully` });
      return;
    }

    // Local storage delete
    const items = getLocalCategories();
    const index = items.findIndex((i) => i._id === id || i.id === id);
    if (index === -1) {
      res.status(404).json({ success: false, message: 'Category not found' });
      return;
    }

    const [deleted] = items.splice(index, 1);
    saveLocalCategories(items);

    res.json({ success: true, message: `Category "${deleted.name}" deleted successfully (Local Storage)` });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to delete category',
      error: error.message,
    });
  }
}
