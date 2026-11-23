"use client";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="member-area">
      <div className="wrap">
        <span className="eyebrow">Fehler</span>
        <h1 className="display">Da ist etwas schiefgelaufen.</h1>
        <p className="lead">Bitte versuche es noch einmal.</p>
        <div className="login">
          <div className="actions">
            <button type="button" className="btn btn-primary" onClick={reset}>
              Erneut versuchen
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
