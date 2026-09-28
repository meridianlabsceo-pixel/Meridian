#!/usr/bin/env python3
"""Build the single file index.html and the split zip from split/."""
import pathlib, zipfile

root = pathlib.Path(__file__).parent
src = root / "split"
html = (src / "index.html").read_text(encoding="utf-8")
css = (src / "style.css").read_text(encoding="utf-8")
js = (src / "script.js").read_text(encoding="utf-8")

link = '<link rel="stylesheet" href="style.css">'
tag = '<script src="script.js" defer></script>'
assert link in html and tag in html
html = html.replace(link, "<style>\n" + css + "\n</style>")
# Inline script goes last in body; three.js stays deferred, so wait for DOMContentLoaded.
html = html.replace(tag, "<script>\ndocument.addEventListener('DOMContentLoaded',function(){\n" + js + "\n});\n</script>")
(root / "index.html").write_text(html, encoding="utf-8")

with zipfile.ZipFile(root / "meridian-labs-split.zip", "w", zipfile.ZIP_DEFLATED) as z:
    for name in ("index.html", "style.css", "script.js"):
        z.write(src / name, arcname=name)
print("built index.html and meridian-labs-split.zip")
