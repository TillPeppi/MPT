"use client";

import { useState } from "react";

export function CopyCode({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <code
      role="button"
      tabIndex={0}
      title="Zum Kopieren klicken"
      onClick={copy}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          copy();
        }
      }}
    >
      {copied ? "Kopiert ✓" : code}
    </code>
  );

  function copy() {
    void navigator.clipboard?.writeText(code).catch(() => undefined);
    setCopied(true);
    setTimeout(() => setCopied(false), 1100);
  }
}
