export interface Post {
  slug: string;
  title: string;
  date: string;
  desc: string;
  content: string;
}

type RawMeta = Record<string, string | undefined>;

const modules = import.meta.glob('./*.md', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;

function parseFrontmatter(raw: string): { meta: RawMeta; body: string } {
  const cleaned = raw.replace(/^\r?\n+/, '');
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/.exec(cleaned);
  const meta: RawMeta = {};
  let body = cleaned;
  if (match) {
    for (const line of match[1].split(/\r?\n/)) {
      const idx = line.indexOf(':');
      if (idx > -1) meta[line.slice(0, idx).trim()] = line.slice(idx + 1).trim();
    }
    body = match[2];
  }
  return { meta, body };
}

const posts: Post[] = Object.entries(modules).map(([path, raw]) => {
  const { meta, body } = parseFrontmatter(raw);
  const slug = path.split('/').pop()?.replace(/\.md$/, '') ?? '';
  return {
    slug,
    title: meta.title ?? slug,
    date: meta.date ?? '',
    desc: meta.desc ?? '',
    content: body
  };
});

posts.sort((a, b) => (a.date < b.date ? 1 : -1));

export function getAllPosts(): Post[] {
  return posts;
}

export function getPost(slug: string): Post | undefined {
  return posts.find((p) => p.slug === slug);
}