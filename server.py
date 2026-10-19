"""MPT Demo-Server: liefert die Website, /admin und eine kleine JSON-API.

Nur Python-Standardbibliothek. Start:  python3 server.py  (Port 5173, nur localhost)

API
  GET  /api/site            Inhalte (data/site.json)
  POST /api/site            Inhalte speichern (mit Backup in data/backups/)
  GET  /api/images          Bildbibliothek (assets/img + assets/uploads)
  POST /api/upload          {name, data: base64}  -> {url}
  POST /api/contact         {formId, fields}      -> speichert Anfrage, routet an Empfänger des Formulars
  GET  /api/inbox           alle Anfragen
  POST /api/inbox           {id, status} oder {id, delete: true}
  POST /api/login           {user, pass} -> Session-Cookie
  POST /api/logout
  GET  /api/me              angemeldete*r Nutzer*in
  POST /api/password        {current, user, new}

  Öffentlich
  GET  /api/slots           ?from=YYYY-MM-DD&days=14  Kurstermine mit Belegungszählern (keine Namen)
  POST /api/order           {items, customer, consent} -> Shop-Bestellung (Preise serverseitig)

  Kunde (Cookie mpt_member, getrennt von der Admin-Session)
  POST /api/member/login    {email, pass}
  POST /api/member/logout
  GET  /api/member/invite   ?token=  -> {name, email}
  POST /api/member/activate {token, pass}  Passwort setzen per Einladung, loggt ein
  GET  /api/member/me       Profil, Pläne, Messungen, eigene Buchungen
  POST /api/member/book     {courseId, date, weeks}
  POST /api/member/cancel   {id, series}
  POST /api/member/password {current, new}

  Admin (Cookie mpt_session, alles unter /api/admin/ -> 401 ohne Login)
  GET  /api/admin/members          Kundenliste (Kurzform)
  GET  /api/admin/member?id=       Kunde komplett (ohne pw/invite)
  POST /api/admin/member           {member} anlegen/speichern
  POST /api/admin/member/delete    {id}
  POST /api/admin/member/invite    {id} -> Einladungslink (7 Tage)
  GET  /api/admin/bookings         ?from=&to=
  POST /api/admin/bookings         {action: create|cancel|status, ...}
  GET  /api/admin/orders           Bestellungen, neueste zuerst
  POST /api/admin/orders           {id, status} oder {id, delete: true}

Personendaten liegen in data/members.json, data/bookings.json, data/orders.json (nie öffentlich).
Admin-Login: Standard-Zugang beim ersten Start siehe data/admin.json (Passwort wird gehasht gespeichert).
Bitte nach dem ersten Login unter Einstellungen -> Konto ändern.

Optionaler E-Mail-Versand: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM als Umgebungsvariablen setzen.
"""
import base64
import hashlib
import hmac
import json
import math
import os
import posixpath
import re
import secrets
import smtplib
import sys
import threading
import time
import traceback
import uuid
from datetime import date, datetime, timedelta
from urllib.parse import parse_qs, unquote, urlsplit
from email.message import EmailMessage
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from types import SimpleNamespace

ROOT = Path(__file__).resolve().parent
DATA = ROOT / "data"
SITE = DATA / "site.json"
INBOX = DATA / "inbox.json"
BACKUPS = DATA / "backups"
UPLOADS = ROOT / "assets" / "uploads"
IMG_EXT = {".jpg", ".jpeg", ".png", ".webp", ".gif", ".avif", ".svg"}
MAX_UPLOAD = 8 * 1024 * 1024
BLOCKED = ("/data/", "/server.py", "/.claude", "/assets/original")
AUTH = DATA / "admin.json"
DEFAULT_USER, DEFAULT_PASS = "admin", "admin"
SESSION_TTL = 12 * 3600
SESSIONS = {}   # token -> Ablaufzeit
FAILS = {}      # IP -> Zeitpunkte fehlgeschlagener Logins
MEMBERS = DATA / "members.json"
BOOKINGS = DATA / "bookings.json"
ORDERS = DATA / "orders.json"
LOCK = threading.Lock()   # Lesen-Ändern-Schreiben auf members/bookings/orders.json
MEMBER_TTL = 14 * 24 * 3600
MSESSIONS = {}  # Kunden-Token -> (member_id, Ablaufzeit), getrennt von SESSIONS (Admin)
MFAILS = {}     # IP -> fehlgeschlagene Kunden-Logins
ORDER_HITS = {} # IP -> Zeitpunkte der Bestellungen (Spam-Bremse)
DEMO_EMAIL, DEMO_PASS = "demo@mpt.de", "mpt-demo-2026"
PUBLIC_ADMIN = ("/admin/login.html",)
PROTECTED_API = ("/api/images", "/api/inbox", "/api/upload", "/api/password", "/api/admin/")


def read_json(path, default):
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (FileNotFoundError, json.JSONDecodeError):
        return default


def write_json(path, obj):
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix(".tmp")
    tmp.write_text(json.dumps(obj, ensure_ascii=False, indent=2), encoding="utf-8")
    tmp.replace(path)


def send_mail(recipients, subject, body, reply_to=None):
    host = os.environ.get("SMTP_HOST")
    if not host or not recipients:
        return False
    msg = EmailMessage()
    msg["From"] = os.environ.get("SMTP_FROM", os.environ.get("SMTP_USER", ""))
    msg["To"] = ", ".join(recipients)
    msg["Subject"] = subject
    if reply_to:
        msg["Reply-To"] = reply_to
    msg.set_content(body)
    with smtplib.SMTP(host, int(os.environ.get("SMTP_PORT", "587")), timeout=15) as s:
        s.starttls()
        if os.environ.get("SMTP_USER"):
            s.login(os.environ["SMTP_USER"], os.environ.get("SMTP_PASS", ""))
        s.send_message(msg)
    return True


def hash_pw(pw, salt=None):
    salt = salt or secrets.token_hex(16)
    digest = hashlib.pbkdf2_hmac("sha256", pw.encode("utf-8"), bytes.fromhex(salt), 200_000).hex()
    return {"salt": salt, "hash": digest}


def load_auth():
    auth = read_json(AUTH, None)
    if not auth:
        auth = {"user": DEFAULT_USER, **hash_pw(DEFAULT_PASS), "default": True}
        write_json(AUTH, auth)
    return auth


def check_login(user, pw):
    auth = load_auth()
    ok_user = hmac.compare_digest(str(user), auth["user"])
    ok_pw = hmac.compare_digest(hash_pw(str(pw), auth["salt"])["hash"], auth["hash"])
    return ok_user and ok_pw


# ---------------------------------------------------------------- Kunden · Buchung · Shop

class ApiError(Exception):
    def __init__(self, msg, status=400):
        super().__init__(msg)
        self.msg, self.status = msg, status


def uid(prefix):
    return f"{prefix}_{secrets.token_hex(4)}"


def now_iso():
    return time.strftime("%Y-%m-%dT%H:%M:%S")


def num(v):
    """Zahl oder None (akzeptiert auch '12,5')."""
    if isinstance(v, bool):
        return None
    if isinstance(v, str):
        try:
            v = float(v.strip().replace(",", "."))
        except ValueError:
            return None
    if isinstance(v, (int, float)) and math.isfinite(v):
        return int(v) if float(v).is_integer() else v
    return None


def parse_date(s, what="Datum"):
    try:
        return datetime.strptime(str(s), "%Y-%m-%d").date()
    except ValueError:
        raise ApiError(f"{what} ungültig (erwartet JJJJ-MM-TT).")


