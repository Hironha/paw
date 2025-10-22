export type PawResult<T, E> = PawOk<T> | PawError<E>;

export class PawOk<T> {
  public readonly ok: true = true;
  public readonly value: T;

  constructor(value: T) {
    this.value = value;
  }

  /**
   * @throws {Error} Throws an error when `result` is a `PawError`
   */
  static unwrap<T, E>(result: PawResult<T, E>): T {
    if (!result.ok) {
      throw new Error("Attempt to unwrap a paw error variant");
    }
    return result.value;
  }
}

export class PawError<E> {
  public readonly ok: false = false;
  public readonly error: E;

  constructor(error: E) {
    this.error = error;
  }

  /**
   * @throws {Error} Throws an error when `result` is a `PawError`
   */
  static unwrap<T, E>(result: PawResult<T, E>): E {
    if (result.ok) {
      throw new Error("Attempt to unwrap error a paw ok variant");
    }
    return result.error;
  }
}
