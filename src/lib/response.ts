export function ok<TData, TMeta extends Record<string, unknown> | undefined = undefined>(
  data: TData,
  meta?: TMeta,
) {
  return meta ? { data, meta } : { data };
}

export function fail(code: string, message: string) {
  return { error: { code, message } };
}