def js_weekday(d):
    return (d.weekday() + 1) % 7   # 0 = Sonntag, wie course.day


def split_rcpt(s):
    return [r.strip() for r in re.split(r"[,;\s]+", str(s or "")) if r.strip()]


def notify(recipients, subject, body):
    """Mail im Hintergrund; Fehler gehen ins Log, blockieren aber nie die Anfrage."""
    if not recipients or not os.environ.get("SMTP_HOST"):
        return

    def run():
        try:
            send_mail(recipients, subject, body)
        except Exception as e:
            print("Mailfehler:", e, file=sys.stderr)
    threading.Thread(target=run, daemon=True).start()


def flush_mails(mails):
    for r, s, b in mails:
        notify(r, s, b)


def load_coll(path, key):
    """Lädt eine Datendatei. Fehlt sie -> leer, ist sie kaputt -> Fehler (nie still überschreiben)."""
    try:
        obj = json.loads(path.read_text(encoding="utf-8"))
    except FileNotFoundError:
        return {key: []}
    obj.setdefault(key, [])
    return obj


def booking_cfg(site):
    c = (site.get("settings") or {}).get("booking") or {}
    ch = num(c.get("cancelHours"))
    return {"weeksAhead": int(num(c.get("weeksAhead")) or 8), "maxSeries": int(num(c.get("maxSeries")) or 12),
            "cancelHours": 12 if ch is None else ch, "recipients": split_rcpt(c.get("recipients"))}


def cday(co):
    try:
        return int(co.get("day"))
    except (TypeError, ValueError):
        return -1


def find_course(site, cid):
    return next((c for c in (site.get("collections") or {}).get("courses", []) if c.get("id") == cid), None)


def course_start(co, d):
    h, m = str(co.get("start", "00:00")).split(":")[:2]
    return datetime(d.year, d.month, d.day, int(h), int(m))


def bk_start(b):
    return datetime.strptime(f"{b['date']} {b.get('start') or '00:00'}", "%Y-%m-%d %H:%M")


def is_closed(site, iso):
    ex = ((site.get("settings") or {}).get("hours") or {}).get("exceptions") or []
    return any(e.get("date") == iso and e.get("closed") for e in ex)


def count_status(bks, cid, iso, status="booked"):
    return sum(1 for b in bks if b["courseId"] == cid and b["date"] == iso and b["status"] == status)


def make_bookings(site, bks, co, d0, weeks, person, by, mails, admin=False):
    """Legt Einzel-/Serienbuchungen an -> (created, skipped). Aufrufer hält LOCK und schreibt die Datei."""
    cfg, now = booking_cfg(site), datetime.now()
    if cday(co) != js_weekday(d0):
        raise ApiError("Der Kurs findet an diesem Wochentag nicht statt.")
    if not 1 <= weeks <= cfg["maxSeries"]:
        raise ApiError(f"Die Serie darf 1 bis {cfg['maxSeries']} Wochen umfassen.")
    if not admin:
        if course_start(co, d0) <= now:
            raise ApiError("Dieser Termin liegt in der Vergangenheit.")
        if d0 > date.today() + timedelta(weeks=cfg["weeksAhead"]):
            raise ApiError(f"Buchungen sind höchstens {cfg['weeksAhead']} Wochen im Voraus möglich.")
    series = uid("s") if weeks > 1 else None
    spots = int(num(co.get("spots")) or 0)
    created, skipped = [], []
    for i in range(weeks):
        iso = (d0 + timedelta(days=7 * i)).isoformat()
        if is_closed(site, iso):
            skipped.append({"date": iso, "reason": "Studio geschlossen"})
            continue
        dup = any(b["courseId"] == co["id"] and b["date"] == iso and b["status"] != "cancelled" and (
            b.get("memberId") == person["memberId"] if person["memberId"]
            else (not b.get("memberId") and b["name"].lower() == person["name"].lower())) for b in bks)
        if dup:
            skipped.append({"date": iso, "reason": "bereits gebucht"})
            continue
        full = count_status(bks, co["id"], iso) >= spots and not admin
        b = {"id": uid("bk"), "courseId": co["id"], "date": iso, "start": co.get("start", ""), "title": co.get("title", ""),
             "memberId": person["memberId"], "name": person["name"], "email": person["email"],
             "status": "waitlist" if full else "booked", "seriesId": series, "createdAt": now_iso(),
             "cancelledAt": None, "by": by}
        bks.append(b)
        created.append({"id": b["id"], "date": iso, "status": b["status"]})
    if created:
        lines = "\n".join(f"{c['date']}  {'Warteliste' if c['status'] == 'waitlist' else 'gebucht'}" for c in created)
        mails.append((cfg["recipients"], f"[Buchung] {person['name']}: {co.get('title')} {co.get('start')}",
                      f"{person['name']} <{person['email']}> ({by})\n{co.get('title')} um {co.get('start')} Uhr\n{lines}"))
    return created, skipped


def promote(site, bks, cid, iso, mails, skip=None):
    """Rückt die ältesten Wartelisten-Einträge nach, solange Plätze frei sind (skip: vom Admin gerade verschobener Eintrag)."""
    co = find_course(site, cid)
    if not co:
        return
    spots = int(num(co.get("spots")) or 0)
    while count_status(bks, cid, iso) < spots:
        waiting = [(b["createdAt"], i) for i, b in enumerate(bks)
                   if b["courseId"] == cid and b["date"] == iso and b["status"] == "waitlist" and b is not skip]
        if not waiting:
            return
        b = bks[min(waiting)[1]]
        b["status"] = "booked"
        if b.get("email"):
            mails.append(([b["email"]], f"[MPT] Du bist nachgerückt: {b['title']} am {iso}",
                          f"Hallo {b['name']},\n\nein Platz ist frei geworden: {b['title']} am {iso} um {b['start']} Uhr "
                          "ist jetzt für dich gebucht.\n\nMetsch Personal Training"))


def cancel_one(site, bks, b, mails, cfg):
    b["status"], b["cancelledAt"] = "cancelled", now_iso()
    mails.append((cfg["recipients"], f"[Storno] {b['name']}: {b['title']} {b['date']}",
                  f"{b['name']} <{b.get('email', '')}> hat {b['title']} am {b['date']} um {b['start']} Uhr storniert."))
    promote(site, bks, b["courseId"], b["date"], mails)


def member_view(m):
    v = {k: x for k, x in m.items() if k not in ("pw", "invite")}
    v["hasPassword"] = bool(m.get("pw"))
    inv = m.get("invite")
    v["invitePending"] = bool(inv and inv.get("exp", 0) > time.time())
    return v


def find_member(members, mid):
    return next((m for m in members if m["id"] == mid), None)


