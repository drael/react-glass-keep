import { getPendingOps, removePendingOp, saveNoteToDb, removeNoteFromDb, updatePendingOp } from './db.js';

export async function processPendingOps(api, token) {
  const ops = await getPendingOps();
  if (!ops.length) return { synced: 0, failed: 0 };

  let synced = 0;
  let failed = 0;

  for (const op of ops) {
    try {
      switch (op.type) {
        case 'create': {
          const body = { ...op.note };
          delete body._localOnly;
          delete body.id;
          const result = await api('/notes', { method: 'POST', token, body });
          if (result && result.id) {
            await removeNoteFromDb(op.noteId);
            await saveNoteToDb(result);
          }
          break;
        }
        case 'update': {
          const body = { ...op.note };
          delete body._localOnly;
          await api(`/notes/${op.noteId}`, { method: 'PUT', token, body });
          await saveNoteToDb({ ...op.note, _synced: true });
          break;
        }
        case 'patch': {
          const body = { ...op.body };
          await api(`/notes/${op.noteId}`, { method: 'PATCH', token, body });
          break;
        }
        case 'delete':
          await api(`/notes/${op.noteId}`, { method: 'DELETE', token });
          await removeNoteFromDb(op.noteId);
          break;
        case 'reorder': {
          const body = { pinnedIds: op.pinnedIds, otherIds: op.otherIds };
          await api('/notes/reorder', { method: 'POST', token, body });
          break;
        }
        case 'archive':
          await api(`/notes/${op.noteId}/archive`, {
            method: 'POST',
            token,
            body: { archived: op.archived },
          });
          break;
      }
      await removePendingOp(op.id);
      synced++;
    } catch (e) {
      if (e.isNetworkError) {
        const retries = (op.retries || 0) + 1;
        if (retries >= 10) {
          await removePendingOp(op.id);
          failed++;
        } else {
          await updatePendingOp(op.id, { retries });
          failed++;
        }
      } else {
        await removePendingOp(op.id);
        failed++;
      }
    }
  }

  return { synced, failed, total: ops.length };
}
