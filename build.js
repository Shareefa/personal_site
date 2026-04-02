const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');
const { marked } = require('marked');

const BLOGS_DIR = path.join(__dirname, 'blogs');
const BLOG_OUT_DIR = path.join(__dirname, 'blog');
const INDEX_PATH = path.join(__dirname, 'index.html');

const includeDrafts = process.argv.includes('--include-drafts');

// Read all .md files from blogs/
const mdFiles = fs.readdirSync(BLOGS_DIR).filter(f => f.endsWith('.md'));

const posts = mdFiles.map(file => {
  const raw = fs.readFileSync(path.join(BLOGS_DIR, file), 'utf-8');
  const { data, content } = matter(raw);
  const wordCount = content.trim().split(/\s+/).length;
  const reading_time = Math.ceil(wordCount / 200);
  return { ...data, content, file, reading_time };
}).filter(post => includeDrafts || !post.draft)
  .sort((a, b) => new Date(b.date) - new Date(a.date));

// Generate blog post HTML pages
if (!fs.existsSync(BLOG_OUT_DIR)) fs.mkdirSync(BLOG_OUT_DIR);

for (const post of posts) {
  const html = marked(post.content);
  const slug = post.slug || post.file.replace('.md', '');
  const postDir = path.join(BLOG_OUT_DIR, slug);
  if (!fs.existsSync(postDir)) fs.mkdirSync(postDir, { recursive: true });

  const dateStr = new Date(post.date).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric'
  });

  const tags = (post.tags || []).map(t => `<span class="tag">${t}</span>`).join(' ');

  const page = `<!doctype html>
<html lang="en">
    <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>${post.title} - Abdullah Shareef</title>
        <link rel="icon" href="../../favicon.svg" type="image/svg+xml" />
        <meta property="og:type" content="article" />
        <meta property="og:title" content="${post.title}" />
        <meta property="og:description" content="${post.description || ''}" />
        <meta property="og:image" content="https://abdullah.blog/og-image.png" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="${post.title}" />
        <meta name="twitter:description" content="${post.description || ''}" />
        <meta name="twitter:image" content="https://abdullah.blog/og-image.png" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
        <link
            href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Instrument+Sans:wght@400;500&display=swap"
            rel="stylesheet"
        />
        <style>
            *, *::before, *::after {
                box-sizing: border-box;
                margin: 0;
                padding: 0;
            }

            body {
                font-family: "Instrument Sans", sans-serif;
                background: #fffbf5;
                color: #1c1917;
                font-size: 16px;
                line-height: 1.75;
                min-height: 100vh;
            }

            .container {
                max-width: 640px;
                margin: 0 auto;
                padding: 72px 24px 80px;
            }

            .back-link {
                font-size: 0.875rem;
                color: #78716c;
                text-decoration: none;
                transition: color 0.15s;
                display: inline-block;
                margin-bottom: 32px;
            }

            .back-link:hover {
                color: #d97706;
            }

            .post-header {
                margin-bottom: 40px;
            }

            .post-header h1 {
                font-family: "Instrument Sans", sans-serif;
                font-size: 2.5rem;
                font-weight: 400;
                letter-spacing: 0;
                margin-bottom: 12px;
                line-height: 1.3;
            }

            .post-meta {
                font-size: 0.85rem;
                color: #78716c;
                display: flex;
                gap: 16px;
                flex-wrap: wrap;
                align-items: center;
            }

            .tag {
                background: #f5f0eb;
                color: #78716c;
                padding: 2px 8px;
                border-radius: 4px;
                font-size: 0.75rem;
            }

            .post-content h2 {
                font-family: "Instrument Sans", sans-serif;
                font-size: 1.4rem;
                font-weight: 500;
                margin-top: 40px;
                margin-bottom: 16px;
            }

            .post-content h3 {
                font-family: "Instrument Sans", sans-serif;
                font-size: 1.15rem;
                font-weight: 500;
                margin-top: 32px;
                margin-bottom: 12px;
            }

            .post-content p {
                margin-bottom: 18px;
            }

            .post-content a {
                color: #d97706;
                text-decoration: none;
                border-bottom: 1px solid transparent;
                transition: color 0.15s, border-color 0.15s;
            }

            .post-content a:hover {
                color: #b45309;
                border-bottom-color: #b45309;
            }

            .post-content ul, .post-content ol {
                margin-bottom: 18px;
                padding-left: 24px;
            }

            .post-content li {
                margin-bottom: 6px;
            }

            .post-content blockquote {
                border-left: 3px solid #d97706;
                padding: 12px 20px;
                margin: 24px 0;
                font-style: italic;
                color: #57534e;
                background: #faf5ef;
                border-radius: 0 6px 6px 0;
            }

            .post-content img {
                max-width: 100%;
                border-radius: 8px;
                margin: 24px 0;
            }

            .post-content pre {
                background: #f5f0eb;
                border-radius: 8px;
                padding: 16px 20px;
                overflow-x: auto;
                margin: 24px 0;
                font-size: 0.875rem;
                line-height: 1.6;
            }

            .post-content code {
                font-family: "SF Mono", "Fira Code", "Fira Mono", monospace;
                font-size: 0.875rem;
            }

            .post-content p code,
            .post-content li code {
                background: #f5f0eb;
                padding: 2px 6px;
                border-radius: 4px;
            }

            .post-content table {
                width: 100%;
                border-collapse: collapse;
                margin: 24px 0;
                font-size: 0.875rem;
                overflow-x: auto;
                display: block;
            }

            .post-content thead {
                display: table-header-group;
            }

            .post-content tbody {
                display: table-row-group;
            }

            .post-content tr {
                display: table-row;
            }

            .post-content th, .post-content td {
                display: table-cell;
                border: 1px solid #e7e5e4;
                padding: 8px 12px;
                text-align: left;
                white-space: nowrap;
            }

            .post-content th {
                background: #f5f0eb;
                font-weight: 500;
            }

            .post-content tbody tr:nth-child(even) {
                background: #faf8f5;
            }

            .post-content strong {
                font-weight: 500;
            }

            .post-content hr {
                border: none;
                border-top: 1px solid #e7e5e4;
                margin: 40px 0;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <a href="../../index.html" class="back-link">&larr; Back</a>
            <div class="post-header">
                <h1>${post.title}</h1>
                <div class="post-meta">
                    <span>${dateStr}</span>
                    <span>${post.reading_time} min read</span>
                    ${tags}
                </div>
            </div>
            <div class="post-content">
                ${html}
            </div>
        </div>
        <script>
            window.va = window.va || function () { (window.vaq = window.vaq || []).push(arguments); };
        </script>
        <script defer src="/_vercel/insights/script.js"></script>
    </body>
</html>`;

  fs.writeFileSync(path.join(postDir, 'index.html'), page);
  console.log(`  Built: blog/${slug}/index.html`);
}

