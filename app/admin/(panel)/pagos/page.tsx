import { createClient } from "@/lib/supabase/server";
import { guardarConfigPago } from "../../actions";

export const dynamic = "force-dynamic";

type ConfigPago = {
  titular: string | null;
  cedula: string | null;
  telefono: string | null;
  banco: string | null;
  instrucciones: string | null;
};

const input =
  "rounded-[10px] border border-line-2 px-[13px] py-[10px] text-[14px] text-ink outline-none focus:border-brand";

export default async function PagosPage() {
  const supabase = await createClient();
  const { data: config } = await supabase
    .from("config_pago")
    .select("titular, cedula, telefono, banco, instrucciones")
    .eq("id", 1)
    .maybeSingle<ConfigPago>();

  return (
    <div className="grid gap-8">
      <div>
        <h1 className="font-serif text-[28px] text-ink">Pagos</h1>
        <p className="mt-1 text-[14px] text-body">
          Datos de Pago Móvil que verán los compradores al elegir ese método en el checkout.
        </p>
      </div>

      <form action={guardarConfigPago} className="grid max-w-[560px] gap-2 rounded-[14px] border border-line bg-white p-4">
        <input name="titular" defaultValue={config?.titular ?? ""} placeholder="Titular" className={input} />
        <input name="cedula" defaultValue={config?.cedula ?? ""} placeholder="Cédula" className={input} />
        <input name="telefono" defaultValue={config?.telefono ?? ""} placeholder="Teléfono" className={input} />
        <input name="banco" defaultValue={config?.banco ?? ""} placeholder="Banco" className={input} />
        <textarea
          name="instrucciones"
          defaultValue={config?.instrucciones ?? ""}
          placeholder="Instrucciones adicionales (opcional)"
          className={input}
        />
        <div>
          <button
            type="submit"
            className="mt-1 rounded-full bg-brand px-5 py-2 text-[13px] font-medium text-white transition hover:brightness-110"
          >
            Guardar
          </button>
        </div>
      </form>
    </div>
  );
}
