export type Result<T, E> = Ok<T> | Err<E>;

interface ResultVariant<T, E> {
  ok(): T | undefined;
  err(): E | undefined;
  isOk(): this is Ok<T>;
  isErr(): this is Err<E>;
  unwrap(): T;
  unwrapErr(): E;
  expect(message: string): T;
  expectErr(message: string): E;
}

export function ok<T>(value: T): Ok<T> {
  return new Ok(value);
}

export function err<E>(value: E): Err<E> {
  return new Err(value);
}

const OK = "ok" as const;
export class Ok<T> implements ResultVariant<T, never> {
  public readonly _kind = OK;
  public readonly value: T;

  constructor(value: T) {
    this.value = value;
  }

  ok(): T {
    return this.value;
  }

  err(): undefined {
    return undefined;
  }

  isOk(): this is Ok<T> {
    return true;
  }

  isErr(): this is Err<never> {
    return false;
  }

  unwrap(): T {
    return this.value;
  }

  unwrapErr(): never {
    throw new Error("Unwrap error of ok result variant");
  }

  expect(): T {
    return this.value;
  }

  expectErr(message: string): never {
    throw new Error(message);
  }
}

const ERR = "err" as const;
export class Err<E> implements ResultVariant<never, E> {
  public readonly _kind = ERR;
  public readonly value: E;

  constructor(value: E) {
    this.value = value;
  }

  ok(): undefined {
    return undefined;
  }

  err(): E {
    return this.value;
  }

  isOk(): this is Ok<never> {
    return false;
  }

  isErr(): this is Err<E> {
    return true;
  }

  unwrap(): never {
    throw new Error("Unwrap ok of err result variant");
  }

  unwrapErr(): E {
    return this.value;
  }

  expect(message: string): never {
    throw new Error(message);
  }

  expectErr(): E {
    return this.value;
  }
}
