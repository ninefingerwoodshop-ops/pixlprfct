import {sqliteTable,text,integer,index} from 'drizzle-orm/sqlite-core';
export const documents=sqliteTable('documents',{
 id:text('id').primaryKey(),owner:text('owner').notNull(),name:text('name').notNull(),body:text('body').notNull(),
 revision:integer('revision').notNull().default(1),createdAt:integer('created_at').notNull(),updatedAt:integer('updated_at').notNull(),deletedAt:integer('deleted_at'),
},t=>[index('documents_owner_updated').on(t.owner,t.updatedAt)]);
