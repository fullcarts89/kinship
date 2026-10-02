// Device finding (Checkpoint B closeout, B1.2): transactions must run on the
// one keyed SQLCipher connection. A second connection has no key.
import { wrapKeyedConnection } from "@/store/expoPlatform";

function fakeConnection() {
  const log: string[] = [];
  let failNext = false;
  const conn = {
    async execAsync(sql: string) {
      log.push(sql.trim());
    },
    async runAsync(sql: string) {
      await new Promise((r) => setTimeout(r, 1));
      if (failNext) {
        failNext = false;
        throw new Error("boom");
      }
      log.push(sql.trim());
      return { changes: 1, lastInsertRowId: 0 };
    },
    async getAllAsync() {
      return [];
    },
    async getFirstAsync() {
      return null;
    },
    async closeAsync() {
      log.push("close");
    },
  };
  return { conn: conn as never, log, failNext: () => (failNext = true) };
}

it("commits a transaction on the same connection, with explicit BEGIN/COMMIT", async () => {
  const { conn, log } = fakeConnection();
  const db = wrapKeyedConnection(conn);
  await db.transaction(async (tx) => {
    await tx.run("INSERT 1");
    await tx.run("INSERT 2");
  });
  expect(log).toEqual(["BEGIN IMMEDIATE;", "INSERT 1", "INSERT 2", "COMMIT;"]);
});

it("rolls back on failure and rethrows", async () => {
  const { conn, log, failNext } = fakeConnection();
  const db = wrapKeyedConnection(conn);
  failNext();
  await expect(db.transaction(async (tx) => tx.run("INSERT x"))).rejects.toThrow("boom");
  expect(log).toEqual(["BEGIN IMMEDIATE;", "ROLLBACK;"]);
});

it("never lets another write land inside an open transaction", async () => {
  const { conn, log } = fakeConnection();
  const db = wrapKeyedConnection(conn);
  const t = db.transaction(async (tx) => {
    await tx.run("A1");
    await tx.run("A2");
  });
  const outside = db.run("B");
  await Promise.all([t, outside]);
  expect(log).toEqual(["BEGIN IMMEDIATE;", "A1", "A2", "COMMIT;", "B"]);
});
