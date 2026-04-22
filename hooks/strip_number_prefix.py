"""MkDocs hook: strip leading number prefixes (e.g. 01-) from output URLs.

Any source file whose name starts with digits followed by a hyphen
(e.g. 01-overview.md, 05-tool-calling.md) gets a clean slug in the
built site. No allowlist of directories is needed — new folders with
numbered files are handled automatically.

A redirect HTML page is generated at each old numbered path so that
existing links and search-engine indexes continue to work.
"""

from __future__ import annotations

import os
import re
from pathlib import Path

_NUM_PREFIX = re.compile(r"(\d+-)(.+)")

_REDIRECT_TEMPLATE = """\
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="utf-8">
  <link rel="canonical" href="{url}">
  <meta http-equiv="refresh" content="0; url={url}">
  <title>Redirect</title>
</head>
<body>
  <p><a href="{url}">Click here</a> if you are not redirected.</p>
</body>
</html>
"""

# Collect (old_dest_dir, new_url) pairs during on_files for on_post_build.
_redirects: list[tuple[str, str]] = []


def on_files(files, config, **kwargs):
    """Rewrite dest_path / url for numbered files under target directories."""
    _redirects.clear()
    site_dir = config["site_dir"]

    for f in files:
        stem = Path(f.src_path).stem  # e.g. "01-overview"
        m = _NUM_PREFIX.match(stem)
        if not m:
            continue

        old_dest_path = f.dest_path
        prefix = m.group(1)  # e.g. "01-"

        # Strip the number prefix from dest_path, abs_dest_path, url
        f.dest_path = f.dest_path.replace(prefix, "", 1)
        f.abs_dest_path = os.path.normpath(os.path.join(site_dir, f.dest_path))
        if f.url:
            f.url = f.url.replace(prefix, "", 1)

        # Remember old path for redirect generation
        old_dest_dir = os.path.join(site_dir, os.path.dirname(old_dest_path))
        new_url = "/" + f.url if not f.url.startswith("/") else f.url
        _redirects.append((old_dest_dir, new_url))

    return files


def on_post_build(config, **kwargs):
    """Create redirect HTML files at the old numbered paths."""
    for old_dest_dir, new_url in _redirects:
        os.makedirs(old_dest_dir, exist_ok=True)
        redirect_file = os.path.join(old_dest_dir, "index.html")
        with open(redirect_file, "w", encoding="utf-8") as fh:
            fh.write(_REDIRECT_TEMPLATE.format(url=new_url))
