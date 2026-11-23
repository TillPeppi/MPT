import { SmartLink } from "./smart-link";
import { resolveHref } from "@/lib/href";

interface Props {
  label?: string;
  href?: string;
  className?: string;
  anchors?: Set<string>;
  style?: React.CSSProperties;
}

/** Button-Link; ohne Label wird nichts gerendert */
export function CtaButton({ label, href, className = "btn-primary", anchors, style }: Props) {
  if (!label) return null;
  return (
    <SmartLink className={`btn ${className}`.trim()} href={resolveHref(href, anchors)} style={style}>
      {label}
    </SmartLink>
  );
}
