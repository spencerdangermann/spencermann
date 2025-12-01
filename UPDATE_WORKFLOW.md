# Quick Fix: Push Rejected Error

When you get the "rejected" error, it means GitHub has changes you don't have locally (like the CNAME file created when you set up the custom domain).

## Solution: Pull First, Then Push

Run these commands in order:

```powershell
git pull origin main
```

If it asks you to enter a commit message (opens an editor):
- Press `Esc`
- Type `:wq` and press `Enter`

Then push:

```powershell
git push
```

## What This Does

- `git pull` downloads changes from GitHub and merges them with your local files
- `git push` uploads your changes

## If You Get Merge Conflicts

If Git says there are conflicts:

1. **Don't panic!** This is usually easy to fix
2. **Open the conflicted file** in Cursor
3. **Look for conflict markers** like:
   ```
   <<<<<<< HEAD
   Your local changes
   =======
   Remote changes
   >>>>>>> main
   ```
4. **Keep the version you want** and delete the conflict markers
5. **Save the file**
6. **Run:**
   ```powershell
   git add .
   git commit -m "Resolved merge conflict"
   git push
   ```

## Future Updates: Always Pull First

To avoid this in the future, make it a habit:

```powershell
git pull          # Get latest changes
# Make your edits in Cursor
git add .
git commit -m "Your message"
git push          # Push your changes
```

## Quick Reference: Complete Update Workflow

```powershell
# 1. Get latest changes from GitHub
git pull origin main

# 2. Make your edits in Cursor (save files)

# 3. Stage your changes
git add .

# 4. Commit with a message
git commit -m "Description of changes"

# 5. Push to GitHub
git push
```


