// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";
import { EstadoOrdenWatcher } from "./EstadoOrdenWatcher";

const refreshMock = vi.fn();
const removeChannelMock = vi.fn();
const onMock = vi.fn();
const subscribeMock = vi.fn();
const channelMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: refreshMock }),
}));

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    channel: (...args: unknown[]) => channelMock(...args),
    removeChannel: (...args: unknown[]) => removeChannelMock(...args),
  }),
}));

beforeEach(() => {
  refreshMock.mockReset();
  removeChannelMock.mockReset();
  onMock.mockReset();
  subscribeMock.mockReset();
  channelMock.mockReset();

  const fakeChannel = { on: onMock, subscribe: subscribeMock };
  onMock.mockReturnValue(fakeChannel);
  subscribeMock.mockReturnValue(fakeChannel);
  channelMock.mockReturnValue(fakeChannel);
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("EstadoOrdenWatcher", () => {
  it("no se suscribe a nada si el estado no es 'pendiente'", () => {
    render(<EstadoOrdenWatcher estado="pagada" token="tok-1" />);
    expect(channelMock).not.toHaveBeenCalled();
  });

  it("se suscribe al canal 'orden-<token>' y escucha el evento 'estado' cuando está pendiente", () => {
    render(<EstadoOrdenWatcher estado="pendiente" token="tok-1" />);

    expect(channelMock).toHaveBeenCalledWith("orden-tok-1");
    expect(onMock).toHaveBeenCalledWith("broadcast", { event: "estado" }, expect.any(Function));
    expect(subscribeMock).toHaveBeenCalled();
  });

  it("refresca el router cuando llega el evento de broadcast", () => {
    render(<EstadoOrdenWatcher estado="pendiente" token="tok-1" />);

    const handler = onMock.mock.calls[0][2] as () => void;
    handler();

    expect(refreshMock).toHaveBeenCalledTimes(1);
  });

  it("limpia la suscripción al desmontar", () => {
    const { unmount } = render(<EstadoOrdenWatcher estado="pendiente" token="tok-1" />);
    const fakeChannel = channelMock.mock.results[0].value;

    unmount();

    expect(removeChannelMock).toHaveBeenCalledWith(fakeChannel);
  });

  it("usa un refresh de respaldo cada 60s mientras esté pendiente", () => {
    vi.useFakeTimers();
    render(<EstadoOrdenWatcher estado="pendiente" token="tok-1" />);

    vi.advanceTimersByTime(60000);

    expect(refreshMock).toHaveBeenCalledTimes(1);
  });
});
