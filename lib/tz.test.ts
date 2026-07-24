import { describe, it, expect } from "vitest";
import { convertirHora, caracasWallToInstant, ZONA_CARACAS } from "./tz";

describe("tz", () => {
  describe("caracasWallToInstant", () => {
    it("interpreta la hora de pared de Caracas como -04:00", () => {
      // 10:00 en Caracas (GMT-4) = 14:00 UTC.
      const inst = caracasWallToInstant("2026-08-03", "10:00");
      expect(inst.toISOString()).toBe("2026-08-03T14:00:00.000Z");
    });
  });

  describe("convertirHora", () => {
    it("misma zona (Caracas → Caracas) no cambia la hora", () => {
      expect(convertirHora("2026-08-03", "10:00", ZONA_CARACAS)).toEqual({
        hora: "10:00",
        difDia: 0,
      });
    });

    it("Caracas → Bogotá resta una hora, mismo día", () => {
      // Bogotá es GMT-5: 10:00 Caracas = 09:00 Bogotá.
      expect(convertirHora("2026-08-03", "10:00", "America/Bogota")).toEqual({
        hora: "09:00",
        difDia: 0,
      });
    });

    it("Caracas → Madrid (verano) cruza a la madrugada del día siguiente", () => {
      // Madrid verano = GMT+2. 18:00 Caracas (22:00 UTC) = 00:00 Madrid del día siguiente.
      expect(convertirHora("2026-08-03", "18:00", "Europe/Madrid")).toEqual({
        hora: "00:00",
        difDia: 1,
      });
    });

    it("Caracas → Los Ángeles resta y puede quedar el día anterior de madrugada", () => {
      // LA verano = GMT-7. 02:00 Caracas (06:00 UTC) = 23:00 del día anterior en LA.
      expect(convertirHora("2026-08-03", "02:00", "America/Los_Angeles")).toEqual({
        hora: "23:00",
        difDia: -1,
      });
    });
  });
});
