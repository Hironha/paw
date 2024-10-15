import * as Result from "./result.ts";

export type PawError = {
  message: string;
};

export type PawResult<T> = Result.Result<T, PawError>;

export type PawType =
  | PawString
  | PawNumber
  | PawBoolean
  | PawUnknown
  | PawArray<PawType>
  | PawObject<Record<string, PawType>>
  | PawOptional<any>
  | PawLiteral<string>;

export type PawInfer<T extends PawType> = T extends PawSchema<string, infer U> ? U
  : "invalid_type";

type ParsedPawObject<T extends Record<string, PawType>> =
  & {
    [K in keyof T]: PawInfer<T[K]>;
  }
  & {};

export interface PawParser<T> {
  parse(val: unknown): T;
  safeParse(val: unknown): PawResult<T>;
}

export interface PawSchema<N extends string, T> extends PawParser<T> {
  readonly kind: N;
}

export interface PawOptional<T extends PawSchema<string, any>>
  extends PawSchema<"opt", ReturnType<T["parse"]> | null | undefined> {}

export interface PawString extends PawSchema<"str", string> {
  optional(): PawOptional<PawString>;
}

export interface PawNumber extends PawSchema<"num", number> {
  optional(): PawOptional<PawNumber>;
  min(val: number): PawNumber;
  max(val: number): PawNumber;
  int(): PawNumber;
}

export interface PawBoolean extends PawSchema<"bool", boolean> {
  optional(): PawOptional<PawBoolean>;
}

export interface PawUnknown extends PawSchema<"unknown", unknown> {}

export interface PawArray<T extends PawType> extends PawSchema<"array", PawInfer<T>[]> {
  optional(): PawOptional<PawArray<T>>;
  min(size: number): PawArray<T>;
  max(size: number): PawArray<T>;
}

export interface PawObject<T extends Record<string, PawType>>
  extends PawSchema<"object", ParsedPawObject<T>> {
  optional(): PawOptional<PawObject<T>>;
}

export interface PawLiteral<T extends string> extends PawSchema<"literal", T> {
  optional(): PawOptional<PawLiteral<T>>;
}

const OPT = "opt" as const;
export class PawOptionalDecorator<T extends PawSchema<string, any>> implements PawOptional<T> {
  public readonly kind = OPT;
  protected readonly parser: T;

  constructor(parser: T) {
    this.parser = parser;
  }

  parse(val: unknown): ReturnType<T["parse"]> | null | undefined {
    if (val == null) {
      return val;
    }
    return this.parser.parse(val);
  }

  safeParse(
    val: unknown,
  ): PawResult<ReturnType<T["parse"]> | null | undefined> {
    if (val == null) {
      return Result.ok(val);
    }
    return this.parser.safeParse(val);
  }
}

const STR = "str" as const;
class PawStringParser implements PawString {
  public readonly kind = STR;

  optional(): PawOptional<PawString> {
    return new PawOptionalDecorator(this);
  }

  parse(val: unknown): string {
    if (typeof val !== "string") {
      throw new Error("Value is not a string");
    }
    return val;
  }

  safeParse(val: unknown): PawResult<string> {
    if (typeof val !== "string") {
      return Result.err({ message: "Value is not a string" });
    }
    return Result.ok(val);
  }
}

const NUM = "num" as const;
class PawNumberParser implements PawNumber {
  public readonly kind = NUM;
  private _int: boolean = false;
  private _min: number | undefined;
  private _max: number | undefined;

  int(): PawNumber {
    this._int = true;
    return this;
  }

  min(val: number): PawNumber {
    this._min = val;
    return this;
  }

  max(val: number): PawNumber {
    this._max = val;
    return this;
  }

  optional(): PawOptional<PawNumber> {
    return new PawOptionalDecorator(this);
  }

  parse(val: unknown): number {
    const result = this.safeParse(val);
    if (result.kind === "err") {
      throw new Error(result.err.message);
    }

    return result.value;
  }

  safeParse(val: unknown): PawResult<number> {
    if (typeof val !== "number") {
      return Result.err({ message: "Value is not a number" });
    }

    if (this._int && !Number.isInteger(val)) {
      return Result.err({ message: "Value is not an integer" });
    }

    if (this._min && val < this._min) {
      return Result.err({ message: "Value is smaller than defined min" });
    }

    if (this._max && val > this._max) {
      return Result.err({ message: "Value is bigger than defined max" });
    }

    return Result.ok(val);
  }
}

const BOOL = "bool" as const;
class PawBooleanParser implements PawBoolean {
  public readonly kind = BOOL;

  optional(): PawOptional<PawBoolean> {
    return new PawOptionalDecorator(this);
  }

