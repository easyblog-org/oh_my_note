import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function POST(request: Request) {
  try {
    const { fileName, content } = await request.json();
    
    if (!fileName || !content) {
      return NextResponse.json(
        { success: false, message: '文件名和内容不能为空' },
        { status: 400 }
      );
    }

    const articlesDir = path.join(process.cwd(), 'content', 'articles');
    
    if (!fs.existsSync(articlesDir)) {
      fs.mkdirSync(articlesDir, { recursive: true });
    }

    const filePath = path.join(articlesDir, fileName);
    fs.writeFileSync(filePath, content, 'utf-8');

    return NextResponse.json({ success: true, message: '文章保存成功' });
  } catch (error) {
    console.error('Error saving local article:', error);
    return NextResponse.json(
      { success: false, message: '保存文章失败' },
      { status: 500 }
    );
  }
}
