import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";
import { SCHEMA } from "./schema.ts";

// 保存先は SQLite（無料）。会社（org）ごとにデータを分ける設計で、
// 他社提供のときは Postgres へ差し替えられるよう、SQL はこのファイルと repo.ts に閉じる。
const globalForDb = globalThis as unknown as { __db?: DatabaseSync };

function open(): DatabaseSync {
  const file = process.env.DB_PATH ?? path.join(process.cwd(), "data", "app.db");
  if (file !== ":memory:") fs.mkdirSync(path.dirname(file), { recursive: true });
  const db = new DatabaseSync(file);
  db.exec("PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;");
  db.exec(SCHEMA);
  return db;
}

export function db(): DatabaseSync {
  if (!globalForDb.__db) globalForDb.__db = open();
  return globalForDb.__db;
}
