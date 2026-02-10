import { pgTable, serial, text, vector, index, timestamp, varchar } from "drizzle-orm/pg-core";

export const documents = pgTable(
  "documents",
  {
    id: serial("id").primaryKey(),
    content: text("content").notNull(),
    embedding: vector("embedding", { dimensions: 1536 }), // text-embedding-3-small
    title: varchar("title", { length: 255 }),
    userId: varchar("user_id", { length: 255 }).notNull(),
    fileName: varchar("file_name", { length: 255 }),
    fileSize: serial("file_size"),
    chunkIndex: serial("chunk_index"),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => [
    index("embeddingIndex").using(
      "hnsw",
      table.embedding.op("vector_cosine_ops")
    ),
    index("userIdIndex").on(table.userId),
  ]
);

export const conversations = pgTable(
  "conversations",
  {
    id: serial("id").primaryKey(),
    userId: varchar("user_id", { length: 255 }).notNull(),
    title: varchar("title", { length: 255 }).notNull(),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [
    index("conversationUserIdIndex").on(table.userId),
  ]
);

export const messages = pgTable(
  "messages",
  {
    id: serial("id").primaryKey(),
    conversationId: serial("conversation_id").notNull(),
    role: varchar("role", { length: 20 }).notNull(), // 'user' or 'assistant'
    content: text("content").notNull(),
    sources: text("sources"), // JSON string of source documents
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => [
    index("conversationIdIndex").on(table.conversationId),
  ]
);

export type InsertDocument = typeof documents.$inferInsert;
export type SelectDocument = typeof documents.$inferSelect;
export type InsertConversation = typeof conversations.$inferInsert;
export type SelectConversation = typeof conversations.$inferSelect;
export type InsertMessage = typeof messages.$inferInsert;
export type SelectMessage = typeof messages.$inferSelect;