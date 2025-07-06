export type PawIssue =
  | PawStringError
  | PawNumberError
  | PawBooleanError
  | PawArrayTypeError
  | PawArrayIdxError
  | PawObjectTypeError
  | PawObjectPropError
  | PawLiteralError
  | PawUnionError;

interface PawErrorBase {
  readonly message: string;
}

const STR = "str" as const;
export class PawStringError implements PawErrorBase {
  public readonly source = STR;
  public message: string;

  constructor(message: string) {
    this.message = message;
  }
}

const NUM = "num" as const;
export class PawNumberError implements PawErrorBase {
  public readonly source = NUM;
  public message: string;

  constructor(message: string) {
    this.message = message;
  }
}

const BOOL = "bool" as const;
export class PawBooleanError implements PawErrorBase {
  public readonly source = BOOL;
  public message: string;

  constructor(message: string) {
    this.message = message;
  }
}

const ARR = "arr" as const;
const ARR_TYPE = "type" as const;
export class PawArrayTypeError implements PawErrorBase {
  public readonly source = ARR;
  public readonly kind = ARR_TYPE;
  public message: string;

  constructor(message: string) {
    this.message = message;
  }
}

const ARR_IDX = "idx" as const;
export class PawArrayIdxError implements PawErrorBase {
  public readonly source = ARR;
  public readonly kind = ARR_IDX;
  public readonly idx: number;
  public error: PawIssue;

  constructor(idx: number, error: PawIssue) {
    this.idx = idx;
    this.error = error;
  }

  get message(): string {
    return this.error.message;
  }
}

const OBJ = "obj" as const;
const OBJ_TYPE = "type" as const;
export class PawObjectTypeError implements PawErrorBase {
  public readonly source = OBJ;
  public readonly kind = OBJ_TYPE;
  public message: string;

  constructor(message: string) {
    this.message = message;
  }
}

const OBJ_PROP = "prop" as const;
export class PawObjectPropError implements PawErrorBase {
  public readonly source = OBJ;
  public readonly kind = OBJ_PROP;
  public readonly prop: string;
  public error: PawIssue;

  constructor(prop: string, error: PawIssue) {
    this.prop = prop;
    this.error = error;
  }

  get message(): string {
    return this.error.message;
  }
}

const LITERAL = "literal" as const;
export class PawLiteralError implements PawErrorBase {
  public readonly source = LITERAL;
  public message: string;

  constructor(message: string) {
    this.message = message;
  }
}

const UNION = "union" as const;
export class PawUnionError implements PawErrorBase {
  public readonly source = UNION;
  public message: string;

  constructor(message: string) {
    this.message = message;
  }
}
