# DNS Setup Guide for spencermann.com on GoDaddy

## Important: DNS Setup Must Be Done in GoDaddy First!

The "DNS check unsuccessful" error is **normal** - it means GitHub Pages is working, but your domain isn't pointing to it yet. Follow these steps to fix it.

## Step-by-Step DNS Configuration in GoDaddy

### Step 1: Log into GoDaddy

1. Go to https://www.godaddy.com
2. Click **"Sign In"** (top right)
3. Enter your credentials

### Step 2: Access DNS Management

1. Click **"My Products"** (or "My Account" → "My Products")
2. Find **spencermann.com** in your domain list
3. Click the **three dots (⋯)** next to your domain
4. Click **"DNS"** or **"Manage DNS"**

### Step 3: Remove Existing A Records (if any)

1. Look for any existing **A records** with Name = **@** or blank
2. Click the **pencil icon** to edit, or **trash icon** to delete them
3. You'll replace these with the GitHub Pages IPs

### Step 4: Add GitHub Pages A Records

You need to add **4 A records**. Click **"Add"** for each one:

**A Record 1:**
- **Type:** A
- **Name:** @ (or leave blank - this represents your root domain)
- **Value:** 185.199.108.153
- **TTL:** 600 (or leave default)

Click **"Save"**

**A Record 2:**
- **Type:** A
- **Name:** @
- **Value:** 185.199.109.153
- **TTL:** 600

Click **"Save"**

**A Record 3:**
- **Type:** A
- **Name:** @
- **Value:** 185.199.110.153
- **TTL:** 600

Click **"Save"**

**A Record 4:**
- **Type:** A
- **Name:** @
- **Value:** 185.199.111.153
- **TTL:** 600

Click **"Save"**

### Step 5: Add CNAME Record for www

1. Click **"Add"** again
2. **Type:** CNAME
3. **Name:** www
4. **Value:** spencerdangermann.github.io (your GitHub username + .github.io)
5. **TTL:** 600 (or default)

Click **"Save"**

### Step 6: Verify Your DNS Records

You should now have:
- **4 A records** with Name = @ pointing to the GitHub IPs
- **1 CNAME record** with Name = www pointing to spencerdangermann.github.io

### Step 7: Wait for DNS Propagation

**This is the important part!** DNS changes can take:
- **Minimum:** 5-10 minutes
- **Typical:** 1-4 hours
- **Maximum:** 24-48 hours

### Step 8: Check DNS Propagation

While waiting, you can check if DNS has propagated:

1. Go to: https://www.whatsmydns.net
2. Enter: `spencermann.com`
3. Select: **A record**
4. Check if it shows the GitHub IPs (185.199.108.x, 185.199.109.x, etc.)

Or use this command in PowerShell:
```powershell
nslookup spencermann.com
```

### Step 9: Go Back to GitHub Pages Settings

Once DNS has propagated (check using the tools above):

1. Go back to your GitHub repository
2. Go to **Settings** → **Pages**
3. Scroll to **"Custom domain"**
4. Enter: `spencermann.com`
5. Click **"Save"**
6. Wait a minute, then check the box **"Enforce HTTPS"**

## Troubleshooting

### "DNS check unsuccessful" after 24 hours

1. **Double-check your DNS records in GoDaddy:**
   - Make sure you have exactly 4 A records
   - Make sure the IPs are correct
   - Make sure the Name is @ (or blank)

2. **Verify DNS propagation:**
   - Use whatsmydns.net to check globally
   - Make sure it shows the GitHub IPs

3. **Check for conflicting records:**
   - Make sure there are no other A records for @
   - Make sure CNAME for www is correct

### "Domain does not resolve" error

This means DNS hasn't propagated yet. Wait longer and check again.

### Website shows "404" or "Not Found"

1. Make sure GitHub Pages is enabled (Settings → Pages)
2. Make sure you selected the correct branch (main) and folder (/)
3. Wait 5-10 minutes after enabling Pages
4. Try accessing: https://spencerdangermann.github.io/spencermann/ first

### Can't find DNS settings in GoDaddy

1. Make sure you're logged into the correct account
2. Look for "DNS Management" or "DNS Records"
3. If you can't find it, GoDaddy support can help: https://www.godaddy.com/help

## Quick Reference: Your DNS Records Should Look Like This

```
Type    Name    Value                          TTL
A       @       185.199.108.153                600
A       @       185.199.109.153                600
A       @       185.199.110.153                600
A       @       185.199.111.153                600
CNAME   www     spencerdangermann.github.io    600
```

## After DNS is Set Up

Once DNS propagates and GitHub recognizes your domain:

1. GitHub will automatically create a file called `CNAME` in your repository
2. Your site will be accessible at both:
   - https://spencermann.com
   - https://www.spencermann.com
3. HTTPS will be automatically enabled (you can check "Enforce HTTPS" in settings)

## Need Help?

- GitHub Pages DNS Docs: https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site
- GoDaddy Support: https://www.godaddy.com/help

