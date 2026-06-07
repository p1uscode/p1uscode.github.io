"""MkDocs hook: publish the main HTML slide deck under /ai/slides/.

The deck in ``ai/slides/ai-agent-introduction/`` is plain static HTML (not
Markdown), so MkDocs does not process it. After the site is built we copy it —
and its narrated video — into ``<site>/ai/slides/``, excluding the heavy
animation working files and editor/OS junk.

Only the main deck is published. The opening / closing decks contain personal
photos and survey links, so they are kept local (git-ignored) and shared only
via the hand-distributed zip — never committed or put on the public site.

The Markdown page ``ai/docs/slides.md`` renders the ``/ai/slides/`` landing
page (index.html); the copied subfolder sits alongside it.
"""

from __future__ import annotations

import shutil
from pathlib import Path

# Only the main deck is public (self-contained folder of html + css + js + mp4).
_DECKS = ("ai-agent-introduction",)

# Never publish: OS metadata, editor temp files, and the animation working dir
# (it XHRs jsx + loads a CDN, so it does not run as a static page).
_IGNORE = shutil.ignore_patterns(".DS_Store", "._*", "animation", "*.mjs")


def on_post_build(config, **kwargs):
    repo = Path(config["config_file_path"]).parent
    src = repo / "ai" / "slides"
    dst = Path(config["site_dir"]) / "ai" / "slides"
    for deck in _DECKS:
        deck_src = src / deck
        if deck_src.is_dir():
            shutil.copytree(deck_src, dst / deck, ignore=_IGNORE, dirs_exist_ok=True)
