import Link from "next/link";
import type { ComponentProps } from "react";

type Props = Omit<ComponentProps<"a">, "href"> & { href: string };

/** Interne Pfade über next/link, Anker, mailto:/tel: und externe Ziele als normales <a> */
export function SmartLink({ href, children, ...rest }: Props) {
  if (href.startsWith("/") && !href.startsWith("//")) {
    return (
      <Link href={href} {...rest}>
        {children}
      </Link>
    );
  }
  const external = /^(https?:)?\/\//.test(href);
  return (
    <a href={href} {...(external && !rest.target ? { target: "_blank", rel: "noopener" } : {})} {...rest}>
      {children}
    </a>
  );
}
