# Meridian Labs website

Single page site for Meridian Labs, Cork.

## Files

| File | What it is |
| --- | --- |
| `index.html` | Self contained build: all CSS and JavaScript inline. Drag it into Netlify Drop. |
| `meridian-labs-split.zip` | The same site as three files: `index.html`, `style.css`, `script.js`. |
| `split/` | Source for both of the above. Edit these files. |
| `build.py` | Rebuilds `index.html` and the zip from `split/`. Run `python3 build.py`. |

External resources: Three.js r128 from cdnjs.cloudflare.com (background) and Google Fonts
(Archivo, DM Serif Display, JetBrains Mono). If Three.js cannot load, or the visitor prefers
reduced motion, a static blurred image of the light ribbons is shown instead.

## Placeholders to replace before publishing

Search the source for these:

- `SAMPLE CONTENT` : the stats and testimonials in "Numbers we will not hide" are invented.
- `spots open this month` : the number `2` in the nav status pill (appears twice, desktop and mobile menu).
- `[VIDEO LINK]` : the video in the "See how it works" modal.
- `[NUMBER]` and `[EMAIL]` : WhatsApp and email links in the footer.
- `og.jpg` : Open Graph image. Upload a 1200 x 630 image and use its full URL.
- `#privacy` and `#cookies` : footer links to legal pages that do not exist yet.

Forms post to Formspree at `https://formspree.io/f/xlgvegzy`.
