import { Countdown } from "@/components/client/countdown";
import { LeaderboardAll } from "@/components/client/leaderboard-all";
import { SectionHead } from "@/components/shared/section-head";
import { formatValue, iso, monthLabel } from "@/lib/format";
import type { Challenge } from "@/types/site";
import type { BlockProps } from "./types";

const ranked = (c: Challenge) => [...(c.entries ?? [])].sort((a, z) => (c.sort === "asc" ? a.value - z.value : z.value - a.value));

function currentChallenges(all: Challenge[]): Challenge[] {
  const m = iso(new Date()).slice(0, 7);
  const now = all.filter((c) => c.month === m);
  if (now.length) return now;
  const latest = all.map((c) => c.month).sort().pop();
  return all.filter((c) => c.month === latest);
}

function pickChallenge(all: Challenge[], id?: string): Challenge | undefined {
  if (id && id !== "current") return all.find((c) => c.id === id) ?? all[0];
  const m = iso(new Date()).slice(0, 7);
  return all.find((c) => c.month === m) ?? [...all].sort((a, z) => z.month.localeCompare(a.month))[0];
}

function FullBoard({ c }: { c: Challenge }) {
  const rows = ranked(c);
  return (
    <table className="lb-table">
      <tbody>
        {rows.length ? (
          rows.map((e, i) => (
            <tr key={`${e.name}-${i}`}>
              <td>{i + 1}</td>
              <td>{e.name}</td>
              <td>{formatValue(c, e.value)}</td>
            </tr>
          ))
        ) : (
          <tr>
            <td colSpan={3}>Noch keine Ergebnisse.</td>
          </tr>
        )}
      </tbody>
    </table>
  );
}

export function Leaderboard({ block, ctx }: BlockProps<"leaderboard">) {
  const p = block.props;
  const all = ctx.site.collections.challenges;
  const head = <SectionHead eyebrow={p.eyebrow} title={p.title} text={p.text} />;

  if (block.variant === "tiles" || block.variant === "mini") {
    const mini = block.variant === "mini";
    const ids = p.challengeIds ?? [];
    const chs = ids.length ? ids.map((id) => all.find((c) => c.id === id)).filter((c): c is Challenge => !!c) : currentChallenges(all);
    if (!chs.length) {
      return (
        <div className="sec">
          <div className="wrap">
            {head}
            <div className="empty">Aktuell keine Challenges.</div>
          </div>
        </div>
      );
    }
    const months = [...new Set(chs.map((c) => c.month))];
    const n = Number(p.topN) || 3;
    return (
      <div className="sec alt">
        <div className="wrap">
          {head}
          {months.length === 1 && (
            <div className="lb-head reveal">
              <div>
                <h3>{monthLabel(months[0])}</h3>
                <p>{chs.length} Challenges laufen · Messungen im Studio</p>
              </div>
              <Countdown month={months[0]} />
            </div>
          )}
          <div className={`lb-tiles ${mini ? "mini" : ""} reveal`}>
            {chs.map((c) => {
              const r = ranked(c);
              return (
                <div key={c.id} className="lbt">
                  <div className="lbt-h">
                    <span className="ic" aria-hidden="true">{c.icon || "🏆"}</span>
                    <div>
                      <b>{c.title}</b>
                      <small>
                        {c.metric}
                        {c.sort === "asc" ? " · weniger ist besser" : ""}
                      </small>
                    </div>
                    {c.category && <span className="cat">{c.category}</span>}
                  </div>
                  {c.desc && !mini && <p className="lbt-d">{c.desc}</p>}
                  <ol>
                    {r.slice(0, n).map((e, i) => (
                      <li key={`${e.name}-${i}`} className={`r${i + 1}`}>
                        <span className="rk">{i + 1}</span>
                        <span className="nm">{e.name}</span>
                        <span className="vl">{formatValue(c, e.value)}</span>
                      </li>
                    ))}
                    {r.length === 0 && <li className="none">Noch keine Ergebnisse – sei der/die Erste!</li>}
                  </ol>
                  {r.length > n ? (
                    <LeaderboardAll title={`${c.icon || ""} ${c.title}`.trim()} desc={c.desc} month={c.month} count={r.length}>
                      <FullBoard c={c} />
                    </LeaderboardAll>
                  ) : (
                    <span className="lbt-all muted">{r.length} Teilnehmende</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  const c = pickChallenge(all, p.challengeId);
  if (!c) {
    return (
      <div className="sec">
        <div className="wrap">
          <div className="empty">Keine Challenge angelegt.</div>
        </div>
      </div>
    );
  }
  const entries = ranked(c);
  const headBox = (
    <div className="lb-head reveal">
      <div>
        <h3>
          {c.icon} {c.title}
        </h3>
        <p>
          {c.desc} · Wertung: {c.metric}
        </p>
      </div>
      <Countdown month={c.month} />
    </div>
  );
  let board;
  if (block.variant === "table") {
    board = (
      <div className="reveal">
        <FullBoard c={c} />
      </div>
    );
  } else {
    const order = [1, 0, 2];
    board = (
      <>
        <div className="podium reveal">
          {order.map((idx, k) => {
            const e = entries[idx];
            return e ? (
              <div key={k} className={`p p${idx + 1}`}>
                <div className="rank">{idx + 1}</div>
                <b>{e.name}</b>
                <span>{formatValue(c, e.value)}</span>
              </div>
            ) : (
              <div key={k} />
            );
          })}
        </div>
        {entries.length > 3 && (
          <div className="lb-rest">
            <table className="lb-table">
              <tbody>
                {entries.slice(3).map((e, i) => (
                  <tr key={`${e.name}-${i}`}>
                    <td>{i + 4}</td>
                    <td>{e.name}</td>
                    <td>{formatValue(c, e.value)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </>
    );
  }
  return (
    <div className="sec alt">
      <div className="wrap">
        {head}
        {headBox}
        {board}
      </div>
    </div>
  );
}
