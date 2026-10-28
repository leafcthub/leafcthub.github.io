"""Regenerate sitemap.xml from data/datasets.json.

Run after adding or removing datasets:
    python scripts/generate_sitemap.py
"""

import json
from pathlib import Path
from urllib.parse import quote
from xml.sax.saxutils import escape

SITE = "https://leafcthub.github.io/"
ROOT = Path(__file__).resolve().parents[1]
STATIC_PAGES = ["", "datasets.html", "submit.html", "about.html"]


def main():
    records = json.loads((ROOT / "data" / "datasets.json").read_text(encoding="utf-8"))
    if isinstance(records, dict):
        records = records.get("datasets", [])

    urls = [SITE + page for page in STATIC_PAGES]
    urls += [f"{SITE}dataset.html?id={quote(record['id'])}" for record in records if record.get("id")]

    lines = ['<?xml version="1.0" encoding="UTF-8"?>', '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
    lines += [f"  <url><loc>{escape(url)}</loc></url>" for url in urls]
    lines.append("</urlset>")
    (ROOT / "sitemap.xml").write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(f"Wrote sitemap.xml with {len(urls)} URLs")


if __name__ == "__main__":
    main()
