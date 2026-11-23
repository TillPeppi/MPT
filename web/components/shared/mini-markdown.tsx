/** Mini-Markdown: Absätze, `## Überschrift`, `**fett**`, Zeilenumbrüche */
export function Body({ text }: { text: string }) {
  const parts = String(text || "").split(/\n{2,}/);
  return (
    <>
      {parts.map((par, i) => {
        if (par.startsWith("## ")) {
          const [head, ...rest] = par.split("\n");
          return (
            <div key={i}>
              <h2>{head.slice(3)}</h2>
              {rest.length > 0 && <Paragraph text={rest.join("\n")} />}
            </div>
          );
        }
        return <Paragraph key={i} text={par} />;
      })}
    </>
  );
}

function Paragraph({ text }: { text: string }) {
  return (
    <p>
      {text.split("\n").map((line, li) => (
        <span key={li}>
          {li > 0 && <br />}
          {line.split(/(\*\*.+?\*\*)/).map((s, i) => (s.startsWith("**") && s.endsWith("**") ? <strong key={i}>{s.slice(2, -2)}</strong> : s))}
        </span>
      ))}
    </p>
  );
}
