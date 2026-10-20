"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
export function AdminNavigation() {
  const pathname = usePathname();
  const items = [["/admin","Administrar Solicitudes"],["/admin/usuarios","Administrar Usuarios"],["/admin/pagos","Pagos de anualidades"],["/admin/formatos-iap","Formatos IAP"]];
  return <nav className="admin-navigation" aria-label="Administración">
    {items.map(([href,label]) => {
      const active = pathname === href || (href !== "/admin" && pathname.startsWith(`${href}/`));
      return <Link key={href} href={href} className={`button ${active ? "button--primary" : "button--ghost"}`} aria-current={active ? "page" : undefined}>{label}</Link>;
    })}
  </nav>;
}
