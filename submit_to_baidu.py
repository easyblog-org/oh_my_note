#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
百度收录提交脚本
从 Markdown 文章中提取 slug，生成链接并提交到百度搜索引擎
支持：
- 记录已提交链接，避免重复提交
- 每日提交限制（最多 10 个）
"""

import os
import re
import json
from pathlib import Path
from datetime import datetime


def extract_slug(file_path: str) -> str | None:
    """
    从 Markdown 文件的 frontmatter 中提取 slug
    
    Args:
        file_path: Markdown 文件路径
        
    Returns:
        slug 值，如果未找到则返回 None
    """
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read(2000)
    
    match = re.search(r"slug:\s*['\"]?(\w+)['\"]?", content)
    if match:
        return match.group(1)
    return None


def collect_articles(articles_dir: str) -> list[str]:
    """
    收集所有文章文件路径
    
    Args:
        articles_dir: 文章目录路径
        
    Returns:
        Markdown 文件路径列表
    """
    md_files = []
    for file in Path(articles_dir).glob("*.md"):
        md_files.append(str(file))
    return md_files


def generate_urls(articles: list[str], base_url: str = "https://blog.xinxinnote.tech/article/") -> list[str]:
    """
    从文章生成完整的 URL 列表
    
    Args:
        articles: 文章文件路径列表
        base_url: 网站基础 URL
        
    Returns:
        完整 URL 列表
    """
    urls = []
    for article_path in articles:
        slug = extract_slug(article_path)
        if slug:
            full_url = f"{base_url}{slug}"
            urls.append(full_url)
            print(f"✓ 提取成功：{os.path.basename(article_path)} -> {full_url}")
        else:
            print(f"✗ 未找到 slug: {os.path.basename(article_path)}")
    
    return urls


def save_urls_to_file(urls: list[str], output_file: str = "urls.txt"):
    """
    将 URL 列表保存到文件
    
    Args:
        urls: URL 列表
        output_file: 输出文件名
    """
    with open(output_file, 'w', encoding='utf-8') as f:
        for url in urls:
            f.write(url + '\n')
    print(f"\n✓ 已保存 {len(urls)} 个 URL 到 {output_file}")


def load_submitted_records(records_file: str) -> dict:
    """
    加载已提交记录
    
    Args:
        records_file: 记录文件路径
        
    Returns:
        提交记录字典
    """
    if os.path.exists(records_file):
        try:
            with open(records_file, 'r', encoding='utf-8') as f:
                return json.load(f)
        except:
            pass
    return {"submitted_urls": [], "last_submit_date": None, "today_count": 0}


def save_submitted_records(records: dict, records_file: str):
    """
    保存提交记录
    
    Args:
        records: 提交记录字典
        records_file: 记录文件路径
    """
    with open(records_file, 'w', encoding='utf-8') as f:
        json.dump(records, f, ensure_ascii=False, indent=2)
    print(f"✓ 已更新提交记录到 {records_file}")


def filter_new_urls(urls: list[str], records: dict, daily_limit: int = 10) -> list[str]:
    """
    过滤出需要提交的新 URL（未提交过的，且不超过每日限制）
    
    Args:
        urls: 所有 URL 列表
        records: 提交记录
        daily_limit: 每日提交限制
        
    Returns:
        需要提交的 URL 列表
    """
    submitted = set(records.get("submitted_urls", []))
    
    # 检查是否需要重置每日计数
    today = datetime.now().strftime("%Y-%m-%d")
    last_date = records.get("last_submit_date")
    
    if last_date != today:
        # 新的一天，重置计数
        today_count = 0
        print(f"\n📅 新的一天 ({today})，今日提交配额重置为 {daily_limit} 个")
    else:
        today_count = records.get("today_count", 0)
        print(f"\n📅 今日 ({today}) 已提交 {today_count}/{daily_limit} 个链接")
    
    # 过滤未提交的 URL
    new_urls = [url for url in urls if url not in submitted]
    
    if not new_urls:
        print("✓ 所有链接都已提交过，无需重复提交")
        return []
    
    print(f"📊 发现 {len(new_urls)} 个未提交的链接")
    
    # 限制每日提交数量
    remaining_quota = daily_limit - today_count
    if remaining_quota <= 0:
        print(f"⚠️  今日提交配额已用完 ({daily_limit}/{daily_limit})，请明天再试")
        return []
    
    if len(new_urls) > remaining_quota:
        print(f"⚠️  今日剩余配额：{remaining_quota} 个，将提交前 {remaining_quota} 个链接")
        return new_urls[:remaining_quota]
    
    return new_urls


def update_records(records: dict, submitted_urls: list[str], records_file: str):
    """
    更新提交记录
    
    Args:
        records: 提交记录
        submitted_urls: 本次提交的 URL 列表
        records_file: 记录文件路径
    """
    today = datetime.now().strftime("%Y-%m-%d")
    
    # 更新已提交 URL 列表
    existing = set(records.get("submitted_urls", []))
    existing.update(submitted_urls)
    records["submitted_urls"] = list(existing)
    
    # 更新今日计数
    last_date = records.get("last_submit_date")
    if last_date != today:
        records["today_count"] = len(submitted_urls)
        records["last_submit_date"] = today
    else:
        records["today_count"] = records.get("today_count", 0) + len(submitted_urls)
    
    save_submitted_records(records, records_file)


def submit_to_baidu(urls_file: str, site: str, token: str):
    """
    使用 curl 命令提交 URL 到百度搜索引擎
    
    Args:
        urls_file: urls.txt 文件路径
        site: 网站域名
        token: 百度推送 token
    """
    import subprocess
    
    api_url = f"http://data.zz.baidu.com/urls?site={site}&token={token}"
    
    print(f"\n正在使用 curl 提交 {urls_file} 到百度...")
    print(f"API: {api_url}")
    
    cmd = [
        'curl',
        '-H', 'Content-Type:text/plain',
        '--data-binary', f'@{urls_file}',
        api_url
    ]
    
    print(f"执行命令：{' '.join(cmd)}\n")
    
    try:
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=30
        )
        
        if result.returncode == 0:
            print(f"\n✓ 提交成功！")
            print(f"百度返回结果：{result.stdout}")
        else:
            print(f"\n✗ 提交失败：{result.stderr}")
            
    except subprocess.TimeoutExpired:
        print("\n✗ 提交超时")
    except FileNotFoundError:
        print("\n✗ 未找到 curl 命令，请确保已安装 curl")
    except Exception as e:
        print(f"\n✗ 发生错误：{e}")


def main(auto_submit: bool = False):
    script_dir = Path(__file__).parent
    articles_dir = script_dir / "content" / "articles"
    urls_file = script_dir / "urls.txt"
    records_file = script_dir / ".baidu_submit_records.json"
    
    SITE = "https://blog.xinxinnote.tech"
    TOKEN = "6j98T2llrxeu4Dyv"
    DAILY_LIMIT = 10
    
    print("=" * 60)
    print("百度收录提交脚本")
    print("=" * 60)
    
    if not articles_dir.exists():
        print(f"✗ 文章目录不存在：{articles_dir}")
        return
    
    articles = collect_articles(str(articles_dir))
    print(f"\n找到 {len(articles)} 篇文章\n")
    
    urls = generate_urls(articles)
    
    if not urls:
        print("\n✗ 未生成任何 URL，请检查文章文件")
        return
    
    save_urls_to_file(urls, str(urls_file))
    
    # 加载提交记录
    records = load_submitted_records(str(records_file))
    
    # 过滤需要提交的新链接
    urls_to_submit = filter_new_urls(urls, records, DAILY_LIMIT)
    
    if not urls_to_submit:
        print("\n" + "=" * 60)
        return
    
    # 生成待提交文件
    with open(urls_file, 'w', encoding='utf-8') as f:
        for url in urls_to_submit:
            f.write(url + '\n')
    print(f"\n✓ 待提交 {len(urls_to_submit)} 个链接到 {urls_file}")
    
    print("\n" + "=" * 60)
    
    if auto_submit:
        # 自动模式：直接提交
        print("🤖 自动模式：正在提交到百度...")
        submit_to_baidu(str(urls_file), SITE, TOKEN)
        update_records(records, urls_to_submit, str(records_file))
    else:
        # 交互模式：询问用户
        try:
            response = input("是否立即提交到百度？(y/n): ").strip().lower()
            if response == 'y':
                submit_to_baidu(str(urls_file), SITE, TOKEN)
                update_records(records, urls_to_submit, str(records_file))
            else:
                print("\n已生成 urls.txt，您可以使用以下命令手动提交:")
                print(f'curl -H "Content-Type:text/plain" --data-binary @urls.txt "http://data.zz.baidu.com/urls?site={SITE}&token={TOKEN}"')
                print("\n⚠️  如果手动提交，请记得更新提交记录")
        except EOFError:
            # 在非交互环境下（如 GitHub Actions），自动提交
            print("\n🤖 检测到非交互环境，自动提交到百度...")
            submit_to_baidu(str(urls_file), SITE, TOKEN)
            update_records(records, urls_to_submit, str(records_file))
    
    print("\n" + "=" * 60)


if __name__ == "__main__":
    import sys
    # 支持命令行参数：python submit_to_baidu.py --auto
    auto_mode = "--auto" in sys.argv
    main(auto_mode)
