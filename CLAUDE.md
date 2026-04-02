# Personal Site - abdullah.blog

Static personal site hosted on **Vercel**. No server-side rendering, no framework — just static HTML.

## Project Structure

```
index.html          — Main site (home + blog tab)
build.js            — Converts markdown posts to HTML
blogs/              — Markdown source files (with YAML frontmatter)
blog/               — Generated HTML blog posts (output of build.js)
favicon.svg         — Site favicon
og-image.png/svg    — Open Graph preview image
package.json        — Dependencies: marked, gray-matter
```

## Build

```bash
npm install
node build.js --include-drafts
```

`build.js` does two things:
1. Converts each `.md` file in `blogs/` to `blog/<slug>/index.html`
2. Updates the blog list in `index.html` between `<!-- BLOG_LIST_START -->` and `<!-- BLOG_LIST_END -->` markers

Omit `--include-drafts` to exclude posts with `draft: true` in frontmatter.

## Deployment

Push to `main` — Vercel auto-deploys. Generated files (`blog/`, updated `index.html`) are committed to the repo so Vercel needs no build configuration.

## Adding a Blog Post

1. Create a new `.md` file in `blogs/` with frontmatter:
   ```yaml
   ---
   title: "Post Title"
   slug: "url-slug"
   date: 2026-04-01
   description: "Short description."
   tags:
     - Tag1
   draft: false
   ---
   ```
2. Run `node build.js` (add `--include-drafts` if `draft: true`)
3. Commit and push
