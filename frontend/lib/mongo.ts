/**
 * Singleton MongoClient. Next.js will import this from API routes and server
 * components; in dev the module is re-evaluated on every hot reload, so we
 * cache the client on globalThis to avoid exhausting Atlas connection slots.
 *
 * MONGODB_URI must be set (an Atlas SRV string or local mongodb://).
 */
import { MongoClient, type Db } from "mongodb";

const DB_NAME = process.env.MONGODB_DB || "unwritten";

declare global {
  // eslint-disable-next-line no-var
  var __unwrittenMongoClient: Promise<MongoClient> | undefined;
}

function buildClient(): Promise<MongoClient> {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error(
      "MONGODB_URI is not set. Add it to frontend/.env.local (Atlas SRV or mongodb://… string).",
    );
  }
  const client = new MongoClient(uri, {
    maxPoolSize: 10,
  });
  return client.connect();
}

const clientPromise: Promise<MongoClient> =
  global.__unwrittenMongoClient ?? (global.__unwrittenMongoClient = buildClient());

export async function getMongoClient(): Promise<MongoClient> {
  return clientPromise;
}

export async function getDb(): Promise<Db> {
  const client = await clientPromise;
  return client.db(DB_NAME);
}
