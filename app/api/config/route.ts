import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { MongoClient } from 'mongodb';

const MONGODB_URI = process.env.MONGODB_URI!;
const DB_NAME = process.env.MONGODB_DB_NAME || 'oh_my_note';
const DEFAULT_CONFIG_PATH = path.join(process.cwd(), 'data', 'config.json');

const DEFAULT_CONFIG = {
  categories: ['AI 应用开发', 'AI 工具调用', 'RAG', '大模型基础', 'Spring AI', '编程技术'],
  tags: ['Tool Calling', 'Function Calling', 'MCP', 'Agent', '向量数据库', 'LangChain', 'Spring AI', '应用开发'],
};

let mongoAvailable: boolean | null = null;
let lastCheckTime = 0;
const RETRY_INTERVAL_MS = 60000;

function getDefaultConfig() {
  try {
    if (fs.existsSync(DEFAULT_CONFIG_PATH)) {
      const raw = fs.readFileSync(DEFAULT_CONFIG_PATH, 'utf-8');
      return JSON.parse(raw);
    }
  } catch { }
  return DEFAULT_CONFIG;
}

function shouldTryMongo(): boolean {
  const now = Date.now();
  if (mongoAvailable === true) return true;
  if (mongoAvailable === false && now - lastCheckTime < RETRY_INTERVAL_MS) return false;
  return true;
}

function setMongoStatus(available: boolean) {
  mongoAvailable = available;
  lastCheckTime = Date.now();
}

async function getDb() {
  const client = new MongoClient(MONGODB_URI, {
    serverSelectionTimeoutMS: 5000,
    maxPoolSize: 5,
    tls: true,
    tlsAllowInvalidCertificates: false,
    connectTimeoutMS: 5000,
    socketTimeoutMS: 10000,
  });
  await client.connect();
  return { client, db: client.db(DB_NAME) };
}

export async function GET() {
  if (!shouldTryMongo()) {
    return NextResponse.json({ success: true, data: getDefaultConfig() });
  }

  let client: MongoClient | null = null;
  try {
    const result = await getDb();
    client = result.client;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const coll = result.db.collection('config') as any;
    const doc = await coll.findOne({ _id: 'site_config' });

    setMongoStatus(true);

    if (doc) {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { _id, ...data } = doc;
      return NextResponse.json({ success: true, data });
    }

    const fallback = getDefaultConfig();
    return NextResponse.json({ success: true, data: fallback });
  } catch (error) {
    setMongoStatus(false);
    console.warn('[config] MongoDB 不可用，使用本地配置:', (error as Error).message);
    const fallback = getDefaultConfig();
    return NextResponse.json({ success: true, data: fallback });
  } finally {
    if (client) await client.close();
  }
}

export async function POST(request: Request) {
  if (!shouldTryMongo()) {
    return NextResponse.json(
      { success: false, message: 'MongoDB 当前不可用，请稍后再试或检查网络连接' },
      { status: 503 }
    );
  }

  let client: MongoClient | null = null;
  try {
    const body = await request.json();
    const result = await getDb();
    client = result.client;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const coll = result.db.collection('config') as any;

    const existing = await coll.findOne({ _id: 'site_config' });
    setMongoStatus(true);

    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    if (body.categories) updateData.categories = body.categories;
    if (body.tags) updateData.tags = body.tags;

    if (existing) {
      await coll.updateOne(
        { _id: 'site_config' },
        { $set: updateData }
      );
    } else {
      await coll.insertOne({
        _id: 'site_config',
        categories: body.categories || DEFAULT_CONFIG.categories,
        tags: body.tags || DEFAULT_CONFIG.tags,
        createdAt: new Date(),
        ...updateData,
      });
    }

    const doc = await coll.findOne({ _id: 'site_config' });
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { _id, ...data } = doc || {};
    return NextResponse.json({ success: true, data });
  } catch (error) {
    setMongoStatus(false);
    console.error('[config] 保存失败:', error);

    if ((error as Error).message?.includes('SSL') || (error as Error).message?.includes('tls')) {
      return NextResponse.json(
        { success: false, message: 'MongoDB 连接失败（SSL 错误），可能是网络问题。配置已回退到本地模式，60秒后自动重试。' },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { success: false, message: '保存配置失败' },
      { status: 500 }
    );
  } finally {
    if (client) await client.close();
  }
}
