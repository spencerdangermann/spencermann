# Guide: Editing Your Website Content

## Best Practice: Edit Locally, Then Push to GitHub

**Yes, edit your files in Cursor!** This is the recommended workflow:

1. **Edit files locally** in Cursor (on your computer)
2. **Test locally** (open the HTML files in your browser)
3. **Push changes to GitHub** (which automatically updates your live site)

## Step-by-Step: Making Changes

### Step 1: Edit Your Files in Cursor

1. **Open the file you want to edit** (e.g., `index.html`)
2. **Make your changes** (update text, add images, etc.)
3. **Save the file** (Ctrl+S)

### Step 2: Preview Locally (Optional but Recommended)

Before pushing, you can preview your changes:

1. **Right-click on `index.html`** in Cursor
2. **Select "Open with Live Server"** (if you have the extension)
   - Or just double-click the file to open in your browser
3. **Review your changes** to make sure they look good

### Step 3: Push Changes to GitHub

Once you're happy with your changes, push them to GitHub:

**Open PowerShell in your website folder:**
```powershell
cd D:\Website
```

**Add your changes:**
```powershell
git add .
```

**Commit with a descriptive message:**
```powershell
git commit -m "Updated about section"
```

**Push to GitHub:**
```powershell
git push
```

### Step 4: Wait for GitHub Pages to Update

- GitHub Pages automatically rebuilds your site
- Changes usually appear within **1-5 minutes**
- Refresh your website to see the updates

## Common Editing Tasks

### Updating the About Section

1. Open `index.html` in Cursor
2. Find the "About Me" section (around line 91)
3. Edit the text between `<p class="about-text">` tags
4. Save, commit, and push

### Adding a New Design to a Category

1. **Add your image:**
   - Save the image to the appropriate folder (e.g., `images/hollow-knight/`)
   
2. **Edit the category HTML file** (e.g., `hollow-knight.html`)
   - Find the `.carousel-track` div
   - Add a new `.carousel-slide` div (see `ADDING_DESIGNS.md` for template)
   
3. **Save, commit, and push**

### Changing Category Images

1. Replace the image in `images/categories/` folder
   - Keep the same filename, or update the filename in the HTML
2. Save, commit, and push

### Updating Text Anywhere

1. Open the HTML file in Cursor
2. Find the text you want to change
3. Edit it directly
4. Save, commit, and push

## Quick Reference: Git Commands

**Every time you make changes, run these three commands:**

```powershell
git add .                    # Stage all changes
git commit -m "Description"  # Save changes with a message
git push                     # Upload to GitHub
```

**Good commit messages:**
- "Updated about section"
- "Added new Hollow Knight mask design"
- "Fixed typo on homepage"
- "Updated category images"

## Tips

### 1. Make Small, Frequent Commits
- Don't wait until you've made 20 changes
- Commit after each logical change
- Makes it easier to track what changed

### 2. Test Before Pushing
- Open the HTML file in your browser
- Check that everything looks correct
- Fix any issues before pushing

### 3. Keep Backups
- Git automatically keeps a history
- If something breaks, you can revert
- But it's still good to keep local backups of important files

### 4. Use Descriptive Commit Messages
- "Updated text" is okay
- "Updated about section with new bio" is better
- Helps you remember what changed later

## Editing Workflow Summary

```
1. Edit file in Cursor
   ↓
2. Save file (Ctrl+S)
   ↓
3. Preview in browser (optional)
   ↓
4. Open PowerShell
   ↓
5. Run: git add .
   ↓
6. Run: git commit -m "Description"
   ↓
7. Run: git push
   ↓
8. Wait 1-5 minutes
   ↓
9. Refresh your website - changes are live!
```

## Troubleshooting

### "Nothing to commit"
- Make sure you saved your file
- Check that you're in the right directory (`D:\Website`)

### "Changes not showing on website"
- Wait a few more minutes (GitHub Pages can take 5-10 minutes)
- Clear your browser cache (Ctrl+F5)
- Check GitHub repository to make sure files were pushed

### "Can't push - authentication error"
- You might need to re-enter your GitHub credentials
- Use your Personal Access Token as the password

## Need to Undo Changes?

If you make a mistake and want to undo:

**Undo changes to a file (before committing):**
```powershell
git checkout -- filename.html
```

**Undo the last commit (but keep changes):**
```powershell
git reset --soft HEAD~1
```

**See what files changed:**
```powershell
git status
```

## Editing in Cursor vs. GitHub Web Editor

**Cursor (Recommended):**
- ✅ Better editing experience
- ✅ Can preview locally
- ✅ Full control
- ✅ Better for multiple files

**GitHub Web Editor:**
- ✅ Quick small edits
- ✅ No local setup needed
- ❌ Limited editing features
- ❌ Can't preview easily

**Recommendation:** Use Cursor for most edits, GitHub web editor only for quick fixes.

