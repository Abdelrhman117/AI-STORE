// ═══════════════════════════════════════════
//  js/db.js — Firestore Database Helpers
// ═══════════════════════════════════════════

const DB = {

  // Add a document to a collection
  async add(collection, data) {
    return await db.collection(collection).add({
      ...data,
      createdAt:  firebase.firestore.FieldValue.serverTimestamp(),
      createdBy:  Auth.currentUser?.email || 'unknown'
    });
  },

  // Update a document by ID
  async update(collection, id, data) {
    return await db.collection(collection).doc(id).update({
      ...data,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    });
  },

  // Delete a document by ID
  async delete(collection, id) {
    return await db.collection(collection).doc(id).delete();
  },

  // Get all documents from a collection, ordered by createdAt desc
  async getAll(collection) {
    try {
      const snap = await db.collection(collection)
        .orderBy('createdAt', 'desc')
        .get();
      return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (err) {
      console.error(`DB.getAll(${collection}):`, err);
      return [];
    }
  },

  // Get documents within a date range (same field: createdAt)
  async getByDateRange(collection, fromDate, toDate) {
    try {
      const start = new Date(fromDate);
      start.setHours(0, 0, 0, 0);

      const end = new Date(toDate);
      end.setHours(23, 59, 59, 999);

      const snap = await db.collection(collection)
        .where('createdAt', '>=', start)
        .where('createdAt', '<=', end)
        .orderBy('createdAt', 'desc')
        .get();

      return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (err) {
      console.error(`DB.getByDateRange(${collection}):`, err);
      return [];
    }
  },

  // Get documents for today only
  async getToday(collection) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    try {
      const snap = await db.collection(collection)
        .where('createdAt', '>=', today)
        .where('createdAt', '<', tomorrow)
        .get();
      return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (err) {
      console.error(`DB.getToday(${collection}):`, err);
      return [];
    }
  },

  // Get documents for a specific day (for dashboard chart)
  async getForDay(collection, date) {
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(date);
    end.setHours(23, 59, 59, 999);

    try {
      const snap = await db.collection(collection)
        .where('createdAt', '>=', start)
        .where('createdAt', '<=', end)
        .get();
      return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (err) {
      return [];
    }
  }
};
