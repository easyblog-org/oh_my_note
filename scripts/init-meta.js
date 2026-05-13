#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');

const ARTICLES_DIR = path.join(__dirname, '..', 'content', 'articles');

class SnowflakeIdGenerator {
  constructor() {
    this.epoch = 1700000000000n;
    this.workerId = BigInt(Math.floor(Math.random() * 1024));
    this.sequence = 0n;
    this.lastTimestamp = -1n;
  }

  nextId() {
    let timestamp = BigInt(Date.now());

    if (timestamp === this.lastTimestamp) {
      this.sequence = (this.sequence + 1n) & 4095n;
      if (this.sequence === 0n) {
        timestamp = this.waitNextMillis(timestamp);
      }
    } else {
      this.sequence = 0n;
    }

    this.lastTimestamp = timestamp;

    const id = ((timestamp - this.epoch) << 22n) |
      (this.workerId << 12n) |
      this.sequence;

    return id.toString();
  }

  waitNextMillis(lastTimestamp) {
    let timestamp = BigInt(Date.now());
    while (timestamp <= lastTimestamp) {
      timestamp = BigInt(Date.now());
    }
    return timestamp;
  }
}

const snowflake = new SnowflakeIdGenerator();

function generateSlugWithSnowflake() {
  return snowflake.nextId();
}

function generateTitleFromFileName(fileName) {
  return fileName
    .replace(/\.md$/, '')
    .replace(/[-_]+/g, ' ')
    .replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
}

function getFileInfo(filePath) {
  try {
    const stats = fs.statSync(filePath);
    return {
      createdAt: stats.birthtime,
      modifiedAt: stats.mtime
    };
  } catch (error) {
    return {
      createdAt: new Date(),
      modifiedAt: new Date()
    };
  }
}

function removeHtmlTags(markdownContent) {
  return markdownContent
    .replace(/<font[^>]*>/gi, '')
    .replace(/<\/font>/gi, '');
}

function cleanHtmlTags(filePath, fileContent) {
  const originalLength = fileContent.length;
  const cleanedContent = removeHtmlTags(fileContent);
  const cleanedLength = cleanedContent.length;
  const removedChars = originalLength - cleanedLength;

  if (removedChars > 0) {
    fs.writeFileSync(filePath, cleanedContent, 'utf-8');
    return {
      cleaned: true,
      originalLength,
      cleanedLength,
      removedChars,
      percentage: ((removedChars / originalLength) * 100).toFixed(1)
    };
  }

  return {
    cleaned: false,
    originalLength,
    cleanedLength,
    removedChars: 0,
    percentage: '0.0'
  };
}

async function initMetadataForArticles() {
  console.log('====================================');
  console.log('🔧 初始化文章（清理HTML + 元数据）');
  console.log('====================================\n');

  if (!fs.existsSync(ARTICLES_DIR)) {
    console.error(`❌ 文章目录不存在: ${ARTICLES_DIR}`);
    process.exit(1);
  }

  const files = fs.readdirSync(ARTICLES_DIR).filter(file => file.endsWith('.md'));

  if (files.length === 0) {
    console.log('⚠️  没有找到任何 Markdown 文件');
    return;
  }

  console.log(`📂 找到 ${files.length} 篇文章\n`);

  let updatedCount = 0;
  let skippedCount = 0;
  let totalCleanedFiles = 0;
  let totalRemovedChars = 0;

  for (const file of files) {
    const filePath = path.join(ARTICLES_DIR, file);
    let fileContent = fs.readFileSync(filePath, 'utf-8');
    const fileInfo = getFileInfo(filePath);

    try {
      console.log(`📖 处理: ${file}`);

      const cleanResult = cleanHtmlTags(filePath, fileContent);

      if (cleanResult.cleaned) {
        totalCleanedFiles++;
        totalRemovedChars += cleanResult.removedChars;
        console.log(`   🧹 已清理 HTML 标签: 移除 ${cleanResult.removedChars} 字符 (${cleanResult.percentage}%)`);

        fileContent = fs.readFileSync(filePath, 'utf-8');
      }

      const { data, content } = matter(fileContent);
      let needsUpdate = false;
      const updatedData = { ...data };
      const changes = [];

      if (!updatedData.slug) {
        updatedData.slug = generateSlugWithSnowflake();
        needsUpdate = true;
        changes.push(`slug: "${updatedData.slug}"`);
      }

      if (!updatedData.date || isNaN(new Date(updatedData.date).getTime())) {
        updatedData.date = fileInfo.modifiedAt.toISOString().split('T')[0];
        needsUpdate = true;
        changes.push(`date: "${updatedData.date}"`);
      }

      if (!updatedData.title || updatedData.title.trim() === '') {
        updatedData.title = generateTitleFromFileName(file);
        needsUpdate = true;
        changes.push(`title: "${updatedData.title}"`);
      }

      if (needsUpdate) {
        const updatedFile = matter.stringify(content, updatedData);
        fs.writeFileSync(filePath, updatedFile, 'utf-8');
        updatedCount++;

        console.log(`✏️  已更新元数据:`);
        for (const change of changes) {
          console.log(`      ➕ ${change}`);
        }
        console.log('');
      } else if (cleanResult.cleaned) {
        console.log('✅ 元数据完整（仅清理了 HTML）\n');
      } else {
        skippedCount++;
        console.log('✅ 无需更新（元数据完整 + 无 HTML 标签）\n');
      }

    } catch (error) {
      console.error(`❌ 处理失败 ${file}:`, error.message);
    }
  }

  console.log('========== 处理完成 ==========');
  console.log(`📊 总计处理: ${files.length} 篇文章`);

  if (totalCleanedFiles > 0) {
    console.log(`🧹 清理了 HTML 标签: ${totalCleanedFiles} 篇文章 (共移除 ${totalRemovedChars} 字符)`);
  }

  console.log(`✏️  更新了元数据: ${updatedCount} 篇`);
  console.log(`✅ 无需更改: ${skippedCount} 篇\n`);

  if (updatedCount > 0 || totalCleanedFiles > 0) {
    console.log('💡 下一步操作:');
    console.log('   1. 检查更改内容:');
    console.log('      git diff content/articles/');
    console.log('   2. 提交更改:');
    console.log('      git add content/articles/');
    console.log('      git commit -m "chore: 初始化文章元数据并清理HTML标签"');
    console.log('   3. 推送到远程:');
    console.log('      git push origin main\n');
  } else {
    console.log('🎉 所有文章已完美！（元数据完整 + 内容干净）\n');
  }
}

async function main() {
  try {
    await initMetadataForArticles();
  } catch (error) {
    console.error('\n💥 执行出错:', error);
    process.exit(1);
  }
}

main();