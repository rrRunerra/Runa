const DB_NAME = "aquila-search-db";
const STORE_NAME = "search_history";
const DB_VERSION = 2;

export interface SearchHistoryEntry {
  category: string;
  query: string;
  timestamp: number;
}

export interface OpenedItemEntry {
  category: string;
  id: string;
  title: {
    romaji: string;
    english: string;
  };
  coverImage: {
    large: string;
  };
  isAdult: boolean;
  openedAt: number;
}

export function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined") {
      reject(new Error("IndexedDB is not available on the server"));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: ["category", "query"] });
        store.createIndex("category_idx", "category", { unique: false });
        store.createIndex("timestamp_idx", "timestamp", { unique: false });
      }
      if (!db.objectStoreNames.contains("recently_opened")) {
        const store = db.createObjectStore("recently_opened", { keyPath: ["category", "id"] });
        store.createIndex("category_idx", "category", { unique: false });
        store.createIndex("opened_at_idx", "openedAt", { unique: false });
      }
    };
  });
}

export async function getSearchHistory(category: string): Promise<string[]> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, "readonly");
      const store = transaction.objectStore(STORE_NAME);
      const index = store.index("category_idx");
      const request = index.getAll(IDBKeyRange.only(category));

      request.onsuccess = () => {
        const results: SearchHistoryEntry[] = request.result;
        const sortedQueries = results
          .sort((a, b) => b.timestamp - a.timestamp)
          .map((item) => item.query);
        resolve(sortedQueries.slice(0, 4));
      };

      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.error("Failed to get search history", err);
    return [];
  }
}

export async function addSearchQuery(category: string, query: string): Promise<void> {
  const trimmed = query.trim();
  if (!trimmed) return;

  try {
    const db = await openDB();
    return new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, "readwrite");
      const store = transaction.objectStore(STORE_NAME);

      store.put({
        category,
        query: trimmed,
        timestamp: Date.now(),
      });

      const index = store.index("category_idx");
      const getRequest = index.getAll(IDBKeyRange.only(category));

      getRequest.onsuccess = () => {
        const results: SearchHistoryEntry[] = getRequest.result;
        const now = Date.now();

        // Smart prefix cleanup: delete items from the same typing session (within 15s)
        // that are prefixes of the new query.
        results.forEach((item) => {
          const isPrefix =
            item.query !== trimmed &&
            trimmed.toLowerCase().startsWith(item.query.toLowerCase());
          const isRecent = now - item.timestamp < 15000;
          if (isPrefix && isRecent) {
            store.delete([item.category, item.query]);
          }
        });

        // Re-fetch or filter the list to prune to 10
        const remaining = results.filter(
          (item) =>
            !(
              item.query !== trimmed &&
              trimmed.toLowerCase().startsWith(item.query.toLowerCase()) &&
              now - item.timestamp < 15000
            )
        );
        const sorted = remaining.sort((a, b) => b.timestamp - a.timestamp);
        
        if (sorted.length > 4) {
          const excess = sorted.slice(4);
          excess.forEach((item) => {
            store.delete([item.category, item.query]);
          });
        }
      };

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  } catch (err) {
    console.error("Failed to add search query", err);
  }
}

export async function deleteSearchQuery(category: string, query: string): Promise<void> {
  try {
    const db = await openDB();
    return new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, "readwrite");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete([category, query]);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.error("Failed to delete search query", err);
  }
}

export async function clearSearchHistory(category: string): Promise<void> {
  try {
    const db = await openDB();
    return new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, "readwrite");
      const store = transaction.objectStore(STORE_NAME);
      const index = store.index("category_idx");
      const getRequest = index.getAll(IDBKeyRange.only(category));

      getRequest.onsuccess = () => {
        const results: SearchHistoryEntry[] = getRequest.result;
        results.forEach((item) => {
          store.delete([item.category, item.query]);
        });
      };

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  } catch (err) {
    console.error("Failed to clear search history", err);
  }
}

export async function getRecentlyOpened(category: string): Promise<OpenedItemEntry[]> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction("recently_opened", "readonly");
      const store = transaction.objectStore("recently_opened");
      const index = store.index("category_idx");
      const request = index.getAll(IDBKeyRange.only(category));

      request.onsuccess = () => {
        const results: OpenedItemEntry[] = request.result;
        const sorted = results.sort((a, b) => b.openedAt - a.openedAt);
        resolve(sorted.slice(0, 12));
      };

      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.error("Failed to get recently opened items", err);
    return [];
  }
}

export async function addRecentlyOpened(
  category: string,
  item: Omit<OpenedItemEntry, "openedAt" | "category">
): Promise<void> {
  try {
    const db = await openDB();
    return new Promise<void>((resolve, reject) => {
      const transaction = db.transaction("recently_opened", "readwrite");
      const store = transaction.objectStore("recently_opened");

      store.put({
        ...item,
        category,
        openedAt: Date.now(),
      });

      const index = store.index("category_idx");
      const getRequest = index.getAll(IDBKeyRange.only(category));

      getRequest.onsuccess = () => {
        const results: OpenedItemEntry[] = getRequest.result;
        const sorted = results.sort((a, b) => b.openedAt - a.openedAt);
        if (sorted.length > 12) {
          const excess = sorted.slice(12);
          excess.forEach((item) => {
            store.delete([item.category, item.id]);
          });
        }
      };

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  } catch (err) {
    console.error("Failed to add recently opened item", err);
  }
}

export async function deleteRecentlyOpened(category: string, id: string): Promise<void> {
  try {
    const db = await openDB();
    return new Promise<void>((resolve, reject) => {
      const transaction = db.transaction("recently_opened", "readwrite");
      const store = transaction.objectStore("recently_opened");
      const request = store.delete([category, id]);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.error("Failed to delete recently opened item", err);
  }
}

export async function clearRecentlyOpened(category: string): Promise<void> {
  try {
    const db = await openDB();
    return new Promise<void>((resolve, reject) => {
      const transaction = db.transaction("recently_opened", "readwrite");
      const store = transaction.objectStore("recently_opened");
      const index = store.index("category_idx");
      const getRequest = index.getAll(IDBKeyRange.only(category));

      getRequest.onsuccess = () => {
        const results: OpenedItemEntry[] = getRequest.result;
        results.forEach((item) => {
          store.delete([item.category, item.id]);
        });
      };

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  } catch (err) {
    console.error("Failed to clear recently opened items", err);
  }
}
