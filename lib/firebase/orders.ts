import { getAdminFirestore } from "@/lib/firebase/admin";
import type { OrderRecord } from "@/lib/orders";

const COLLECTION = "orders";

export async function saveOrder(order: OrderRecord): Promise<void> {
  const db = getAdminFirestore();
  if (!db) return;

  await db.collection(COLLECTION).doc(order.id).set(order);
}

export async function updateOrderMpesa(
  checkoutRequestId: string,
  update: Partial<OrderRecord["mpesa"]> & { status?: OrderRecord["status"] }
): Promise<void> {
  const db = getAdminFirestore();
  if (!db) return;

  const snap = await db
    .collection(COLLECTION)
    .where("mpesa.checkoutRequestId", "==", checkoutRequestId)
    .limit(1)
    .get();

  if (snap.empty) return;

  const doc = snap.docs[0];
  const existing = doc.data() as OrderRecord;

  await doc.ref.update({
    status: update.status ?? existing.status,
    updatedAt: new Date().toISOString(),
    mpesa: { ...existing.mpesa, ...update },
  });
}

export async function updateOrderById(
  id: string,
  patch: Partial<Omit<OrderRecord, "id">>
): Promise<void> {
  const db = getAdminFirestore();
  if (!db) return;

  await db
    .collection(COLLECTION)
    .doc(id)
    .update({ ...patch, updatedAt: new Date().toISOString() });
}

export async function getOrderById(id: string): Promise<OrderRecord | null> {
  const db = getAdminFirestore();
  if (!db) return null;

  const snap = await db.collection(COLLECTION).doc(id).get();
  if (!snap.exists) return null;
  return snap.data() as OrderRecord;
}
