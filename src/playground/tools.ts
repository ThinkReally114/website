import { getAllPosts, getPost } from '../posts';
import type { ChatTool } from './llm';

export const SITE_TOOLS: ChatTool[] = [
  {
    type: 'function',
    function: {
      name: 'list_posts',
      description: '列出本站博客的全部文章（slug、标题、日期、摘要）。想知道站上写过什么时先调这个。',
      parameters: {
        type: 'object',
        properties: {},
        additionalProperties: false
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'read_post',
      description: '按 slug 读取本站某一篇博客的正文。slug 必须来自 list_posts 的结果。',
      parameters: {
        type: 'object',
        properties: {
          slug: { type: 'string', description: '文章 slug，例如 promptshare' }
        },
        required: ['slug'],
        additionalProperties: false
      }
    }
  }
];

function parseArguments(raw: string): Record<string, unknown> {
  try {
    return raw.trim() ? (JSON.parse(raw) as Record<string, unknown>) : {};
  } catch (error) {
    void error;
    return {};
  }
}

export function readSlugHint(raw: string): string {
  const slug = parseArguments(raw).slug;
  return typeof slug === 'string' ? slug : '';
}

export function runSiteTool(name: string, raw: string): string {
  if (name === 'list_posts') {
    return JSON.stringify(
      getAllPosts().map((post) => ({
        slug: post.slug,
        title: post.title,
        date: post.date,
        desc: post.desc
      }))
    );
  }

  if (name === 'read_post') {
    const slug = readSlugHint(raw);
    const post = slug ? getPost(slug) : undefined;
    if (!post) {
      const available = getAllPosts()
        .map((item) => item.slug)
        .join('、');
      return `没有找到 slug 为「${slug}」的文章。可用 slug：${available}`;
    }
    return `# ${post.title}\n发布日期：${post.date}\n摘要：${post.desc}\n\n${post.content}`;
  }

  return `未知工具：${name}`;
}
