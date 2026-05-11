const fs = require('fs');
const path = require('path');

function removeHtmlTags(markdownContent) {
  return markdownContent
    .replace(/<font[^>]*>/gi, '')
    .replace(/<\/font>/gi, '');
}

function processFile(inputPath, outputPath) {
  try {
    const absoluteInputPath = path.resolve(inputPath);
    const absoluteOutputPath = outputPath ? path.resolve(outputPath) : absoluteInputPath;

    if (!fs.existsSync(absoluteInputPath)) {
      throw new Error(`输入文件不存在: ${absoluteInputPath}`);
    }

    console.log(`📖 正在读取文件: ${absoluteInputPath}`);
    const content = fs.readFileSync(absoluteInputPath, 'utf-8');
    
    const originalLength = content.length;
    
    console.log('🧹 正在去除 HTML 标签...');
    const cleanedContent = removeHtmlTags(content);
    
    const cleanedLength = cleanedContent.length;
    const removedChars = originalLength - cleanedLength;
    
    console.log(`💾 正在保存到: ${absoluteOutputPath}`);
    fs.writeFileSync(absoluteOutputPath, cleanedContent, 'utf-8');
    
    console.log('\n✅ 处理完成！');
    console.log(`📊 统计信息:`);
    console.log(`   原始字符数: ${originalLength}`);
    console.log(`   清理后字符数: ${cleanedLength}`);
    console.log(`   移除字符数: ${removedChars} (${((removedChars / originalLength) * 100).toFixed(1)}%)`);
    
  } catch (error) {
    console.error('❌ 处理失败:', error.message);
    process.exit(1);
  }
}

const args = process.argv.slice(2);

if (args.length === 0) {
  console.log(`
📝 Markdown HTML 标签清理工具

用法:
  node scripts/clean-html-tags.js <输入文件> [输出文件]

示例:
  node scripts/clean-html-tags.js ./content/articles/文章.md
  node scripts/clean-html-tags.js ./content/articles/文章.md ./output/清理后.md

说明:
  - 去除所有 <font ...> 和 </font> HTML 标签
  - 如果不指定输出文件，将直接覆盖原文件
`);
  process.exit(0);
}

const inputFile = args[0];
const outputFile = args[1];

processFile(inputFile, outputFile);
