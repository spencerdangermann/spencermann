# Chat → Approve → Live Workflow

Use this with Cursor to update spencermann.com safely.

## Everyday publish (fast)

1. Open **`D:\Website`** in Cursor.
2. Describe changes in chat (e.g. “feature the Hornet mask on the homepage”).
3. Agent edits `data/models.json`, images, and HTML/CSS as needed.
4. Before push:

```powershell
cd D:\Website
git pull origin main
```

5. Preview locally (open site via Live Server or `npx serve .` so `data/models.json` loads).
6. Commit and push to **`main`**:

```powershell
git add .
git commit -m "Describe your change"
git push
```

7. Wait 1–5 minutes; verify https://www.spencermann.com

See also [UPDATE_WORKFLOW.md](UPDATE_WORKFLOW.md) if push is rejected.

## Optional: review before live (PR)

For larger changes:

1. Agent works on a branch, e.g. `feature/featured-fountains`.
2. Agent opens a PR on GitHub (or you run `gh pr create`).
3. You review the diff and preview.
4. Merge PR → `main` → GitHub Pages deploys.

## What the agent usually changes

| Goal | Files |
|------|--------|
| Add/update a design | `data/models.json`, `images/<category>/` |
| Homepage highlights | `featured: true` in `models.json` |
| Styling | `styles.css` |
| SEO | `sitemap.xml`, page `<meta>` tags |

## Auth reminder

`git push` uses a GitHub **Personal Access Token** (classic, `repo` scope), not your account password.
