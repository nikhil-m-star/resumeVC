import 'dotenv/config';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import process from 'node:process';
import { Client } from 'pg';

const repoRoot = path.resolve(process.cwd(), '..');
const sqlitePath = path.resolve(repoRoot, 'server/prisma/dev.db');
const postgresUrl = process.env.DATABASE_URL;

if (!postgresUrl || !postgresUrl.startsWith('postgres')) {
  throw new Error('DATABASE_URL must be a PostgreSQL/Neon URL before running this migration script.');
}

const runSqliteJson = (sql) => {
  const output = execFileSync('sqlite3', ['-json', sqlitePath, sql], { encoding: 'utf8' });
  return JSON.parse(output || '[]');
};

const normalizeDate = (value) => {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'number') {
    return new Date(value).toISOString();
  }
  if (typeof value === 'string' && /^[0-9]+$/.test(value)) {
    const asNumber = Number(value);
    if (Number.isFinite(asNumber)) {
      return new Date(asNumber).toISOString();
    }
  }
  return value;
};

const users = runSqliteJson('SELECT "id","email","password","name","avatarUrl","createdAt","updatedAt" FROM "User";');
const resumes = runSqliteJson('SELECT "id","title","description","isPublic","ownerId","content","createdAt","updatedAt","deletedAt" FROM "Resume";');
const resumeVersions = runSqliteJson('SELECT "id","resumeId","version","content","commitMsg","createdAt" FROM "ResumeVersion";');
const collaborators = runSqliteJson('SELECT "id","resumeId","userId","role","createdAt" FROM "Collaborator";');
const comments = runSqliteJson('SELECT "id","content","resumeId","userId","resolved","createdAt","updatedAt" FROM "Comment";');
const activityLogs = runSqliteJson('SELECT "id","action","details","userId","resumeId","createdAt" FROM "ActivityLog";');

const client = new Client({ connectionString: postgresUrl, ssl: { rejectUnauthorized: false } });
await client.connect();

try {
  await client.query('BEGIN');
  await client.query('TRUNCATE TABLE "ActivityLog","Comment","Collaborator","ResumeVersion","Resume","User" RESTART IDENTITY CASCADE');

  for (const row of users) {
    await client.query(
      'INSERT INTO "User" ("id","email","password","name","avatarUrl","createdAt","updatedAt") VALUES ($1,$2,$3,$4,$5,$6,$7)',
      [row.id, row.email, row.password, row.name, row.avatarUrl, normalizeDate(row.createdAt), normalizeDate(row.updatedAt)],
    );
  }

  for (const row of resumes) {
    await client.query(
      'INSERT INTO "Resume" ("id","title","description","isPublic","ownerId","content","createdAt","updatedAt","deletedAt") VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)',
      [row.id, row.title, row.description, row.isPublic, row.ownerId, row.content, normalizeDate(row.createdAt), normalizeDate(row.updatedAt), normalizeDate(row.deletedAt)],
    );
  }

  for (const row of resumeVersions) {
    await client.query(
      'INSERT INTO "ResumeVersion" ("id","resumeId","version","content","commitMsg","createdAt") VALUES ($1,$2,$3,$4,$5,$6)',
      [row.id, row.resumeId, row.version, row.content, row.commitMsg, normalizeDate(row.createdAt)],
    );
  }

  for (const row of collaborators) {
    await client.query(
      'INSERT INTO "Collaborator" ("id","resumeId","userId","role","createdAt") VALUES ($1,$2,$3,$4,$5)',
      [row.id, row.resumeId, row.userId, row.role, normalizeDate(row.createdAt)],
    );
  }

  for (const row of comments) {
    await client.query(
      'INSERT INTO "Comment" ("id","content","resumeId","userId","resolved","createdAt","updatedAt") VALUES ($1,$2,$3,$4,$5,$6,$7)',
      [row.id, row.content, row.resumeId, row.userId, row.resolved, normalizeDate(row.createdAt), normalizeDate(row.updatedAt)],
    );
  }

  for (const row of activityLogs) {
    await client.query(
      'INSERT INTO "ActivityLog" ("id","action","details","userId","resumeId","createdAt") VALUES ($1,$2,$3,$4,$5,$6)',
      [row.id, row.action, row.details, row.userId, row.resumeId, normalizeDate(row.createdAt)],
    );
  }

  await client.query('COMMIT');
  console.log(
    `Migration complete. Users=${users.length}, Resumes=${resumes.length}, Versions=${resumeVersions.length}, Collaborators=${collaborators.length}, Comments=${comments.length}, ActivityLogs=${activityLogs.length}`,
  );
} catch (error) {
  await client.query('ROLLBACK');
  throw error;
} finally {
  await client.end();
}
