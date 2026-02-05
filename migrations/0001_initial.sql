-- Migration: Initial schema
-- Creates tables for templates, batches, and code items

-- 编码模板表
CREATE TABLE IF NOT EXISTS code_templates (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('一维码', '二维码')),
  prefix TEXT DEFAULT '',
  padding_length INTEGER DEFAULT 5,
  remark TEXT DEFAULT '',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 批次表
CREATE TABLE IF NOT EXISTS code_batches (
  id TEXT PRIMARY KEY,
  template_id TEXT NOT NULL,
  start_number INTEGER NOT NULL,
  end_number INTEGER NOT NULL,
  count INTEGER NOT NULL,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'void')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (template_id) REFERENCES code_templates(id)
);

-- 单码表
CREATE TABLE IF NOT EXISTS code_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  batch_id TEXT NOT NULL,
  serial_number INTEGER NOT NULL,
  code_text TEXT NOT NULL,
  is_printed INTEGER DEFAULT 0,
  printed_at DATETIME,
  FOREIGN KEY (batch_id) REFERENCES code_batches(id)
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_batches_template ON code_batches(template_id);
CREATE INDEX IF NOT EXISTS idx_batches_status ON code_batches(status);
CREATE INDEX IF NOT EXISTS idx_items_batch ON code_items(batch_id);
