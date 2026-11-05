import {sqliteTable,text,integer,index} from 'drizzle-orm/sqlite-core';
export const documents=sqliteTable('documents',{
 id:text('id').primaryKey(),owner:text('owner').notNull(),createdBy:text('created_by'),name:text('name').notNull(),body:text('body').notNull(),
 bodyBytes:integer('body_bytes'),
 revision:integer('revision').notNull().default(1),createdAt:integer('created_at').notNull(),updatedAt:integer('updated_at').notNull(),deletedAt:integer('deleted_at'),
},t=>[index('documents_owner_updated').on(t.owner,t.updatedAt)]);
export const documentVersions=sqliteTable('document_versions',{
 id:text('id').primaryKey(),documentId:text('document_id').notNull(),owner:text('owner').notNull(),
 name:text('name').notNull(),body:text('body').notNull(),bodyBytes:integer('body_bytes'),label:text('label').notNull(),
 revision:integer('revision').notNull(),createdAt:integer('created_at').notNull(),kind:text('kind').notNull().default('named'),
},t=>[index('versions_document_created').on(t.documentId,t.createdAt,t.id),index('versions_owner').on(t.owner)]);
// Tracker rows for large bodies in R2 (`documents/<sha256>`): size for storage
// accounting and last write time for the unreferenced-object sweep.
export const documentObjects=sqliteTable('document_objects',{
 id:text('id').primaryKey(),bytes:integer('bytes').notNull(),touchedAt:integer('touched_at').notNull(),
});
export const storageMaintenance=sqliteTable('storage_maintenance',{
 id:text('id').primaryKey(),nextRun:integer('next_run').notNull(),cursor:text('cursor'),
});
