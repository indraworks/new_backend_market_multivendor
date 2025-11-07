export type EnvelopeState = "success" | "loading" | "error" | "noData";

export function envelope(
  state: EnvelopeState,
  data?: any,
  message?: string,
  meta?: any
) {
  return {
    state,
    message: message ?? (state === "success" ? "OK" : undefined),
    data: data ?? null,
    meta: meta ?? undefined,
  };
}
