import mongoose from 'mongoose';

// Disable buffering so operations fail immediately or fallback cleanly if MongoDB is offline
mongoose.set('bufferCommands', false);

let cachedPromise: Promise<typeof mongoose> | null = null;

export async function connectDB(): Promise<void> {
  // If already connected, reuse connection
  if (mongoose.connection.readyState === 1) {
    return;
  }

  // If a connection attempt is in progress, wait for it
  if (cachedPromise) {
    await cachedPromise;
    return;
  }

  const uri = process.env.MONGODB_URI;
  if (!uri && process.env.VERCEL) {
    console.warn(`[Database Notice] MONGODB_URI not set on Vercel. Operating with persistent/fallback storage.`);
    return;
  }

  const targetUri = uri || 'mongodb://127.0.0.1:27017/yoruba_medicinal';

  cachedPromise = mongoose.connect(targetUri, {
    serverSelectionTimeoutMS: 4000,
    connectTimeoutMS: 4000,
  }).then((m) => {
    console.log(`[Database] MongoDB connected successfully to: ${m.connection.host}/${m.connection.name}`);
    return m;
  }).catch((err: any) => {
    cachedPromise = null;
    console.warn(`[Database Notice] MongoDB is currently offline or unreachable (${err.message}).`);
    console.warn(`[Database Notice] Falling back to local/in-memory storage.`);
    return mongoose;
  });

  await cachedPromise;
}

