export type Ok<T> = { readonly kind: "ok"; value: T };
export type Err<E> = { readonly kind: "err"; err: E };
export type Result<T, E> = Ok<T> | Err<E>;

const OK = "ok" as const;
export function ok<T>(value: T): Ok<T> {
  return { kind: OK, value };
}

const ERR = "err" as const;
export function err<E>(err: E): Err<E> {
  return { kind: ERR, err };
}
