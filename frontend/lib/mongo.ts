/**
 * Singleton MongoClient. Next.js will import this from API routes and server
 * components; in dev the module is re-evaluated on every hot reload, so we
 * cache the client on globalThis to avoid exhausting Atlas connection slots.
 *
 * Two pieces of dev UX matter here:
 *   1. Fail fast. The Mongo driver's default `serverSelectionTimeoutMS` is 30s,
 *      which makes the dev experience awful when local mongod is offline. We
 *      drop it to 4s so the API can return a clear JSON error quickly.
 *   2. Self-healing cache. If `connect()` rejects, the cached promise stays
 *      rejected forever — every subsequent request returns the same error
 *      without retrying. We clear the cache on rejection so the next request
 *      gets a fresh attempt (e.g. after the user starts mongod).
 */
import { MongoClient, type Db } from "mongodb";

const DB_NAME = process.env.MONGODB_DB || "unwritten";

declare global {
  // eslint-disable-next-line no-var
  var __unwrittenMongoClient: Promise<MongoClient> | undefined;
}

export class MongoConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MongoConfigError";
  }
}

function buildClient(): Promise<MongoClient> {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    return Promise.reject(
      new MongoConfigError(
        "MONGODB_URI is not set. Add it to frontend/.env.local (Atlas SRV string or mongodb://…), or start a local mongod on :27017.",
      ),
    );
  }
  const client = new MongoClient(uri, {
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 4000,
    connectTimeoutMS: 4000,
  });
  return client.connect();
}

function freshClient(): Promise<MongoClient> {
  const p = buildClient();
  p.catch(() => {
    if (global.__unwrittenMongoClient === p) {
      global.__unwrittenMongoClient = undefined;
    }
  });
  return p;
}

export async function getMongoClient(): Promise<MongoClient> {
  if (!global.__unwrittenMongoClient) {
    global.__unwrittenMongoClient = freshClient();
  }
  return global.__unwrittenMongoClient;
}

export async function getDb(): Promise<Db> {
  const client = await getMongoClient();
  return client.db(DB_NAME);
}

/**
 * Recognises common "Mongo isn't reachable" failures so the API layer can
 * convert them to a friendly 503 instead of a generic 500.
 */
export function isMongoUnreachableError(err: unknown): boolean {
  if (err instanceof MongoConfigError) return true;
  const message = err instanceof Error ? err.message : "";
  const name = err instanceof Error ? err.name : "";
  return (
    /MongoServerSelectionError|ServerSelectionTimeoutError|MongoNetworkError/i.test(
      name,
    ) ||
    /ECONNREFUSED|ETIMEDOUT|ENOTFOUND|getaddrinfo|connect ECONN/i.test(message)
  );
}

/** Build a user-safe message for any DB error encountered in an API route. */
export function describeMongoError(err: unknown): string {
  if (err instanceof MongoConfigError) return err.message;
  if (isMongoUnreachableError(err)) {
    return "Database unavailable. Start MongoDB locally (`brew services start mongodb-community`, or `docker run -p 27017:27017 mongo:7`) or set MONGODB_URI to your Atlas connection string in frontend/.env.local.";
  }
  return err instanceof Error ? err.message : "Unknown database error.";
}
