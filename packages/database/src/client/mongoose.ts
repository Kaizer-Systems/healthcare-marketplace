import mongoose from 'mongoose';

let cachedConnection: typeof mongoose | null = null;

export async function connectMongoose(uri?: string): Promise<typeof mongoose> {
  if (cachedConnection) return cachedConnection;
  const mongoUri = uri ?? process.env.MONGODB_URI ?? 'mongodb://localhost:27017/grip-health';
  cachedConnection = await mongoose.connect(mongoUri);
  return cachedConnection;
}

export async function disconnectMongoose(): Promise<void> {
  if (cachedConnection) {
    await mongoose.disconnect();
    cachedConnection = null;
  }
}
