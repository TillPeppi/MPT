import { rich } from "./rich";

interface Props {
  eyebrow?: string;
  title?: string;
  text?: string;
  className?: string;
}

export function SectionHead({ eyebrow, title, text, className = "" }: Props) {
  if (!eyebrow && !title && !text) return null;
  return (
    <div className={`section-head reveal ${className}`.trim()}>
      <div>
        {eyebrow && <span className="eyebrow">{rich(eyebrow)}</span>}
        {title && <h2 className="display">{rich(title)}</h2>}
      </div>
      {text && <p>{rich(text)}</p>}
    </div>
  );
}
