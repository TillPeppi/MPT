#!/usr/bin/env python3
"""Erzeugt demo/seed.json für die Online-Demo (GitHub Pages) aus den Daten des lokalen Servers.

Nur Python-Standardbibliothek. Aufruf aus dem Projektordner:  python3 tools/build_demo.py

- data/site.json       -> site (unverändert; /assets/-Pfade werden erst zur Laufzeit im Browser aufgelöst)
- data/members.json    -> members OHNE pw/invite, stattdessen demoPw: true (Demo-Passwort setzt site/demo-api.js)
- data/bookings.json   -> bookings + refDate; der Browser verschiebt die Termine um ganze Wochen in die nächsten Tage
- Bestellungen/Anfragen starten leer, Bilderliste aus assets/img + assets/uploads
"""
import json
from datetime import date, timedelta
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
IMG_EXT = {".jpg", ".jpeg", ".png", ".webp", ".gif", ".avif", ".svg"}


def read(name, default):
    try:
        return json.loads((ROOT / "data" / name).read_text(encoding="utf-8"))
    except FileNotFoundError:
        return default


def images():
    out = []
    for folder in (ROOT / "assets" / "img", ROOT / "assets" / "uploads"):
        if folder.is_dir():
            out += ["/" + f.relative_to(ROOT).as_posix() for f in sorted(folder.iterdir()) if f.is_file() and f.suffix.lower() in IMG_EXT]
    return out


def main():
    site = read("site.json", {})
    site.get("collections", {}).pop("members", None)
    members = []
    for m in read("members.json", {"members": []}).get("members", []):
        has_pw = bool(m.get("pw"))
        m = {k: v for k, v in m.items() if k not in ("pw", "invite")}
        m["demoPw"] = has_pw
        members.append(m)
    bookings = read("bookings.json", {"bookings": []}).get("bookings", [])
    first = min((date.fromisoformat(b["date"]) for b in bookings), default=date.today() + timedelta(days=1))
    seed = {
        "refDate": (first - timedelta(days=1)).isoformat(),   # alle Buchungen liegen danach -> nach Verschiebung ab morgen
        "admin": {"user": "admin", "demoPw": True},
        "site": site,
        "members": members,
        "bookings": bookings,
        "orders": {"orders": [], "seq": 1000},
        "inbox": [],
        "images": images(),
    }
    out = ROOT / "demo" / "seed.json"
    out.parent.mkdir(exist_ok=True)
    out.write_text(json.dumps(seed, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(f"demo/seed.json: {len(members)} Kunden, {len(bookings)} Buchungen, {len(seed['images'])} Bilder, {out.stat().st_size // 1024} KB")


if __name__ == "__main__":
    main()