  parse(val: unknown): boolean {
    if (typeof val !== "boolean") {
      throw new Error("Value is not a boolean");
    }
    return val;
  }

  safeParse(val: unknown): PawResult<boolean> {
    if (typeof val !== "boolean") {
      return Result.err({ message: "Value is not a boolean" });
    }
    return Result.ok(val);
  }
}

const UNKNOWN = "unknown" as const;
class PawUnknownParser implements PawUnknown {
  public readonly kind = UNKNOWN;

  parse(val: unknown): unknown {
    return val;
  }

  safeParse(val: unknown): PawResult<unknown> {
    return Result.ok(val);
  }
}

const ARRAY = "array" as const;
class PawArrayParser<T extends PawType> implements PawArray<T> {
  public readonly kind = ARRAY;
  private readonly _unit: T;
  private _max: number | undefined;
  private _min: number | undefined;

  constructor(unit: T) {
    this._unit = unit;
  }

  max(size: number): PawArray<T> {
    this._max = size;
    return this;
  }

  min(size: number): PawArray<T> {
    this._min = size;
    return this;
  }

  optional(): PawOptional<PawArray<T>> {
    return new PawOptionalDecorator(this);
  }

  parse(val: unknown): PawInfer<T>[] {
    const result = this.safeParse(val);
    if (result.kind === "err") {
      throw new Error(result.err.message);
    }
    return result.value;
  }

  safeParse(val: unknown): PawResult<PawInfer<T>[]> {
    if (!Array.isArray(val)) {
      return Result.err({ message: "Value is not an array" });
    }

    if (this._max != null && val.length > this._max) {
      return Result.err({ message: "Array bigger than max size" });
    }

    if (this._min != null && val.length > this._min) {
      return Result.err({ message: "Array smaller than min size" });
    }

    for (const v of val) {
      const parsed = this._unit.safeParse(v);
      if (parsed.kind === "err") {
        return Result.err(parsed.err);
      }
    }

    return Result.ok(val);
  }
}

const OBJECT = "object" as const;
class PawObjectParser<T extends Record<string, PawType>> implements PawObject<T> {
  public readonly kind = OBJECT;
  private readonly fields: T;

  constructor(fields: T) {
    this.fields = fields;
  }

  optional(): PawOptional<PawObject<T>> {
    return new PawOptionalDecorator(this);
  }

  parse(val: unknown): ParsedPawObject<T> {
    if (!val || typeof val !== "object") {
      throw new Error("Value is not an object");
    }

    const obj: Record<string, unknown> = val as Record<string, unknown>;
    for (const k in this.fields) {
      const v = obj[k];
      this.fields[k]!.parse(v);
    }

    return obj as ParsedPawObject<T>;
  }

  safeParse(val: unknown): PawResult<ParsedPawObject<T>> {
    if (!val || typeof val !== "object") {
      throw new Error("Value is not an object");
    }

    const obj: Record<string, unknown> = val as Record<string, unknown>;
    for (const k in this.fields) {
      const v = obj[k];
      const parsed = this.fields[k]!.safeParse(v);
      if (parsed.kind === "err") {
        return Result.err(parsed.err);
      }
    }

    return Result.ok(obj as ParsedPawObject<T>);
  }
}

const LITERAL = "literal" as const;
class PawLiteralParser<T extends string> implements PawLiteral<T> {
  public readonly kind = LITERAL;
  private readonly _values: T[];

  constructor(...values: T[]) {
    this._values = values;
  }

  optional(): PawOptional<PawLiteral<T>> {
    return new PawOptionalDecorator(this);
  }

  parse(val: unknown): T {
    const result = this.safeParse(val);
    if (result.kind === "err") {
      throw new Error(result.err.message);
    }
    return result.value;
  }

  safeParse(val: unknown): PawResult<T> {
    if (typeof val !== "string") {
      return Result.err({ message: "Value is not a literal string" });
    }

    const idx = this._values.indexOf(val as T);
    if (idx < 0) {
      return Result.err({ message: "Value is not a valid literal" });
    }
    return Result.ok(val as T);
  }
}

class Paw {
  string(): PawString {
    return new PawStringParser();
  }

  number(): PawNumber {
    return new PawNumberParser();
  }

  boolean(): PawBoolean {
    return new PawBooleanParser();
  }

  unknown(): PawUnknown {
    return new PawUnknownParser();
  }

  array<T extends PawType>(unit: T): PawArray<T> {
    return new PawArrayParser(unit);
  }

  object<T extends Record<string, PawType>>(fields: T): PawObject<T> {
    return new PawObjectParser(fields);
  }

  literal<T extends string>(...values: T[]): PawLiteral<T> {
    return new PawLiteralParser(...values);
  }
}

export const paw = new Paw();
