"use client";

import type { ReactNode } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import type { ResumenCitas, ResumenTienda, PuntoMensual, TopRecurso } from "./analisis-datos";

// Paleta de marca (ver app/globals.css @theme) para que las gráficas combinen
// con el resto del panel admin.
const BRAND = "#3f8f79";
const BRAND_LIGHT = "#7fc0ac";
const BRAND_DARK = "#357a67";
const SAND = "#c9b998";
const MUTED = "#8a8175";
const CANCEL = "#c96a4f";
const PIE_COLORS = [BRAND, SAND, CANCEL, BRAND_LIGHT, BRAND_DARK, MUTED];

type Datos = {
  citas: ResumenCitas;
  tienda: ResumenTienda;
  serie: PuntoMensual[];
  top: TopRecurso[];
  totalRecursos: number;
  recursosActivos: number;
};

function Stat({ label, valor }: { label: string; valor: string | number }) {
  return (
    <div className="rounded-[14px] border border-line bg-white p-5">
      <div className="font-serif text-[34px] leading-none text-ink">{valor}</div>
      <div className="mt-1.5 text-[13px] text-body">{label}</div>
    </div>
  );
}

function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-[14px] border border-line bg-white p-5">
      <h2 className="mb-4 font-serif text-[18px] text-ink">{title}</h2>
      <div className="w-full overflow-x-auto">
        <div className="h-[280px] min-w-[320px]">{children}</div>
      </div>
    </section>
  );
}

const money = (n: number) => `$${n.toFixed(2)}`;
// Recharts tipa el valor del Tooltip como ValueType (number | string | array
// | undefined); estos formatters solo se usan en series numéricas propias.
const moneyFmt = (v: unknown) => money(Number(v));
const topFmt = (v: unknown, name: unknown) => (name === "ingresos" ? money(Number(v)) : Number(v));

export function AnalisisCharts({ datos }: { datos: Datos }) {
  const { citas, tienda, serie, top, totalRecursos, recursosActivos } = datos;
  const ingresosTotales = citas.ingresos + tienda.ingresos;

  const porEstado = [
    { nombre: "Pendientes", valor: citas.pendientes },
    { nombre: "Confirmadas", valor: citas.confirmadas },
    { nombre: "Canceladas", valor: citas.canceladas },
  ].filter((d) => d.valor > 0);

  const porModalidad = [
    { nombre: "Online", valor: citas.online },
    { nombre: "Presencial", valor: citas.presencial },
  ].filter((d) => d.valor > 0);

  return (
    <div className="grid gap-8">
      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Citas totales" valor={citas.total} />
        <Stat label="Reagendadas" valor={citas.reagendadas} />
        <Stat label="Canceladas" valor={citas.canceladas} />
        <Stat label="Recursos (activos)" valor={`${totalRecursos} (${recursosActivos})`} />
        <Stat label="Ventas de recursos" valor={tienda.ventas} />
        <Stat label="Ingresos tienda" valor={money(tienda.ingresos)} />
        <Stat label="Ingresos citas" valor={money(citas.ingresos)} />
        <Stat label="Ingresos totales" valor={money(ingresosTotales)} />
      </div>

      {/* Serie mensual — citas y recursos en gráficas separadas: son negocios distintos. */}
      <div className="grid gap-6 sm:grid-cols-2">
        <Card title="Agendamientos por mes">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={serie}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e7ded1" />
              <XAxis dataKey="mes" stroke="#8a8175" fontSize={12} />
              <YAxis stroke="#8a8175" fontSize={12} />
              <Tooltip />
              <Line type="monotone" dataKey="citas" name="Citas" stroke={BRAND} strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        <Card title="Ventas de recursos por mes">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={serie}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e7ded1" />
              <XAxis dataKey="mes" stroke="#8a8175" fontSize={12} />
              <YAxis stroke="#8a8175" fontSize={12} />
              <Tooltip />
              <Line type="monotone" dataKey="ventas" name="Ventas" stroke={SAND} strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <Card title="Ingresos de citas por mes">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={serie}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e7ded1" />
              <XAxis dataKey="mes" stroke="#8a8175" fontSize={12} />
              <YAxis stroke="#8a8175" fontSize={12} />
              <Tooltip formatter={moneyFmt} />
              <Bar dataKey="ingresosCitas" name="Ingresos citas" fill={BRAND} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card title="Ingresos de recursos por mes">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={serie}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e7ded1" />
              <XAxis dataKey="mes" stroke="#8a8175" fontSize={12} />
              <YAxis stroke="#8a8175" fontSize={12} />
              <Tooltip formatter={moneyFmt} />
              <Bar dataKey="ingresosTienda" name="Ingresos recursos" fill={SAND} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Citas: estado y modalidad */}
      <div className="grid gap-6 sm:grid-cols-2">
        <Card title="Citas por estado">
          {porEstado.length ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={porEstado} dataKey="valor" nameKey="nombre" outerRadius={90} label>
                  {porEstado.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-[14px] text-body">Sin datos.</p>
          )}
        </Card>

        <Card title="Citas por modalidad">
          {porModalidad.length ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={porModalidad} dataKey="valor" nameKey="nombre" outerRadius={90} label>
                  {porModalidad.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-[14px] text-body">Sin datos.</p>
          )}
        </Card>
      </div>

      {/* Ingresos por método y categoría */}
      <div className="grid gap-6 sm:grid-cols-2">
        <Card title="Ingresos por método de pago">
          {tienda.porMetodo.length ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={tienda.porMetodo} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#e7ded1" />
                <XAxis type="number" stroke="#8a8175" fontSize={12} />
                <YAxis type="category" dataKey="metodo" stroke="#8a8175" fontSize={12} width={80} />
                <Tooltip formatter={moneyFmt} />
                <Bar dataKey="ingresos" name="Ingresos" fill={BRAND_LIGHT} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-[14px] text-body">Sin ventas todavía.</p>
          )}
        </Card>

        <Card title="Ingresos por categoría de recurso">
          {tienda.porCategoria.length ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={tienda.porCategoria} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#e7ded1" />
                <XAxis type="number" stroke="#8a8175" fontSize={12} />
                <YAxis type="category" dataKey="categoria" stroke="#8a8175" fontSize={12} width={110} />
                <Tooltip formatter={moneyFmt} />
                <Bar dataKey="ingresos" name="Ingresos" fill={BRAND_DARK} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-[14px] text-body">Sin ventas todavía.</p>
          )}
        </Card>
      </div>

      {/* Top recursos */}
      <Card title="Recursos más vendidos">
        {top.length ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={top.slice(0, 10)} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#e7ded1" />
              <XAxis type="number" stroke="#8a8175" fontSize={12} />
              <YAxis type="category" dataKey="titulo" stroke="#8a8175" fontSize={12} width={140} />
              <Tooltip formatter={topFmt} />
              <Legend />
              <Bar dataKey="ventas" name="Ventas" fill={SAND} radius={[0, 4, 4, 0]} />
              <Bar dataKey="ingresos" name="Ingresos" fill={BRAND} radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-[14px] text-body">Sin ventas todavía.</p>
        )}
      </Card>
    </div>
  );
}
