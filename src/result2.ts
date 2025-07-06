export type PawResult<T, E> = PawOk<T> | PawError<E>;

const OK = "ok" as const;
export class PawOk<T> {
  public readonly kind = OK;
  public readonly value: T;

  constructor(value: T) {
    this.value = value;
  }

  toJSON(): { kind: typeof OK; value: T } {
    return {
      kind: this.kind,
      value: this.value,
    };
  }
}

const ERR = "err";
export class PawError<E> {
  public readonly kind = ERR;
  public readonly error: E;

  constructor(error: E) {
    this.error = error;
  }

  toJSON(): { kind: typeof ERR; error: E } {
    return {
      kind: this.kind,
      error: this.error,
    };
  }
}
