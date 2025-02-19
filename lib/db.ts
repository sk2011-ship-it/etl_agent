import { MongoClient, Collection } from 'mongodb';

const uri = process.env.MONGODB_URI;

let client: MongoClient;
let clientPromise: Promise<MongoClient>;

if (!uri) {
  throw new Error('Please add your Mongodb URI to .env.local');
}

declare global {
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

if (process.env.NODE_ENV === 'development') {
  if (!global._mongoClientPromise) {
    client = new MongoClient(uri);
    global._mongoClientPromise = client.connect();
  }
  clientPromise = global._mongoClientPromise;
} else {
  client = new MongoClient(uri);
  clientPromise = client.connect();
}

export default clientPromise;

export async function getCollection(collectionName: string): Promise<Collection> {
  const client = await clientPromise;
  const db = client.db('etl_agent'); // Ensure this matches your database name
  return db.collection(collectionName);
}