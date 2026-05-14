import { openDB } from 'idb';

const DB_NAME = 'glass-keep';
const DB_VERSION = 2;

let dbPromise = null;

function getDb() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion) {
        if (oldVersion < 1) {
          db.createObjectStore('notes', { keyPath: 'id' });
          const pendingStore = db.createObjectStore('pending', { keyPath: 'id', autoIncrement: true });
          pendingStore.createIndex('timestamp', 'timestamp');
          db.createObjectStore('meta', { keyPath: 'key' });
        }
        if (oldVersion < 2) {
          if (!db.objectStoreNames.contains('pending')) {
            const pendingStore = db.createObjectStore('pending', { keyPath: 'id', autoIncrement: true });
            pendingStore.createIndex('timestamp', 'timestamp');
          }
        }
      },
    });
  }
  return dbPromise;
}

export async function getAllNotesFromDb() {
  try {
    const db = await getDb();
    return (await db.getAll('notes')) || [];
  } catch (e) {
    console.error('DB: Failed to get all notes', e);
    return [];
  }
}

export async function getNoteFromDb(id) {
  try {
    const db = await getDb();
    return await db.get('notes', id);
  } catch (e) {
    console.error('DB: Failed to get note', id, e);
    return null;
  }
}

export async function saveNotesToDb(notes) {
  if (!Array.isArray(notes)) return;
  try {
    const db = await getDb();
    const tx = db.transaction('notes', 'readwrite');
    await Promise.all([
      ...notes.map((n) => tx.store.put(n)),
      tx.done,
    ]);
  } catch (e) {
    console.error('DB: Failed to save notes', e);
  }
}

export async function saveNoteToDb(note) {
  if (!note || !note.id) return;
  try {
    const db = await getDb();
    await db.put('notes', note);
  } catch (e) {
    console.error('DB: Failed to save note', note.id, e);
  }
}

export async function removeNoteFromDb(id) {
  try {
    const db = await getDb();
    await db.delete('notes', id);
  } catch (e) {
    console.error('DB: Failed to remove note', id, e);
  }
}

export async function clearAllNotesFromDb() {
  try {
    const db = await getDb();
    await db.clear('notes');
  } catch (e) {
    console.error('DB: Failed to clear notes', e);
  }
}

export async function addPendingOp(op) {
  try {
    const db = await getDb();
    return await db.add('pending', {
      type: op.type,
      noteId: op.noteId,
      note: op.note,
      timestamp: op.timestamp || Date.now(),
      retries: 0,
    });
  } catch (e) {
    console.error('DB: Failed to add pending op', e);
  }
}

export async function getPendingOps() {
  try {
    const db = await getDb();
    const ops = await db.getAll('pending');
    return (ops || []).sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
  } catch (e) {
    console.error('DB: Failed to get pending ops', e);
    return [];
  }
}

export async function removePendingOp(id) {
  try {
    const db = await getDb();
    await db.delete('pending', id);
  } catch (e) {
    console.error('DB: Failed to remove pending op', id, e);
  }
}

export async function updatePendingOp(id, updates) {
  try {
    const db = await getDb();
    const existing = await db.get('pending', id);
    if (existing) {
      await db.put('pending', { ...existing, ...updates });
    }
  } catch (e) {
    console.error('DB: Failed to update pending op', id, e);
  }
}

export async function clearPendingOps() {
  try {
    const db = await getDb();
    await db.clear('pending');
  } catch (e) {
    console.error('DB: Failed to clear pending ops', e);
  }
}
