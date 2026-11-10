import mongoose from 'mongoose';
mongoose.set('bufferCommands', false);
const globalForMongoose = globalThis;
function getCache() {
    if (!globalForMongoose.__mongooseCache) {
        globalForMongoose.__mongooseCache = { promise: null };
    }
    return globalForMongoose.__mongooseCache;
}
export const DB_UNAVAILABLE_MESSAGE = 'Database is unavailable. In MongoDB Atlas, Network Access must allow 0.0.0.0/0, and MONGODB_URI must be set in the Vercel project.';
export function isDbConnected() {
    return mongoose.connection.readyState === 1;
}
export function localFallbackBlocked(res) {
    if (!process.env.VERCEL)
        return false;
    res.status(503).json({
        success: false,
        message: DB_UNAVAILABLE_MESSAGE,
    });
    return true;
}
function attachConnectionListeners() {
    if (globalForMongoose.__mongooseListeners)
        return;
    globalForMongoose.__mongooseListeners = true;
    mongoose.connection.on('disconnected', () => {
        getCache().promise = null;
        console.warn('[Database] MongoDB disconnected.');
    });
    mongoose.connection.on('error', (err) => {
        getCache().promise = null;
        console.warn(`[Database] MongoDB connection error: ${err.message}`);
    });
}
export async function connectDB() {
    attachConnectionListeners();
    const uri = process.env.MONGODB_URI;
    if (!uri) {
        if (process.env.VERCEL) {
            console.warn('[Database Notice] MONGODB_URI is not set on Vercel.');
        }
        return;
    }
    if (mongoose.connection.readyState === 1) {
        return;
    }
    const cache = getCache();
    // Drop a stale resolved promise so a dropped connection can reconnect
    if (mongoose.connection.readyState === 0 || mongoose.connection.readyState === 3) {
        cache.promise = null;
    }
    if (!cache.promise) {
        cache.promise = (async () => {
            let lastError;
            for (let attempt = 1; attempt <= 3; attempt += 1) {
                try {
                    const m = await mongoose.connect(uri, {
                        serverSelectionTimeoutMS: 8000,
                        connectTimeoutMS: 8000,
                        socketTimeoutMS: 45000,
                        maxPoolSize: 1,
                        minPoolSize: 0,
                        family: 4,
                    });
                    console.log(`[Database] MongoDB connected successfully to: ${m.connection.host}/${m.connection.name}`);
                    return m;
                }
                catch (err) {
                    lastError = err;
                    if (attempt < 3) {
                        await new Promise((resolve) => setTimeout(resolve, 400 * attempt));
                    }
                }
            }
            throw lastError;
        })();
    }
    try {
        await cache.promise;
    }
    catch (err) {
        cache.promise = null;
        console.warn(`[Database Notice] MongoDB is currently offline or unreachable (${err.message}).`);
        if (!process.env.VERCEL) {
            console.warn('[Database Notice] Falling back to local/in-memory storage.');
        }
    }
}
