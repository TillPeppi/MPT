import type { ReactNode } from "react";

export function Pill({ tone, children }: { tone: "ok" | "warn" | "off" | "info"; children: ReactNode }) {
  return <span className={`pill ${tone}`}>{children}</span>;
}

export function MCard({ title, action, children, className = "" }: { title: string; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`mcard ${className}`.trim()}>
      <header>
        <h2>{title}</h2>
        {action}
      </header>
      {children}
    </section>
  );
}

export function PageTitle({ title, text }: { title: string; text?: string }) {
  return (
    <div className="area-title">
      <h1 className="display">{title}</h1>
      {text && <p className="lead">{text}</p>}
    </div>
  );
}
