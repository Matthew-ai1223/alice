import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { Medicinal } from '../models/Medicinal.js';
import { SEED_DATA } from '../data/seedData.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

async function seedDatabase() {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/yoruba_medicinal';


  console.log(`[Seed] Connecting to MongoDB: ${uri}`);
  try {
    await mongoose.connect(uri);
    console.log('[Seed] Connected.');

    const count = await Medicinal.countDocuments();
    if (count > 0) {
      console.log(`[Seed] Database already contains ${count} entries. Clearing to refresh...`);
      await Medicinal.deleteMany({});
    }

    const inserted = await Medicinal.insertMany(SEED_DATA);
    console.log(`[Seed] Successfully inserted ${inserted.length} Yorùbá medicinal entries!`);
  } catch (err: any) {
    console.error(`[Seed Error] ${err.message}`);
  } finally {
    await mongoose.disconnect();
    console.log('[Seed] Disconnected.');
    process.exit(0);
  }
}

seedDatabase();
