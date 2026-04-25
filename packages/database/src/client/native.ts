import { MongoClient, type Db } from 'mongodb';

let cachedClient: MongoClient | null = null;

export async function getNativeClient(uri?: string): Promise<MongoClient> {
  if (cachedClient) return cachedClient;
  const mongoUri = uri ?? process.env.MONGODB_URI ?? 'mongodb://localhost:27017/grip-health';
  cachedClient = new MongoClient(mongoUri);
  await cachedClient.connect();
  return cachedClient;
}

export async function getNativeDb(dbName?: string): Promise<Db> {
  const client = await getNativeClient();
  return client.db(dbName ?? 'grip-health');
}
