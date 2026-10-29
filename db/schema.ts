import {sqliteTable,text,integer,index} from 'drizzle-orm/sqlite-core';
export const documents=sqliteTable('documents',{
 id:text('id').primaryKey(),owner:text('owner').notNull(),createdBy:text('created_by'),name:text('name').notNull(),body:text('body').notNull(),
 revision:integer('revision').notNull().default(1),createdAt:integer('created_at').notNull(),updatedAt:integer('updated_at').notNull(),deletedAt:integer('deleted_at'),
},t=>[index('documents_owner_updated').on(t.owner,t.updatedAt)]);
export const documentVersions=sqliteTable('document_versions',{
 id:text('id').primaryKey(),documentId:text('document_id').notNull(),owner:text('owner').notNull(),
 name:text('name').notNull(),body:text('body').notNull(),label:text('label').notNull(),
 revision:integer('revision').notNull(),createdAt:integer('created_at').notNull(),kind:text('kind').notNull().default('named'),
},t=>[index('versions_document_created').on(t.documentId,t.createdAt,t.id)]);
