import { Mutex, tryAcquire } from "async-mutex";

/**
 * An abstraction over the client's revision number cache. Provides a cache,
 * keyed by public key and data key and protected by a mutex to guard against
 * concurrent access to the cache. Each cache entry also has its own mutex, to
 * protect against concurrent access to that entry.
 */
export class RevisionNumberCache {
  private mutex: Mutex;
  private cache: { [key: string]: CachedRevisionNumber };

  /**
   * Creates the `RevisionNumberCache`.
   */
  constructor() {
    this.mutex = new Mutex();
    this.cache = {};
  }

  /**
   * Gets the revision cache key for the given public key and data key.
   *
   * @param publicKey - The given public key.
   * @param dataKey - The given data key.
   * @returns - The revision cache key.
   */
  static getCacheKey(publicKey: string, dataKey: string): string {
    return `${publicKey}/${dataKey}`;
  }

  /**
   * Gets an object containing the cached revision and the mutex for the entry.
   * The revision and mutex will be initialized if the entry is not yet cached.
   *
   * @param publicKey - The given public key.
   * @param dataKey - The given data key.
   * @returns - The cached revision entry object.
   */
  async getRevisionAndMutexForEntry(publicKey: string, dataKey: string): Promise<CachedRevisionNumber> {
    const cacheKey = RevisionNumberCache.getCacheKey(publicKey, dataKey);

    // Block until the mutex is available for the cache.
    return await this.mutex.runExclusive(async () => {
      if (!this.cache[cacheKey]) {
        this.cache[cacheKey] = new CachedRevisionNumber();
      }
      return this.cache[cacheKey];
    });
  }

  /**
   * Calls `exclusiveFn` with exclusive access to the given cached entry. The
   * revision number of the entry can be safely updated in `exclusiveFn`.
   *
   * @param publicKey - The given public key.
   * @param dataKey - The given data key.
   * @param exclusiveFn - A function to call with exclusive access to the given cached entry.
   * @returns - A promise containing the result of calling `exclusiveFn`.
   */
  async withCachedEntryLock<T>(
    publicKey: string,
    dataKey: string,
    exclusiveFn: (cachedRevisionEntry: CachedRevisionNumber) => Promise<T>
  ): Promise<T> {
    // Safely get or create mutex for the requested entry.
    const cachedRevisionEntry = await this.getRevisionAndMutexForEntry(publicKey, dataKey);

    try {
      return await tryAcquire(cachedRevisionEntry.mutex).runExclusive(async () => exclusiveFn(cachedRevisionEntry));
    } catch (e) {
      // Change mutex error to be more descriptive and user-friendly.
      if ((e as Error).message.includes("mutex already locked")) {
        throw new Error(
          `Concurrent access prevented in SkyDB for entry { publicKey: ${publicKey}, dataKey: ${dataKey} }`
        );
      } else {
        throw e;
      }
    }
  }
}

/**
 * An object containing a cached revision and a corresponding mutex. The
 * revision can be internally updated and it will reflect in the client's cache.
 */
export class CachedRevisionNumber {
  mutex: Mutex;
  revision: bigint;

  /**
   * Creates a `CachedRevisionNumber`.
   */
  constructor() {
    this.mutex = new Mutex();
    this.revision = BigInt(-1);
  }
}
