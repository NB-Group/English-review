import type { UnifiedReviewEvent } from './unified-backend'

interface StoredEvent {
  owner: string
  event: UnifiedReviewEvent
}

let connection: Promise<IDBDatabase> | undefined

function database() {
  connection ??= new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open('study-review-sync', 1)
    request.onupgradeneeded = () => {
      const store = request.result.createObjectStore('reviews', { keyPath: ['owner', 'event.eventId'] })
      store.createIndex('owner', 'owner')
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
  return connection
}

async function transaction<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await database()
  return new Promise((resolve, reject) => {
    const tx = db.transaction('reviews', mode)
    const request = run(tx.objectStore('reviews'))
    tx.oncomplete = () => resolve(request.result)
    tx.onabort = () => reject(tx.error)
  })
}

export async function pendingReviews(owner: string) {
  const rows = await transaction<StoredEvent[]>('readonly', (store) => store.index('owner').getAll(owner))
  return rows.map(({ event }) => event).sort((a, b) => a.reviewedAtClient.localeCompare(b.reviewedAtClient))
}

export function enqueueReview(owner: string, event: UnifiedReviewEvent) {
  return transaction('readwrite', (store) => store.put({ owner, event }))
}

export function acknowledgeReview(owner: string, eventId: string) {
  return transaction('readwrite', (store) => store.delete([owner, eventId]))
}
