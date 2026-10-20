import Link from "next/link";

export function Button({ children, href, tone = "primary" }) {
  const className = `button button--${tone}`;

  if (href) {
    return (
      <Link className={className} href={href}>
        {children}
      </Link>
    );
  }

  return (
    <button className={className} type="button">
      {children}
    </button>
  );
}