// Update index.html blog list
const indexHtml = fs.readFileSync(INDEX_PATH, 'utf-8');
const blogListHtml = posts.length === 0
  ? '<p class="blog-empty">More to come!</p>'
  : posts.map(post => {
      const slug = post.slug || post.file.replace('.md', '');
      const dateStr = new Date(post.date).toLocaleDateString('en-US', {
        year: 'numeric', month: 'short', day: 'numeric'
      });
      const tags = (post.tags || []).map(t => `<span class="blog-tag">${t}</span>`).join(' ');
      return `                <a href="blog/${slug}/" class="blog-entry">
                    <span class="blog-date">${dateStr}</span>
                    <span class="blog-title">${post.title}</span>
                    <span class="blog-desc">${post.description || ''}</span>
                    ${tags ? `<span class="blog-tags">${tags}</span>` : ''}
                </a>`;
    }).join('\n');

const updated = indexHtml.replace(
  /<!-- BLOG_LIST_START -->[\s\S]*?<!-- BLOG_LIST_END -->/,
  `<!-- BLOG_LIST_START -->\n${blogListHtml}\n                <!-- BLOG_LIST_END -->`
);

fs.writeFileSync(INDEX_PATH, updated);
console.log(`  Updated: index.html blog list (${posts.length} post${posts.length !== 1 ? 's' : ''})`);
console.log('Done!');