def valid_email(e):
    return bool(re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", e)) and len(e) <= 200


def new_session(mid):
    t = secrets.token_urlsafe(32)
    MSESSIONS[t] = (mid, time.time() + MEMBER_TTL)
    return t


def drop_sessions(mid, keep=None):
    for t, (m, _) in list(MSESSIONS.items()):
        if m == mid and t != keep:
            MSESSIONS.pop(t, None)


def session_cookie(token, ttl=MEMBER_TTL):
    return f"mpt_member={token}; HttpOnly; SameSite=Lax; Path=/; Max-Age={ttl}"


def check_member_pw(m, pw):
    pwd = (m or {}).get("pw") or {"salt": "00" * 16, "hash": ""}   # Dummy-Hash: gleiche Laufzeit bei unbekannter E-Mail
    ok = hmac.compare_digest(hash_pw(str(pw), pwd["salt"])["hash"], pwd["hash"])
    return bool(m and m.get("pw") and ok)


def new_password(v):
    v = str(v or "")
    if len(v) < 8:
        raise ApiError("Das Passwort braucht mindestens 8 Zeichen.")
    return hash_pw(v)


# ---- Öffentlich

def api_slots(c):
    site = read_json(SITE, {})
    cfg, now, today = booking_cfg(site), datetime.now(), date.today()
    d0 = parse_date(c.q.get("from") or today.isoformat(), "Startdatum")
    try:
        days = int(c.q.get("days") or 14)
    except ValueError:
        raise ApiError("days muss eine Zahl sein.")
    days = max(1, min(days, 70))
    with LOCK:
        bks = load_coll(BOOKINGS, "bookings")["bookings"]
    cnt = {}
    for b in bks:
        if b["status"] in ("booked", "waitlist"):
            cnt.setdefault((b["courseId"], b["date"]), {"booked": 0, "waitlist": 0})[b["status"]] += 1
    courses = sorted((site.get("collections") or {}).get("courses", []), key=lambda x: x.get("start", ""))
    limit = today + timedelta(weeks=cfg["weeksAhead"])
    slots = []
    for i in range(days):
        d = d0 + timedelta(days=i)
        iso = d.isoformat()
        for co in courses:
            if cday(co) != js_weekday(d):
                continue
            n = cnt.get((co["id"], iso), {"booked": 0, "waitlist": 0})
            past, closed = course_start(co, d) <= now, is_closed(site, iso)
            slots.append({"courseId": co["id"], "date": iso, "start": co.get("start", ""),
                          "spots": int(num(co.get("spots")) or 0), "booked": n["booked"], "waitlist": n["waitlist"],
                          "past": past, "closed": closed, "bookable": not past and d <= limit and not closed})
    return {"slots": slots}


def api_order(c):
    d, ip = c.data, c.ip
    hits = [t for t in ORDER_HITS.get(ip, []) if t > time.time() - 600]
    if len(hits) >= 10:
        raise ApiError("Zu viele Bestellungen. Bitte später erneut versuchen.", 429)
    cust = d.get("customer") if isinstance(d.get("customer"), dict) else {}
    name, email = str(cust.get("name", "")).strip()[:120], str(cust.get("email", "")).strip()[:200]
    if not name:
        raise ApiError("Bitte gib deinen Namen an.")
    if not valid_email(email):
        raise ApiError("Bitte gib eine gültige E-Mail-Adresse an.")
    if d.get("consent") is not True:
        raise ApiError("Bitte stimme der Datenschutzerklärung zu.")
    raw = d.get("items")
    if not isinstance(raw, list) or not raw or len(raw) > 50:
        raise ApiError("Der Warenkorb ist leer.")
    site = read_json(SITE, {})
    prods = {p.get("id"): p for p in (site.get("collections") or {}).get("products", [])}
    merged = {}
    for it in raw:
        if not isinstance(it, dict):
            raise ApiError("Ungültige Position.")
        p = prods.get(it.get("productId"))
        if not p or not p.get("active", True):
            raise ApiError("Ein Produkt ist nicht (mehr) verfügbar.")
        if p.get("soldOut"):
            raise ApiError(f"„{p.get('name')}“ ist leider ausverkauft.")
        variants = [v.strip() for v in str(p.get("variants") or "").split("\n") if v.strip()]
        var = str(it.get("variant") or "").strip()
        if variants and var not in variants:
            raise ApiError(f"Bitte wähle eine gültige Variante für „{p.get('name')}“.")
        if not variants:
            var = ""
        q = num(it.get("qty"))
        if q is None or int(q) != q or q < 1:
            raise ApiError("Ungültige Menge.")
        key = (p["id"], var)
        merged[key] = merged.get(key, 0) + int(q)
    items = []
    for (pid, var), q in merged.items():
        if q > 20:
            raise ApiError("Pro Produkt sind maximal 20 Stück je Bestellung möglich.")
        p = prods[pid]
        price = round(float(num(p.get("price")) or 0), 2)
        items.append({"productId": pid, "name": p.get("name", ""), "variant": var, "qty": q,
                      "price": price, "sum": round(price * q, 2)})
    total = round(sum(i["sum"] for i in items), 2)
    with LOCK:
        db = load_coll(ORDERS, "orders")
        used = [int(m.group(1)) for o in db["orders"] for m in [re.match(r"MPT-(\d+)$", str(o.get("no")))] if m]
        seq = max([int(num(db.get("seq")) or 1000)] + used) + 1   # seq verhindert Wiederverwendung gelöschter Nummern
        db["seq"] = seq
        order = {"id": uid("o"), "no": f"MPT-{seq}", "createdAt": now_iso(), "status": "neu",
                 "customer": {"name": name, "email": email, "phone": str(cust.get("phone", "")).strip()[:60],
                              "note": str(cust.get("note", "")).strip()[:1000]},
                 "items": items, "total": total, "mailed": False}
        lines = "\n".join(f"{i['qty']} × {i['name']}{' (' + i['variant'] + ')' if i['variant'] else ''}  {i['sum']:.2f} €" for i in items)
        body = (f"Bestellung {order['no']}\n{name} <{email}> {order['customer']['phone']}\n\n{lines}\n\n"
                f"Summe: {total:.2f} €\nNotiz: {order['customer']['note']}")
        try:
            order["mailed"] = send_mail(split_rcpt(((site.get("settings") or {}).get("shop") or {}).get("recipients")),
                                        f"[Shop] Bestellung {order['no']}", body, email)
        except Exception as e:  # Versandfehler sollen die Bestellung nicht verlieren
            order["mailError"] = str(e)
        db["orders"].append(order)
        write_json(ORDERS, db)
    ORDER_HITS[ip] = hits + [time.time()]
    return {"ok": True, "no": order["no"], "total": total}


# ---- Kunde

def api_m_login(c):
    recent = [t for t in MFAILS.get(c.ip, []) if t > time.time() - 300]
    if len(recent) >= 5:
        raise ApiError("Zu viele Fehlversuche. Bitte 5 Minuten warten.", 429)
    email = str(c.data.get("email", "")).strip().lower()
    with LOCK:
        members = load_coll(MEMBERS, "members")["members"]
    m = next((x for x in members if x.get("email", "").lower() == email), None)
    if not (check_member_pw(m, c.data.get("pass", "")) and m.get("active", True)):
        MFAILS[c.ip] = recent + [time.time()]
        time.sleep(0.5)
        raise ApiError("E-Mail oder Passwort falsch.", 401)
    MFAILS.pop(c.ip, None)
    c.cookies.append(session_cookie(new_session(m["id"])))
    return {"ok": True}


def api_m_logout(c):
    MSESSIONS.pop(c.mtoken, None)
    c.cookies.append(session_cookie("", 0))
    return {"ok": True}


def invite_member(members, token):
    token = str(token or "")
    for m in members:
        inv = m.get("invite")
        if inv and hmac.compare_digest(str(inv.get("token", "")), token) and inv.get("exp", 0) > time.time() and m.get("active", True):
            return m
    raise ApiError("Einladung ungültig oder abgelaufen")


def api_m_invite(c):
    with LOCK:
        m = invite_member(load_coll(MEMBERS, "members")["members"], c.q.get("token"))
    return {"name": m["name"], "email": m["email"]}


def api_m_activate(c):
    pw = new_password(c.data.get("pass"))
    with LOCK:
        db = load_coll(MEMBERS, "members")
        m = invite_member(db["members"], c.data.get("token"))
        m["pw"] = pw
        m.pop("invite", None)
        write_json(MEMBERS, db)
        drop_sessions(m["id"])
    c.cookies.append(session_cookie(new_session(m["id"])))
    return {"ok": True}


def api_m_me(c):
    with LOCK:
        m = find_member(load_coll(MEMBERS, "members")["members"], c.mid)
        bks = load_coll(BOOKINGS, "bookings")["bookings"]
    since = (date.today() - timedelta(days=60)).isoformat()
    v = member_view(m)
    v["bookings"] = sorted((b for b in bks if b.get("memberId") == m["id"] and b["date"] >= since),
                           key=lambda b: (b["date"], b.get("start", "")))
    return v


def api_m_book(c):
    site = read_json(SITE, {})
    co = find_course(site, c.data.get("courseId"))
    if not co:
        raise ApiError("Kurs unbekannt.", 404)
    d0 = parse_date(c.data.get("date"))
    w = num(c.data.get("weeks", 1))
    if w is None or int(w) != w:
        raise ApiError("Ungültige Anzahl Wochen.")
    mails = []
    with LOCK:
        m = find_member(load_coll(MEMBERS, "members")["members"], c.mid)
        db = load_coll(BOOKINGS, "bookings")
        created, skipped = make_bookings(site, db["bookings"], co, d0, int(w),
                                         {"memberId": m["id"], "name": m["name"], "email": m["email"]}, "member", mails)
        if created:
            write_json(BOOKINGS, db)
    flush_mails(mails)
    return {"ok": True, "created": created, "skipped": skipped}


def api_m_cancel(c):
    site = read_json(SITE, {})
    cfg, now, mails = booking_cfg(site), datetime.now(), []
    with LOCK:
        db = load_coll(BOOKINGS, "bookings")
        bks = db["bookings"]
        b = next((x for x in bks if x["id"] == c.data.get("id") and x.get("memberId") == c.mid), None)
        if not b or b["status"] == "cancelled":
            raise ApiError("Buchung nicht gefunden.", 404)

        def ok_cancel(x):
            return x["status"] != "cancelled" and bk_start(x) - now >= timedelta(hours=cfg["cancelHours"])
        if c.data.get("series") is True and b.get("seriesId"):
            targets = [x for x in bks if x.get("seriesId") == b["seriesId"] and x.get("memberId") == c.mid
                       and bk_start(x) > now and ok_cancel(x)]
        else:
            targets = [b] if ok_cancel(b) else []
        if not targets:
            raise ApiError(f"Stornieren ist nur bis {cfg['cancelHours']} Stunden vor Kursbeginn möglich. "
                           "Bitte melde dich direkt beim Studio.")
        for x in targets:
            cancel_one(site, bks, x, mails, cfg)
        write_json(BOOKINGS, db)
    flush_mails(mails)
    return {"ok": True, "cancelled": len(targets)}


def api_m_password(c):
    pw = new_password(c.data.get("new"))
    with LOCK:
        db = load_coll(MEMBERS, "members")
        m = find_member(db["members"], c.mid)
        if not check_member_pw(m, c.data.get("current", "")):
            raise ApiError("Aktuelles Passwort ist falsch.")
        m["pw"] = pw
        write_json(MEMBERS, db)
        drop_sessions(m["id"], keep=c.mtoken)
    return {"ok": True}


# ---- Admin

def api_a_members(c):
    with LOCK:
        members = load_coll(MEMBERS, "members")["members"]
    out = []
    for m in members:
        v = member_view(m)
        plans = m.get("plans") or []
        ms = sorted(m.get("measurements") or [], key=lambda x: x.get("date", ""))
        logs = [(lg.get("date", ""), p.get("title", "")) for p in plans for lg in p.get("logs") or []]
        out.append({"id": m["id"], "name": m["name"], "email": m["email"], "phone": m.get("phone", ""),
                    "active": m.get("active", True), "hasPassword": v["hasPassword"], "invitePending": v["invitePending"],
                    "activePlans": sum(1 for p in plans if p.get("status") != "done"),
                    "donePlans": sum(1 for p in plans if p.get("status") == "done"),
                    "lastMeasurement": {k: ms[-1].get(k) for k in ("date", "weight", "bodyfat")} if ms else None,
                    "lastLog": dict(zip(("date", "planTitle"), max(logs))) if logs else None})
    return sorted(out, key=lambda x: x["name"].lower())


def api_a_member_get(c):
    with LOCK:
        m = find_member(load_coll(MEMBERS, "members")["members"], c.q.get("id"))
    if not m:
        raise ApiError("Kunde nicht gefunden.", 404)
    return member_view(m)


def clean_date(v, what, required=False):
    v = str(v or "").strip()
    if not v:
        if required:
            raise ApiError(f"{what} fehlt.")
        return ""
    return parse_date(v, what).isoformat()


def clean_plans(plans):
    if not isinstance(plans, list):
        raise ApiError("Pläne ungültig.")
    out = []
    for p in plans:
        if not isinstance(p, dict):
            raise ApiError("Plan ungültig.")
        p = dict(p)
        p["id"] = str(p.get("id") or uid("pl"))
        p["title"] = str(p.get("title", "")).strip()[:120] or "Plan"
        p["status"] = "done" if p.get("status") == "done" else "active"
        p["start"], p["end"] = clean_date(p.get("start"), "Plan-Start"), clean_date(p.get("end"), "Plan-Ende") or None
        for k in ("goal", "note"):
            p[k] = str(p.get(k, ""))[:2000]
        days = []
        for dd in p.get("days") or []:
            if not isinstance(dd, dict):
                raise ApiError("Plan-Tag ungültig.")
            dd = dict(dd)
            dd["id"], dd["name"] = str(dd.get("id") or uid("d")), str(dd.get("name", ""))[:120]
            exs = []
            for e in dd.get("exercises") or []:
                if not isinstance(e, dict):
                    raise ApiError("Übung ungültig.")
                e = dict(e)
                e["id"] = str(e.get("id") or uid("e"))
                for k in ("group", "name", "reps", "tempo", "note"):
                    e[k] = str(e.get(k, ""))[:200]
                e["sets"], e["rest"] = int(num(e.get("sets")) or 0), int(num(e.get("rest")) or 0)
                exs.append(e)
            dd["exercises"] = exs
            days.append(dd)
        p["days"] = days
        day_ids = {dd["id"] for dd in days}
        logs = []
        for lg in p.get("logs") or []:
            if not isinstance(lg, dict) or not isinstance(lg.get("sets", {}), dict):
                raise ApiError("Training ungültig.")
            lg = dict(lg)
            lg["id"], lg["note"] = str(lg.get("id") or uid("lg")), str(lg.get("note", ""))[:2000]
            lg["date"] = clean_date(lg.get("date"), "Trainingsdatum", True)
            if lg.get("dayId") not in day_ids:
                raise ApiError("Training verweist auf einen unbekannten Tag.")
            sets = {}
            for eid, rows in lg.get("sets", {}).items():
                if not isinstance(rows, list):
                    raise ApiError("Sätze ungültig.")
                sets[str(eid)] = [None if not isinstance(r, dict) or (num(r.get("reps")) is None and num(r.get("kg")) is None)
                                  else {"reps": num(r.get("reps")), "kg": num(r.get("kg"))} for r in rows]
            lg["sets"] = sets
            logs.append(lg)
        p["logs"] = logs
        out.append(p)
    return out


def clean_measurements(ms):
    if not isinstance(ms, list):
        raise ApiError("Messungen ungültig.")
    out = []
    for m in ms:
        if not isinstance(m, dict):
            raise ApiError("Messung ungültig.")
        r = {"id": str(m.get("id") or uid("ms")), "date": clean_date(m.get("date"), "Messdatum", True),
             "weight": num(m.get("weight")), "bodyfat": num(m.get("bodyfat")), "note": str(m.get("note", ""))[:2000]}
        for k in ("skinfolds", "girths"):
            src = m.get(k) if isinstance(m.get(k), dict) else {}
            r[k] = {str(a)[:40]: num(b) for a, b in src.items() if num(b) is not None}
        out.append(r)
    return out


def api_a_member_save(c):
    src = c.data.get("member")
    if not isinstance(src, dict):
        raise ApiError("Kundendaten fehlen.")
    name, email = str(src.get("name", "")).strip()[:120], str(src.get("email", "")).strip()
    if not name:
        raise ApiError("Name fehlt.")
    if not valid_email(email):
        raise ApiError("Bitte gib eine gültige E-Mail-Adresse an.")
    plans = clean_plans(src["plans"]) if "plans" in src else None
    ms = clean_measurements(src["measurements"]) if "measurements" in src else None
    with LOCK:
        db = load_coll(MEMBERS, "members")
        old = find_member(db["members"], src.get("id")) if src.get("id") else None
        if src.get("id") and not old:
            raise ApiError("Kunde nicht gefunden.", 404)
        if any(x.get("email", "").lower() == email.lower() and x is not old for x in db["members"]):
            raise ApiError("Diese E-Mail ist bereits vergeben.")
        m = old if old else {"id": uid("m"), "createdAt": now_iso(), "plans": [], "measurements": []}
        m.update({"name": name, "email": email, "phone": str(src.get("phone", "")).strip()[:60],
                  "active": src.get("active", True) is not False, "notes": str(src.get("notes", ""))[:4000]})
        if plans is not None:
            m["plans"] = plans
        if ms is not None:
            m["measurements"] = ms
        if not old:
            db["members"].append(m)
        write_json(MEMBERS, db)
        if not m["active"]:
            drop_sessions(m["id"])
        return member_view(m)


def api_a_member_delete(c):
    with LOCK:
        db = load_coll(MEMBERS, "members")
        m = find_member(db["members"], c.data.get("id"))
        if not m:
            raise ApiError("Kunde nicht gefunden.", 404)
        db["members"].remove(m)
        bdb = load_coll(BOOKINGS, "bookings")
        for b in bdb["bookings"]:
            if b.get("memberId") == m["id"]:
                b["memberId"] = None
        write_json(BOOKINGS, bdb)
        write_json(MEMBERS, db)
        drop_sessions(m["id"])
    return {"ok": True}


def api_a_member_invite(c):
    with LOCK:
        db = load_coll(MEMBERS, "members")
        m = find_member(db["members"], c.data.get("id"))
        if not m:
            raise ApiError("Kunde nicht gefunden.", 404)
        m["invite"] = {"token": secrets.token_urlsafe(24), "exp": int(time.time()) + 7 * 24 * 3600}
        write_json(MEMBERS, db)
        link, exp = f"/?invite={m['invite']['token']}#/mitglieder", m["invite"]["exp"]
    mailed = False
    try:
        if c.host:
            mailed = send_mail([m["email"]], "Dein Zugang zum MPT-Mitgliederbereich",
                               f"Hallo {m['name']},\n\nhier legst du dein Passwort fest (7 Tage gültig):\n"
                               f"http://{c.host}{link}\n\nMetsch Personal Training")
    except Exception as e:
        print("Mailfehler:", e, file=sys.stderr)
    return {"ok": True, "link": link, "expires": exp, "mailed": mailed}


def api_a_bookings_get(c):
    lo, hi = clean_date(c.q.get("from"), "from"), clean_date(c.q.get("to"), "to")
    with LOCK:
        bks = load_coll(BOOKINGS, "bookings")["bookings"]
    return {"bookings": sorted((b for b in bks if (not lo or b["date"] >= lo) and (not hi or b["date"] <= hi)),
                               key=lambda b: (b["date"], b.get("start", ""), b["createdAt"]))}


def api_a_bookings_post(c):
    d, act = c.data, c.data.get("action")
    if act not in ("create", "cancel", "status"):
        raise ApiError("Unbekannte Aktion.")
    site = read_json(SITE, {})
    mails = []
    with LOCK:
        db = load_coll(BOOKINGS, "bookings")
        bks = db["bookings"]
        if act == "create":
            co = find_course(site, d.get("courseId"))
            if not co:
                raise ApiError("Kurs unbekannt.", 404)
            if d.get("memberId"):
                m = find_member(load_coll(MEMBERS, "members")["members"], d["memberId"])
                if not m:
                    raise ApiError("Kunde nicht gefunden.", 404)
                person = {"memberId": m["id"], "name": m["name"], "email": m["email"]}
            else:
                name = str(d.get("name", "")).strip()[:120]
                if not name:
                    raise ApiError("Name fehlt.")
                person = {"memberId": None, "name": name, "email": str(d.get("email", "")).strip()[:200]}
            w = num(d.get("weeks", 1))
            if w is None or int(w) != w:
                raise ApiError("Ungültige Anzahl Wochen.")
            created, skipped = make_bookings(site, bks, co, parse_date(d.get("date")), int(w), person, "admin", mails, admin=True)
            if created:
                write_json(BOOKINGS, db)
            res = {"ok": True, "created": created, "skipped": skipped}
        else:
            b = next((x for x in bks if x["id"] == d.get("id")), None)
            if not b:
                raise ApiError("Buchung nicht gefunden.", 404)
            status = "cancelled" if act == "cancel" else d.get("status")
            if status not in ("booked", "waitlist", "cancelled"):
                raise ApiError("Ungültiger Status.")
            was = b["status"]
            b["status"] = status
            b["cancelledAt"] = now_iso() if status == "cancelled" else None
            if was == "booked" and status != "booked":
                promote(site, bks, b["courseId"], b["date"], mails, skip=b)
            write_json(BOOKINGS, db)
            res = {"ok": True, "booking": b}
    flush_mails(mails)
    return res


def api_a_orders_get(c):
    with LOCK:
        orders = load_coll(ORDERS, "orders")["orders"]
    return {"orders": sorted(orders, key=lambda o: (o["createdAt"], o["no"]), reverse=True)}


def api_a_orders_post(c):
    with LOCK:
        db = load_coll(ORDERS, "orders")
        o = next((x for x in db["orders"] if x["id"] == c.data.get("id")), None)
        if not o:
            raise ApiError("Bestellung nicht gefunden.", 404)
        if c.data.get("delete"):
            db["orders"].remove(o)
        elif c.data.get("status") in ("neu", "bereit", "abgeholt", "storniert"):
            o["status"] = c.data["status"]
        else:
            raise ApiError("Ungültiger Status.")
        write_json(ORDERS, db)
    return {"ok": True}


# (Methode, Pfad) -> (Funktion, Auth: open | member | admin). Der Dispatcher prüft die Auth je Route;
# nur hier eingetragene POSTs umgehen die generische Admin-Pflicht in do_POST.
ROUTES = {
    ("GET", "/api/slots"): (api_slots, "open"),
    ("POST", "/api/order"): (api_order, "open"),
    ("POST", "/api/member/login"): (api_m_login, "open"),
    ("POST", "/api/member/logout"): (api_m_logout, "open"),
    ("GET", "/api/member/invite"): (api_m_invite, "open"),
    ("POST", "/api/member/activate"): (api_m_activate, "open"),
    ("GET", "/api/member/me"): (api_m_me, "member"),
    ("POST", "/api/member/book"): (api_m_book, "member"),
    ("POST", "/api/member/cancel"): (api_m_cancel, "member"),
    ("POST", "/api/member/password"): (api_m_password, "member"),
    ("GET", "/api/admin/members"): (api_a_members, "admin"),
    ("GET", "/api/admin/member"): (api_a_member_get, "admin"),
    ("POST", "/api/admin/member"): (api_a_member_save, "admin"),
    ("POST", "/api/admin/member/delete"): (api_a_member_delete, "admin"),
    ("POST", "/api/admin/member/invite"): (api_a_member_invite, "admin"),
    ("GET", "/api/admin/bookings"): (api_a_bookings_get, "admin"),
    ("POST", "/api/admin/bookings"): (api_a_bookings_post, "admin"),
    ("GET", "/api/admin/orders"): (api_a_orders_get, "admin"),
    ("POST", "/api/admin/orders"): (api_a_orders_post, "admin"),
}


# ---------------------------------------------------------------- Migration & Demo-Daten

def backup_site():
    if SITE.exists():
        BACKUPS.mkdir(parents=True, exist_ok=True)
        (BACKUPS / f"site-{time.strftime('%Y%m%d-%H%M%S')}.json").write_text(SITE.read_text(encoding="utf-8"), encoding="utf-8")
        for old in sorted(BACKUPS.glob("site-*.json"))[:-30]:
            old.unlink()


def parse_plan_text(title, text):
    """Freitext-Plan: Zeile ohne '|' = Tag, 'Name | Sätze × WH | Hinweis' = Übung."""
    days = []
    for line in str(text or "").splitlines():
        line = line.strip()
        if not line:
            continue
        if "|" not in line:
            days.append({"id": uid("d"), "name": line, "exercises": []})
            continue
        if not days:
            days.append({"id": uid("d"), "name": "Einheit 1", "exercises": []})
        parts = [x.strip() for x in line.split("|")]
        mt = re.match(r"^(\d+)\s*[×xX*]\s*(.+)$", parts[1]) if len(parts) > 1 else None
        days[-1]["exercises"].append({
            "id": uid("e"), "group": "", "name": parts[0], "sets": int(mt.group(1)) if mt else 3,
            "reps": (mt.group(2) if mt else (parts[1] if len(parts) > 1 else "")).strip(), "tempo": "", "rest": 0,
            "note": " · ".join(parts[2:])})
    return {"id": uid("pl"), "title": title or "Plan", "status": "active", "start": date.today().isoformat(),
            "end": None, "goal": "", "note": "", "days": days, "logs": []}


def migrate_members(site):
    out = []
    for old in (site.get("collections") or {}).get("members", []):
        plans = [parse_plan_text(old.get("planTitle"), old.get("plan"))] if str(old.get("plan", "")).strip() else []
        ms = [{"id": uid("ms"), "date": p.get("date"), "weight": num(p.get("weight")), "bodyfat": num(p.get("bodyfat")),
               "skinfolds": {}, "girths": {}, "note": ""} for p in old.get("progress", []) if p.get("date")]
        out.append({"id": uid("m"), "name": old.get("name", "Kunde"), "email": str(old.get("email", "")).strip(),
                    "phone": "", "createdAt": now_iso(), "active": True, "notes": "", "plans": plans, "measurements": ms})
    return out


def demo_plans(measure):
    def ex(g, n, s, r, t, rest):
        return {"id": uid("e"), "group": g, "name": n, "sets": s, "reps": r, "tempo": t, "rest": rest, "note": ""}
    e1 = [ex("A1", "Klimmzug an Ringen", 4, "1-3", "4110", 60), ex("A2", "LH Military Press", 4, "6-8", "4010", 90),
          ex("B1", "KH Ausfallschritte vorne erhöht", 4, "6-8", "4010", 60), ex("B2", "Rudern Seil zum Hals", 4, "6-8", "3012", 90),
          ex("C1", "Wadenheben", 4, "12-15", "2020", 60), ex("C2", "Überkopf-Trizepsstrecken", 4, "12-15", "2020", 90)]
    e2 = [ex("A1", "KH Schrägbank neutral eng", 4, "6-8", "4010", 60), ex("A2", "LH Wolverine Squat", 4, "1-3", "7610", 90),
          ex("B1", "SZ Curls supiniert", 4, "6-8", "3020", 60), ex("B2", "Rack Deadlift", 4, "6-8", "4010", 90),
          ex("C1", "Glute Ham Raises", 4, "6-8", "30X0", 60), ex("C2", "Iso Curls", 4, "30s", "–", 60),
          ex("C3", "Garhammer Raise", 4, "12-15", "–", 90)]

    def S(*p):
        return [{"reps": r, "kg": k} for r, k in p]
    d1 = {"id": uid("d"), "name": "Einheit 1", "exercises": e1}
    log1 = {"id": uid("lg"), "dayId": d1["id"], "date": "2026-09-25", "note": "", "sets": {
        e1[0]["id"]: S((3, 10), (3, 10), (3, 12.5), (2, 15)), e1[1]["id"]: S((8, 20), (8, 30), (8, 30), (8, 35)),
        e1[2]["id"]: S((8, 0), (8, 5), (8, 10)), e1[3]["id"]: S((8, 32), (8, 32), (8, 36), (8, 36)),
        e1[4]["id"]: S((13, 40), (12, 50), (11, 60)), e1[5]["id"]: S((13, 22.5), (12, 22.5), (12, 22.5))}}
    p1 = {"id": uid("pl"), "title": "Till P. ①", "status": "active", "start": "2026-09-25", "end": None, "goal": "", "note": "",
          "days": [d1], "logs": [log1]}
    p2 = {"id": uid("pl"), "title": "Till P. ②", "status": "active", "start": "2026-09-25", "end": None, "goal": "", "note": "",
          "days": [{"id": uid("d"), "name": "Einheit 2", "exercises": e2}], "logs": []}
    # abgeschlossener Sommerplan: (Gruppe, Übung, Sätze, WH, Tempo, Pause, Start-kg, Steigerung je Stufe)
    spec = [[("A1", "Kniebeuge", 3, "8-10", "3010", 90, 50, 2.5), ("A2", "Bankdrücken", 3, "8-10", "3010", 90, 45, 2.5),
             ("B1", "Rudern vorgebeugt", 3, "8-10", "3010", 60, 40, 2.5), ("B2", "Plank", 3, "30s", "–", 45, 0, 0)],
            [("A1", "Rumänisches Kreuzheben", 3, "8-10", "3010", 90, 60, 5), ("A2", "Schulterdrücken KH", 3, "8-10", "3010", 90, 14, 1),
             ("B1", "Latziehen", 3, "10-12", "2010", 60, 45, 2.5), ("B2", "Ausfallschritte", 3, "10-12", "2010", 60, 10, 2)]]
    days, dex = [], []
    for i, rows in enumerate(spec):
        es = [{"id": uid("e"), "group": g, "name": n, "sets": s, "reps": r, "tempo": t, "rest": rest, "note": ""}
              for g, n, s, r, t, rest, _, _ in rows]
        days.append({"id": uid("d"), "name": f"Einheit {i + 1}", "exercises": es})
        dex.append(es)
    logs = []
    for day_i, dt, step in ((0, "2026-06-10", 0), (1, "2026-06-24", 0), (0, "2026-07-22", 3), (1, "2026-08-12", 4)):
        sets = {}
        for e, row in zip(dex[day_i], spec[day_i]):
            reps = int(re.match(r"\d+", e["reps"]).group())
            sets[e["id"]] = [{"reps": reps, "kg": row[6] + row[7] * step} for _ in range(e["sets"])]
        logs.append({"id": uid("lg"), "dayId": days[day_i]["id"], "date": dt, "note": "", "sets": sets})
    p3 = {"id": uid("pl"), "title": "Grundlagen Sommer", "status": "done", "start": "2026-06-01", "end": "2026-08-31",
          "goal": "Technik und Grundkraft", "note": "", "days": days, "logs": logs}
    # Messungen: Hautfalten (mm) und Umfänge (cm) von erster zu letzter Messung linear, Keys aus settings.measure
    sk = {"kinn": (8, 6), "wange": (10, 8), "brust": (9, 6), "trizeps": (14, 10), "subskapular": (16, 12), "achsel": (12, 8),
          "suprailiakal": (20, 14), "bauch": (24, 17), "knie": (10, 8), "wade": (8, 6), "oberschenkel": (16, 12), "hamstring": (14, 10)}
    gi = {"brust": (104, 102), "bauch": (92, 87), "huefte": (101, 98.5), "oberarm": (36, 37), "oberschenkel": (60, 59)}
    skk = [x["key"] for x in measure.get("skinfolds", [])] or list(sk)
    gik = [x["key"] for x in measure.get("girths", [])] or list(gi)
    wt, bf = [84.0, 83.0, 82.2, 81.5], [17.0, 16.1, 15.0, 14.0]
    ms = []
    for i, dt in enumerate(("2026-07-01", "2026-08-01", "2026-09-01", "2026-10-01")):
        lerp = lambda ab, nd: round((ab[0] + (ab[1] - ab[0]) * i / 3) * nd) / nd
        ms.append({"id": uid("ms"), "date": dt, "weight": wt[i], "bodyfat": bf[i],
                   "skinfolds": {k: lerp(sk.get(k, (10, 8)), 2) for k in skk},
                   "girths": {k: lerp(gi.get(k, (50, 50)), 2) for k in gik}, "note": ""})
    return [p1, p2, p3], ms


def seed_bookings(site, member):
    """Demo-Belegung: Gäste für die nächsten 7 Tage + 3 Buchungen des Demo-Kunden."""
    names = ["Anna K.", "Jonas M.", "Lea S.", "Tim R.", "Sarah B.", "Felix W.", "Nina H.", "Paul D.", "Mia L.", "Ben T."]
    courses = (site.get("collections") or {}).get("courses", [])
    now, today, bks, mails, n = datetime.now(), date.today(), [], [], 0
    for i in range(8):
        d = today + timedelta(days=i)
        for co in courses:
            if cday(co) == js_weekday(d) and course_start(co, d) > now:
                for _ in range(min(int(num(co.get("booked")) or 0), int(num(co.get("spots")) or 0))):
                    n += 1   # max. Kapazität je Termin, 10 verschiedene Namen -> keine Dubletten
                    make_bookings(site, bks, co, d, 1, {"memberId": None, "name": names[n % len(names)], "email": ""},
                                  "admin", mails, admin=True)
    for cid in ("co5", "co9", "co2"):   # nächster Termin ab morgen (co2 ist voll -> Warteliste)
        co = find_course(site, cid)
        if co:
            d = today + timedelta(days=1)
            while js_weekday(d) != cday(co):
                d += timedelta(days=1)
            make_bookings(site, bks, co, d, 1, {"memberId": member["id"], "name": member["name"], "email": member["email"]},
                          "member", mails)
    return bks


def migrate():
    """Idempotent beim Start: Dateien anlegen, Kunden aus site.json übernehmen, Demo-Daten säen."""
    with LOCK:
        site = read_json(SITE, {})
        if not MEMBERS.exists():
            members = migrate_members(site)
            demo = next((m for m in members if m["email"].lower() == DEMO_EMAIL), None)
            if not demo:
                demo = {"id": uid("m"), "name": "Demo Mitglied", "email": DEMO_EMAIL, "phone": "", "createdAt": now_iso(),
                        "active": True, "notes": "", "plans": [], "measurements": []}
                members.append(demo)
            demo["plans"], demo["measurements"] = demo_plans((site.get("settings") or {}).get("measure") or {})
            demo["pw"] = hash_pw(DEMO_PASS)
            write_json(MEMBERS, {"members": members})
            if not BOOKINGS.exists():
                write_json(BOOKINGS, {"bookings": seed_bookings(site, demo)})
            print("Migration: Kunden + Demo-Daten nach data/members.json")
        if not BOOKINGS.exists():
            write_json(BOOKINGS, {"bookings": []})
        if not ORDERS.exists():
            write_json(ORDERS, {"orders": [], "seq": 1000})
        if "members" in (site.get("collections") or {}):   # nie Personendaten in der öffentlichen site.json
            backup_site()
            site["collections"].pop("members")
            site["_rev"] = site.get("_rev", 0) + 1
            write_json(SITE, site)
            print("Migration: collections.members aus site.json entfernt")


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *a, **kw):
        super().__init__(*a, directory=str(ROOT), **kw)

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def _json(self, obj, status=200, cookies=()):
        body = json.dumps(obj, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        for ck in cookies:
            self.send_header("Set-Cookie", ck)
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _cookie(self, name):
        for part in self.headers.get("Cookie", "").split(";"):
            k, _, v = part.strip().partition("=")
            if k == name:
                return v
        return None

    def _token(self):
        return self._cookie("mpt_session")   # nur das Admin-Cookie, nie mpt_member

    def _member(self):
        """(member_id, token) der Kunden-Session oder (None, None). Prüft, dass der Kunde noch existiert und aktiv ist."""
        t = self._cookie("mpt_member")
        sess = MSESSIONS.get(t) if t else None
        if sess and sess[1] > time.time():
            with LOCK:
                m = find_member(load_coll(MEMBERS, "members")["members"], sess[0])
            if m and m.get("active", True):
                return sess[0], t
        MSESSIONS.pop(t, None)
        return None, None

    def _dispatch(self, route, path, data):
        """Führt eine ROUTES-Funktion aus: Auth je Route, Fehler als {"error"}, Set-Cookie aus ctx."""
        fn, auth = route
        if auth == "admin" and not self._authed():
            return self._json({"error": "Nicht angemeldet"}, 401)
        mid, mtoken = self._member() if auth == "member" else (None, self._cookie("mpt_member"))
        if auth == "member" and not mid:
            return self._json({"error": "Bitte melde dich an."}, 401)
        host = self.headers.get("Host", "")
        ctx = SimpleNamespace(data=data, q={k: v[0] for k, v in parse_qs(urlsplit(self.path).query).items()},
                              ip=self.client_address[0], mid=mid, mtoken=mtoken, cookies=[],
                              host=host if re.fullmatch(r"[\w.\-:\[\]]{1,100}", host) else "")
        try:
            res = fn(ctx)
        except ApiError as e:
            return self._json({"error": e.msg}, e.status, ctx.cookies)
        except Exception:
            traceback.print_exc()
            return self._json({"error": "Interner Fehler"}, 500)
        return self._json(res, 200, ctx.cookies)

    def _authed(self):
        t = self._token()
        exp = SESSIONS.get(t) if t else None
        if exp and exp > time.time():
            SESSIONS[t] = time.time() + SESSION_TTL
            return True
        SESSIONS.pop(t, None)
        return False

    def _redirect(self, to):
        self.send_response(302)
        self.send_header("Location", to)
        self.end_headers()

    def _body(self):
        length = int(self.headers.get("Content-Length", 0))
        if length > MAX_UPLOAD * 1.4:
            raise ValueError("Anfrage zu groß")
        return json.loads(self.rfile.read(length) or b"{}")

    def do_GET(self):
        path = self.path.split("?")[0]
        # Pfad vor den Prüfungen normalisieren (%64ata, //data, /./data, Groß-/Kleinschreibung auf macOS)
        norm = posixpath.normpath(unquote(path)).lower() + "/"
        if any(norm.startswith(b) for b in BLOCKED):
            return self._json({"error": "forbidden"}, 403)
        if (norm.startswith("/admin/")) and path not in PUBLIC_ADMIN and not self._authed():
            return self._redirect("/admin/login.html")
        if path.startswith(PROTECTED_API) and not self._authed():
            return self._json({"error": "Nicht angemeldet"}, 401)
        if ("GET", path) in ROUTES:
            return self._dispatch(ROUTES[("GET", path)], path, {})
        if path == "/api/me":
            if not self._authed():
                return self._json({"error": "Nicht angemeldet"}, 401)
            auth = load_auth()
            return self._json({"user": auth["user"], "defaultPassword": bool(auth.get("default"))})
        if path == "/api/site":
            site = read_json(SITE, {})
            site.get("collections", {}).pop("members", None)   # nie Personendaten ausliefern
            return self._json(site)
        if path == "/api/images":
            files = []
            for folder in (ROOT / "assets" / "img", UPLOADS):
                if folder.exists():
                    for f in sorted(folder.iterdir()):
                        if f.suffix.lower() in IMG_EXT:
                            files.append("/" + f.relative_to(ROOT).as_posix())
            return self._json(files)
        if path == "/api/inbox":
            return self._json(read_json(INBOX, []))
        return super().do_GET()

    def do_POST(self):
        path = self.path.split("?")[0]
        try:
            data = self._body()
        except (ValueError, json.JSONDecodeError) as e:
            return self._json({"error": str(e)}, 400)

        if path == "/api/login":
            ip = self.client_address[0]
            recent = [t for t in FAILS.get(ip, []) if t > time.time() - 300]
            if len(recent) >= 5:
                return self._json({"error": "Zu viele Fehlversuche. Bitte 5 Minuten warten."}, 429)
            if not check_login(data.get("user", ""), data.get("pass", "")):
                FAILS[ip] = recent + [time.time()]
                time.sleep(0.5)
                return self._json({"error": "Benutzername oder Passwort falsch."}, 401)
            FAILS.pop(ip, None)
            token = secrets.token_urlsafe(32)
            SESSIONS[token] = time.time() + SESSION_TTL
            body = json.dumps({"ok": True}).encode()
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Set-Cookie", f"mpt_session={token}; HttpOnly; SameSite=Strict; Path=/; Max-Age={SESSION_TTL}")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            return

        if path == "/api/logout":
            SESSIONS.pop(self._token(), None)
            self.send_response(200)
            self.send_header("Set-Cookie", "mpt_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0")
            self.send_header("Content-Length", "0")
            self.end_headers()
            return

        # Routen mit eigener Auth (Kunde/öffentlich/Admin) laufen über ROUTES; alles andere außer /api/contact braucht Admin
        if ("POST", path) in ROUTES:
            if not isinstance(data, dict):
                return self._json({"error": "Ungültige Anfrage"}, 400)
            return self._dispatch(ROUTES[("POST", path)], path, data)
        if path != "/api/contact" and not self._authed():
            return self._json({"error": "Nicht angemeldet"}, 401)

        if path == "/api/password":
            if not check_login(load_auth()["user"], data.get("current", "")):
                return self._json({"error": "Aktuelles Passwort ist falsch."}, 400)
            new_user = str(data.get("user") or load_auth()["user"]).strip()
            new_pw = str(data.get("new", ""))
            if len(new_pw) < 8:
                return self._json({"error": "Neues Passwort braucht mindestens 8 Zeichen."}, 400)
            if not new_user:
                return self._json({"error": "Benutzername fehlt."}, 400)
            write_json(AUTH, {"user": new_user, **hash_pw(new_pw), "default": False})
            current = self._token()
            for t in list(SESSIONS):
                if t != current:
                    SESSIONS.pop(t)
            return self._json({"ok": True})

        if path == "/api/site":
            if not isinstance(data, dict) or "pages" not in data:
                return self._json({"error": "ungültige Inhalte"}, 400)
            current_rev = read_json(SITE, {}).get("_rev", 0)
            if "force=1" not in self.path and data.get("_rev", 0) != current_rev:
                return self._json({"error": "conflict", "rev": current_rev}, 409)
            data["_rev"] = current_rev + 1
            if isinstance(data.get("collections"), dict):
                data["collections"].pop("members", None)   # Kunden gehören nicht in die öffentliche site.json
            backup_site()
            write_json(SITE, data)
            return self._json({"ok": True, "rev": data["_rev"], "savedAt": time.time()})

        if path == "/api/upload":
            name = re.sub(r"[^a-zA-Z0-9._-]", "-", str(data.get("name", "bild")))[:80]
            ext = Path(name).suffix.lower()
            if ext not in IMG_EXT:
                return self._json({"error": "Nur Bilddateien erlaubt"}, 400)
            raw = str(data.get("data", ""))
            raw = raw.split(",", 1)[1] if raw.startswith("data:") else raw
            blob = base64.b64decode(raw)
            if len(blob) > MAX_UPLOAD:
                return self._json({"error": "Maximal 8 MB"}, 400)
            UPLOADS.mkdir(parents=True, exist_ok=True)
            target = UPLOADS / f"{Path(name).stem}-{uuid.uuid4().hex[:6]}{ext}"
            target.write_bytes(blob)
            return self._json({"url": "/" + target.relative_to(ROOT).as_posix()})

        if path == "/api/contact":
            site = read_json(SITE, {})
            form = next((f for f in site.get("forms", []) if f.get("id") == data.get("formId")), None)
            if not form:
                return self._json({"error": "Formular unbekannt"}, 400)
            fields = {str(k)[:60]: str(v)[:4000] for k, v in (data.get("fields") or {}).items()}
            recipients = [r.strip() for r in re.split(r"[,;\s]+", form.get("recipients", "")) if r.strip()]
            entry = {"id": uuid.uuid4().hex[:10], "createdAt": time.strftime("%Y-%m-%dT%H:%M:%S"),
                     "formId": form["id"], "formName": form.get("name", form["id"]),
                     "recipients": recipients, "fields": fields, "status": "neu", "mailed": False}
            try:
                body = "\n".join(f"{k}: {v}" for k, v in fields.items())
                entry["mailed"] = send_mail(recipients, f"[{form.get('name')}] {fields.get('Betreff', 'Neue Anfrage')}",
                                            body, fields.get("E-Mail"))
            except Exception as e:  # Versandfehler sollen die Anfrage nicht verlieren
                entry["mailError"] = str(e)
            inbox = read_json(INBOX, [])
            inbox.insert(0, entry)
            write_json(INBOX, inbox)
            return self._json({"ok": True, "recipients": recipients})

        if path == "/api/inbox":
            inbox = read_json(INBOX, [])
            if data.get("delete"):
                inbox = [i for i in inbox if i["id"] != data.get("id")]
            else:
                for i in inbox:
                    if i["id"] == data.get("id"):
                        i["status"] = data.get("status", i["status"])
            write_json(INBOX, inbox)
            return self._json({"ok": True})

        return self._json({"error": "not found"}, 404)


if __name__ == "__main__":
    migrate()
    port = int(os.environ.get("PORT", "5173"))
    print(f"MPT läuft auf http://127.0.0.1:{port}  ·  Admin: http://127.0.0.1:{port}/admin/")
    ThreadingHTTPServer(("127.0.0.1", port), Handler).serve_forever()
