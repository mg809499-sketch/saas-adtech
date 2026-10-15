import { redirect } from "next/navigation";

// La vitrina demo se mudó al directorio + tiendas por slug.
export default function TiendaLegacy() {
  redirect("/tiendas");
}
