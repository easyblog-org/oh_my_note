#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { MongoClient } = require('mongodb');
const matter = require('gray-matter');
require('dotenv').config();

const ARTICLES_DIR = path.join(__dirname, '..', 'content', 'articles');

const config = {
  mongoUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/oh_my_note',
  dbName: process.env.MONGODB_DB_NAME || 'oh_my_note',
  collectionName: process.env.MONGODB_COLLECTION || 'articles',
  cleanupOrphaned: process.env.CLEANUP_ORPHANED === 'true'
};

function validateConfig() {
  const errors = [];
  const warnings = [];

  if (!config.mongoUri) {
    errors.push('MONGODB_URI 环境变量未设置');
  } else if (config.mongoUri === 'mongodb://localhost:27017/oh_my_note') {
    if (!process.env.CI) {
      warnings.push('使用默认 MongoDB URI (localhost)');
    } else {
      errors.push('MONGODB_URI 环境变量未设置（CI 环境）');
    }
  } else {
    // 检查 URI 格式
    const uriTrimmed = config.mongoUri.trim();
    if (!uriTrimmed.startsWith('mongodb://') && !uriTrimmed.startsWith('mongodb+srv://')) {
      errors.push(`MONGODB_URI 格式无效: 应以 'mongodb://' 或 'mongodb+srv://' 开头`);
      errors.push(`当前值前 30 个字符: "${config.mongoUri.substring(0, 30)}..."`);
      errors.push('常见问题: 值中包含了双引号或额外空格');
    }

    // 检查是否包含引号
    if ((config.mongoUri.startsWith('"') && config.mongoUri.endsWith('"')) ||
      (config.mongoUri.startsWith("'") && config.mongoUri.endsWith("'"))) {
      errors.push('MONGODB_URI 不应包含引号（请移除值两端的引号）');
    }
  }

  // 输出警告
  if (warnings.length > 0 && !process.env.CI) {
    console.warn('\n⚠️  警告:');
    warnings.forEach(warn => console.warn(`   - ${warn}`));
  }

  // 输出错误
  if (errors.length > 0) {
    console.error('\n❌ 配置错误:');
    errors.forEach(err => console.error(`   - ${err}`));
    console.error('\n📖 解决方案:');
    console.error('   1. 检查 .env 文件或 GitHub Secrets');
    console.error('   2. 确保 MONGODB_URI 值不包含引号');
    console.error('   3. 正确格式: mongodb+srv://user:pass@host/?options');
    return false;
  }

  return true;
}

async function readAllArticles() {
  const articles = [];

  if (!fs.existsSync(ARTICLES_DIR)) {
    console.error(`❌ 文章目录不存在: ${ARTICLES_DIR}`);
    return articles;
  }

  const files = fs.readdirSync(ARTICLES_DIR).filter(file => file.endsWith('.md'));

  for (const file of files) {
    const filePath = path.join(ARTICLES_DIR, file);
    const fileContent = fs.readFileSync(filePath, 'utf-8');

    try {
      const { data, content } = matter(fileContent);

      if (!data.slug) {
        console.warn(`⚠️  跳过无 slug 的文件: ${file}`);
        continue;
      }

      const article = {
        slug: data.slug,
        title: data.title || '',
        date: data.date ? new Date(data.date) : new Date(),
        category: data.category || '',
        tags: Array.isArray(data.tags) ? data.tags : [],
        summary: data.summary || '',
        featured: data.featured || false,
        status: data.status || 'published',
        content: content,
        updatedAt: new Date()
      };

      articles.push(article);
      console.log(`✅ 已解析: ${file} (slug: ${data.slug})`);
    } catch (error) {
      console.error(`❌ 解析失败 ${file}:`, error.message);
    }
  }

  return articles;
}

async function syncToMongoDB(articles) {
  const client = new MongoClient(config.mongoUri, {
    serverSelectionTimeoutMS: 30000,
    connectTimeoutMS: 30000,
    socketTimeoutMS: 45000,
    maxPoolSize: 10,
    minPoolSize: 1
  });

  try {
    console.log(`\n⏳ 正在连接 MongoDB...`);
    await client.connect();
    console.log(`📦 已连接到 MongoDB`);

    const db = client.db(config.dbName);
    const collection = db.collection(config.collectionName);

    await collection.createIndex({ slug: 1 }, { unique: true });
    await collection.createIndex({ status: 1, date: -1 });

    let updatedCount = 0;
    let insertedCount = 0;

    for (const article of articles) {
      const result = await collection.updateOne(
        { slug: article.slug },
        { $set: article },
        { upsert: true }
      );

      if (result.upsertedCount > 0) {
        insertedCount++;
        console.log(`➕ 新增文章: ${article.title} (${article.slug})`);
      } else {
        updatedCount++;
        console.log(`🔄 更新文章: ${article.title} (${article.slug})`);
      }
    }

    if (config.cleanupOrphaned) {
      const currentSlugs = articles.map(a => a.slug);
      const deleteResult = await collection.deleteMany({
        slug: { $nin: currentSlugs }
      });

      if (deleteResult.deletedCount > 0) {
        console.log(`\n🗑️  清理了 ${deleteResult.deletedCount} 篇已删除的文章`);
      }
    }

    console.log('\n========== 同步完成 ==========');
    console.log(`📊 总计处理: ${articles.length} 篇文章`);
    console.log(`➕ 新增: ${insertedCount} 篇`);
    console.log(`🔄 更新: ${updatedCount} 篇`);
    console.log(`📚 数据库: ${config.dbName}.${config.collectionName}`);

  } catch (error) {
    console.error('\n❌ 同步失败:', error.message);
    throw error;
  } finally {
    await client.close();
    console.log('🔒 已断开 MongoDB 连接\n');
  }
}

async function main() {
  console.log('====================================');
  console.log('🚀 开始同步文章到 MongoDB...');
  console.log('====================================');

  if (process.env.CI) {
    console.log('🔄 运行环境: GitHub Actions CI');
  }

  if (!validateConfig()) {
    process.exit(1);
  }

  console.log(`\n📋 配置信息:`);
  console.log(`   数据库: ${config.dbName}`);
  console.log(`   集合: ${config.collectionName}`);
  console.log(`   清理孤立文档: ${config.cleanupOrphaned ? '是' : '否'}`);
  console.log('');

  const startTime = Date.now();

  try {
    const articles = await readAllArticles();

    if (articles.length === 0) {
      console.log('⚠️  没有找到任何文章');
      return;
    }

    console.log(`\n📝 找到 ${articles.length} 篇文章，开始同步...\n`);
    await syncToMongoDB(articles);

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`⏱️  总耗时: ${duration} 秒`);

  } catch (error) {
    console.error('\n💥 执行出错:', error);
    process.exit(1);
  }
}

main();
