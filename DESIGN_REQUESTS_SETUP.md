# Design request form (Google Form → Google Sheet)

Visitors submit ideas on [design-requests.html](design-requests.html). Responses are stored in a Google Sheet you own.

## 1. Create the Google Form

1. Go to [Google Forms](https://forms.google.com) and create a **Blank form**.
2. Title it something like **Spencermann — What should I design next?**
3. Suggested questions:
   - **Short answer:** Your name or MakerWorld handle (optional)
   - **Paragraph:** What would you like me to design?
   - **Multiple choice:** Category (Hollow Knight / Games / Tools / Cosplay / Other)
   - **Multiple choice (optional):** How would you use it? (Cosplay / Display / Functional / Gift / Other)
4. Open **Settings** → turn on **Collect email addresses** only if you want them (optional).
5. Under **Responses**, click **Link to Sheets** → **Create a new spreadsheet**. All submissions will appear there.

## 2. Get the embed URL

1. In the form editor, click **Send** (top right).
2. Choose the **<>** (Embed) tab.
3. Copy the `src="..."` URL from the iframe code. It looks like:
   ```
   https://docs.google.com/forms/d/e/1FAIpQLSc.../viewform?embedded=true
   ```
4. Also copy the normal form link from the **Link** tab (for “open in new tab”):
   ```
   https://docs.google.com/forms/d/e/1FAIpQLSc.../viewform
   ```

## 3. Add URLs to the website

Edit [data/form-config.json](data/form-config.json):

```json
{
  "designRequestForm": {
    "embedUrl": "https://docs.google.com/forms/d/e/YOUR_ID/viewform?embedded=true",
    "viewUrl": "https://docs.google.com/forms/d/e/YOUR_ID/viewform",
    "title": "What should I design next?",
    "description": "Share your ideas — I use these requests when choosing new free designs for MakerWorld."
  }
}
```

Save, then publish:

```powershell
cd D:\Website
git pull origin main
git add data/form-config.json
git commit -m "Connect design request Google Form"
git push
```

Wait 1–5 minutes and open https://www.spencermann.com/design-requests.html — the embedded form should appear.

## 4. View responses

Open the linked Google Sheet anytime. You can sort, filter, or add a “Status” column (Planned / In progress / Done).

## Tips

- In Google Forms **Settings**, you can limit to one response per Google account if you want to reduce duplicates.
- The embed is white by default (Google’s styling); it sits in a white card on the page so it looks intentional.
- If the iframe is blank on mobile, use the **open in new tab** link on the page.
