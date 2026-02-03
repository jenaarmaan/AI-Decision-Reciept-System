import * as sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite';
import path from 'path';
import { DecisionReceipt } from '../types/receipt';

let db: Database | null = null;

export const initDb = async () => {
  db = await open({
    filename: path.join(process.cwd(), 'adrs.db'),
    driver: sqlite3.Database
  });

  // Initialize Database Schema
  await db.exec(`
    CREATE TABLE IF NOT EXISTS receipts (
      id TEXT PRIMARY KEY,
      timestamp TEXT NOT NULL,
      requester_context TEXT NOT NULL,
      model_metadata TEXT NOT NULL,
      user_input TEXT NOT NULL,
      interpreted_intent TEXT,
      system_instructions TEXT NOT NULL,
      ai_output TEXT NOT NULL,
      retrieval_sources TEXT,
      reasoning_summary TEXT,
      decision_confidence REAL,
      approval_status TEXT,
      review_metadata TEXT
    );
  `);
};

export const saveReceipt = async (receipt: DecisionReceipt) => {
  if (!db) await initDb();

  const queryText = `
    INSERT INTO receipts (
      id, timestamp, requester_context, model_metadata, 
      user_input, interpreted_intent, system_instructions, ai_output, 
      retrieval_sources, reasoning_summary, decision_confidence, approval_status,
      review_metadata
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  await db!.run(queryText, [
    receipt.id,
    receipt.timestamp,
    JSON.stringify(receipt.requesterContext),
    JSON.stringify(receipt.modelMetadata),
    receipt.userInput,
    receipt.interpretedIntent || null,
    receipt.systemInstructions,
    receipt.aiOutput,
    receipt.retrievalSources ? JSON.stringify(receipt.retrievalSources) : null,
    receipt.reasoningSummary,
    receipt.decisionConfidence,
    receipt.approvalStatus || 'PENDING',
    receipt.reviewMetadata ? JSON.stringify(receipt.reviewMetadata) : null
  ]);
};

export const getReceiptById = async (id: string): Promise<DecisionReceipt | null> => {
  if (!db) await initDb();

  const row = await db!.get('SELECT * FROM receipts WHERE id = ?', [id]);
  if (!row) return null;

  return {
    id: row.id,
    timestamp: row.timestamp,
    requesterContext: JSON.parse(row.requester_context),
    modelMetadata: JSON.parse(row.model_metadata),
    userInput: row.user_input,
    interpretedIntent: row.interpreted_intent,
    systemInstructions: row.system_instructions,
    aiOutput: row.ai_output,
    retrievalSources: row.retrieval_sources ? JSON.parse(row.retrieval_sources) : null,
    reasoningSummary: row.reasoning_summary,
    decisionConfidence: row.decision_confidence,
    approvalStatus: row.approval_status,
    reviewMetadata: row.review_metadata ? JSON.parse(row.review_metadata) : null
  } as DecisionReceipt;
};

export const updateReceiptReview = async (id: string, status: 'APPROVED' | 'REJECTED', reviewData: any) => {
  if (!db) await initDb();
  await db!.run(
    'UPDATE receipts SET approval_status = ?, review_metadata = ? WHERE id = ?',
    [status, JSON.stringify(reviewData), id]
  );
};

export const listReceipts = async (limit: number = 50): Promise<DecisionReceipt[]> => {
  if (!db) await initDb();
  const rows = await db!.all('SELECT * FROM receipts ORDER BY timestamp DESC LIMIT ?', [limit]);
  return rows.map(row => ({
    id: row.id,
    timestamp: row.timestamp,
    requesterContext: JSON.parse(row.requester_context),
    modelMetadata: JSON.parse(row.model_metadata),
    userInput: row.user_input,
    interpretedIntent: row.interpreted_intent,
    systemInstructions: row.system_instructions,
    aiOutput: row.ai_output,
    retrievalSources: row.retrieval_sources ? JSON.parse(row.retrieval_sources) : null,
    reasoningSummary: row.reasoning_summary,
    decisionConfidence: row.decision_confidence,
    approvalStatus: row.approval_status,
    reviewMetadata: row.review_metadata ? JSON.parse(row.review_metadata) : null
  }));
};

export const getAllReceipts = async (): Promise<DecisionReceipt[]> => {
  if (!db) await initDb();
  const rows = await db!.all('SELECT * FROM receipts');
  return rows.map(row => ({
    id: row.id,
    timestamp: row.timestamp,
    requesterContext: JSON.parse(row.requester_context),
    modelMetadata: JSON.parse(row.model_metadata),
    userInput: row.user_input,
    interpretedIntent: row.interpreted_intent,
    systemInstructions: row.system_instructions,
    aiOutput: row.ai_output,
    retrievalSources: row.retrieval_sources ? JSON.parse(row.retrieval_sources) : null,
    reasoningSummary: row.reasoning_summary,
    decisionConfidence: row.decision_confidence,
    approvalStatus: row.approval_status,
    reviewMetadata: row.review_metadata ? JSON.parse(row.review_metadata) : null
  }));
};
