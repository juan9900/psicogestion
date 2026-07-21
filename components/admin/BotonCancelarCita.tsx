"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { actualizarEstadoCita } from "@/app/admin/actions";
import { Modal } from "./Modal";

function BotonConfirmar() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-full bg-[#a3402c] px-4 py-2 text-[13px] font-medium text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? "Cancelando…" : "Sí, cancelar"}
    </button>
  );
}

export function BotonCancelarCita({ id, nombre }: { id: string; nombre: string }) {
  const [abierto, setAbierto] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setAbierto(true)}
        className="rounded-full border border-line-2 px-3 py-1.5 text-[12px] text-body transition hover:bg-cream"
      >
        Cancelar
      </button>

      {abierto && (
        <Modal titulo="Cancelar cita" onClose={() => setAbierto(false)}>
          <div className="grid gap-4">
            <p className="text-[14px] text-body">
              ¿Seguro que quieres cancelar la cita de <span className="text-ink">{nombre}</span>? Esta
              acción libera el horario y no se puede deshacer.
            </p>
            <div className="flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={() => setAbierto(false)}
                className="rounded-full border border-line-2 px-4 py-2 text-[13px] text-body transition hover:bg-cream"
              >
                No, volver
              </button>
              <form action={actualizarEstadoCita}>
                <input type="hidden" name="id" value={id} />
                <input type="hidden" name="estado" value="cancelada" />
                <BotonConfirmar />
              </form>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
