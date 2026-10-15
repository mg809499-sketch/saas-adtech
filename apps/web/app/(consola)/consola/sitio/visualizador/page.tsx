import Link from "next/link";
import { VisualBuilder } from "../../../../../components/site/VisualBuilder";
import "../../../../../components/site/canvas.css";

export default function VisualizadorPage() {
  return (
    <div className="p-5 lg:p-8 max-w-[1400px] mx-auto flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-3">
        <div>
          <h1 className="text-3xl font-extrabold">Visualizador sin código</h1>
          <p className="text-sm text-on-surface-variant">Lienzo neutro: así se verá en cualquier tema, sin el estilo de GrowUp.</p>
        </div>
        <Link href="/consola/sitio" className="ml-auto px-4 py-2 rounded-xl bg-surface-container-high font-bold text-sm">← Volver a Mi sitio</Link>
      </div>
      <VisualBuilder />
    </div>
  );
}
