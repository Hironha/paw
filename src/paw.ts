import { Err, Ok, type Result } from "./result";
import {
  PawArrayIdxError,
  PawArrayTypeError,
  PawBooleanError,
  type PawError,
  PawLiteralError,
  PawNumberError,
  PawObjectPropError,
  PawObjectTypeError,
  PawStringError,
  PawUnionError,
} from "./error";

export type PawResult<T, E extends PawError = PawError> = Result<T, E>;

export type PawType =
  | PawString
  | PawNumber
  | PawBoolean
  | PawUnknown
  | PawArray<PawType>
  | PawObject<Record<string, PawType>>
  | PawOptional<any>
  | PawLiteral<string>
  | PawUnion<Array<PawType>>;

export type PawInfer<T extends PawType> = T extends PawSchema<string, infer U> ? U : "invalid_type";

type ParsedPawObject<T extends Record<string, PawType>> = {
  [K in keyof T]: PawInfer<T[K]>;
} & {};

export interface PawParser<T> {
  parse(val: unknown): T;
  safeParse(val: unknown): PawResult<T>;
}

export interface PawSchema<N extends string, T> extends PawParser<T> {
  readonly kind: N;
}

export interface PawOptional<T extends PawSchema<string, any>>
  extends PawSchema<"opt", ReturnType<T["parse"]> | null | undefined> {
  refine<U>(fn: RefineFn<U>): PawOptional<T>;
}

export interface PawString extends PawSchema<"str", string> {
  optional(): PawOptional<PawString>;
  refine<T>(fn: RefineFn<T>): PawString;
}

export interface PawNumber extends PawSchema<"num", number> {
  int(): PawNumber;
  min(val: number): PawNumber;
  max(val: number): PawNumber;
  optional(): PawOptional<PawNumber>;
  refine<T>(fn: RefineFn<T>): PawNumber;
}

export interface PawBoolean extends PawSchema<"bool", boolean> {
  optional(): PawOptional<PawBoolean>;
  refine<T>(fn: RefineFn<T>): PawBoolean;
}

export interface PawUnknown extends PawSchema<"unknown", unknown> {}

export interface PawArray<T extends PawType> extends PawSchema<"array", PawInfer<T>[]> {
  min(size: number): PawArray<T>;
  max(size: number): PawArray<T>;
  optional(): PawOptional<PawArray<T>>;
  refine<U>(fn: RefineFn<U>): PawArray<T>;
}

export interface PawObject<T extends Record<string, PawType>>
  extends PawSchema<"obj", ParsedPawObject<T>> {
  optional(): PawOptional<PawObject<T>>;
  refine<U>(fn: RefineFn<U>): PawObject<T>;
}

export interface PawLiteral<T extends string> extends PawSchema<"literal", T> {
  optional(): PawOptional<PawLiteral<T>>;
}

export interface PawUnion<T extends Array<PawSchema<any, any>>>
  extends PawSchema<"union", PawInfer<T[number]>> {
  optional(): PawOptional<PawUnion<T>>;
  refine<U>(fn: RefineFn<U>): PawUnion<T>;
}

export type RefineFn<T = any> = (val: unknown) => T;

const OPT = "opt" as const;
export class PawOptionalParser<T extends PawSchema<string, any>> implements PawOptional<T> {
  public readonly kind = OPT;
  private readonly parser: T;
  private refineFn: RefineFn | undefined;

  constructor(parser: T) {
    this.parser = parser;
  }

  refine<U>(fn: RefineFn<U>): PawOptional<T> {
    this.refineFn = fn;
    return this;
  }

  parse(val: unknown): ReturnType<T["parse"]> | null | undefined {
    const result = this.safeParse(val);
    if (result.isErr()) {
      throw new Error(result.value.message);
    }

    return result.value;
  }

  safeParse(val: unknown): PawResult<ReturnType<T["parse"]> | null | undefined> {
    if (this.refineFn) {
      val = this.refineFn(val);
    }

    if (val == null) {
      return new Ok(val);
    }

    return this.parser.safeParse(val);
  }
}

const STR = "str" as const;
class PawStringParser implements PawString {
  public readonly kind = STR;
  private readonly message: string | undefined;
  private refineFn: RefineFn | undefined;

  constructor(message?: string) {
    this.message = message ?? "Value is not a string";
  }

  optional(): PawOptional<PawString> {
    return new PawOptionalParser(this);
  }

  refine<T>(fn: RefineFn<T>): PawString {
    this.refineFn = fn;
    return this;
  }

  parse(val: unknown): string {
    const result = this.safeParse(val);
    if (result.isErr()) {
      throw new Error(result.value.message);
    }

    return result.value;
  }

  safeParse(val: unknown): PawResult<string> {
    if (this.refineFn) {
      val = this.refineFn(val);
    }

    if (typeof val !== "string") {
      const message = this.message ?? "Value is not a string";
      return new Err(new PawStringError(message));
    }

    return new Ok(val);
  }
}

const NUM = "num" as const;
class PawNumberParser implements PawNumber {
  public readonly kind = NUM;
  private readonly message: string | undefined;
  private intcfg: { value: boolean; message?: string } = { value: false };
  private mincfg: { value: number; message?: string } | undefined;
  private maxcfg: { value: number; message?: string } | undefined;
  private refineFn: RefineFn | undefined;

  constructor(message?: string) {
    this.message = message;
  }

  int(message?: string): PawNumber {
    this.intcfg = { value: true, message };
    return this;
  }

  min(value: number, message?: string): PawNumber {
    this.mincfg = { value, message };
    return this;
  }

  max(value: number, message?: string): PawNumber {
    this.maxcfg = { value, message };
    return this;
  }

  optional(): PawOptional<PawNumber> {
    return new PawOptionalParser(this);
  }

  refine<T>(fn: RefineFn<T>): PawNumber {
    this.refineFn = fn;
    return this;
  }

  parse(val: unknown): number {
    const result = this.safeParse(val);
    if (result.isErr()) {
      throw new Error(result.value.message);
    }

    return result.value;
  }

  safeParse(val: unknown): PawResult<number> {
    if (this.refineFn) {
      val = this.refineFn(val);
    }

    if (typeof val !== "number") {
      const message = this.message ?? "Value is not a number";
      return new Err(new PawNumberError(message));
    }

    if (this.intcfg.value && !Number.isInteger(val)) {
      const message = this.intcfg.message ?? "Value is not an integer";
      return new Err(new PawNumberError(message));
    }

    if (this.mincfg && val < this.mincfg.value) {
      const message = this.mincfg.message ?? "Value is smaller than defined min";
      return new Err(new PawNumberError(message));
    }

    if (this.maxcfg && val > this.maxcfg.value) {
      const message = this.maxcfg.message ?? "Value is bigger than defined max";
      return new Err(new PawNumberError(message));
    }

    return new Ok(val);
  }
}

const BOOL = "bool" as const;
class PawBooleanParser implements PawBoolean {
  public readonly kind = BOOL;
  private readonly message: string | undefined;
  private refineFn: RefineFn | undefined;

  constructor(message?: string) {
    this.message = message;
  }

  optional(): PawOptional<PawBoolean> {
    return new PawOptionalParser(this);
  }

  refine<T>(fn: RefineFn<T>): PawBoolean {
    this.refineFn = fn;
    return this;
  }

  parse(val: unknown): boolean {
    const result = this.safeParse(val);
    if (result.isErr()) {
      throw new Error(result.value.message);
    }

    return result.value;
  }

  safeParse(val: unknown): PawResult<boolean> {
    if (this.refineFn) {
      val = this.refineFn(val);
    }

    if (typeof val !== "boolean") {
      const message = this.message ?? "Value is not a boolean";
      return new Err(new PawBooleanError(message));
    }

    return new Ok(val);
  }
}

const UNKNOWN = "unknown" as const;
class PawUnknownParser implements PawUnknown {
  public readonly kind = UNKNOWN;

  parse(val: unknown): unknown {
    return val;
  }

  safeParse(val: unknown): PawResult<unknown> {
    return new Ok(val);
  }
}

const ARRAY = "array" as const;
class PawArrayParser<T extends PawType> implements PawArray<T> {
  public readonly kind = ARRAY;
  private readonly unit: T;
  private readonly message: string | undefined;
  private maxcfg: { value: number; message?: string } | undefined;
  private mincfg: { value: number; message?: string } | undefined;
  private refineFn: RefineFn | undefined;

  constructor(unit: T, message?: string) {
    this.unit = unit;
    this.message = message;
  }

  max(size: number, message?: string): PawArray<T> {
    this.maxcfg = { value: size, message };
    return this;
  }

  min(size: number, message?: string): PawArray<T> {
    this.mincfg = { value: size, message };
    return this;
  }

  optional(): PawOptional<PawArray<T>> {
    return new PawOptionalParser(this);
  }

  refine<U>(fn: RefineFn<U>): PawArray<T> {
    this.refineFn = fn;
    return this;
  }

  parse(val: unknown): PawInfer<T>[] {
    const result = this.safeParse(val);
    if (result.isErr()) {
      throw new Error(result.value.message);
    }

    return result.value;
  }

  safeParse(val: unknown): PawResult<PawInfer<T>[]> {
    if (this.refineFn) {
      val = this.refineFn(val);
    }

    if (!Array.isArray(val)) {
      const message = this.message ?? "Value is not an array";
      return new Err(new PawArrayTypeError(message));
    }

    if (this.maxcfg != null && val.length > this.maxcfg.value) {
      const message = this.maxcfg.message ?? "Array bigger than max size";
      return new Err(new PawArrayTypeError(message));
    }

    if (this.mincfg != null && val.length < this.mincfg.value) {
      const message = this.mincfg.message ?? "Array smaller than min size";
      return new Err(new PawArrayTypeError(message));
    }

    for (let i = 0; i < val.length; i++) {
      const v = val[i];
      const parsed = this.unit.safeParse(v);
      if (parsed.isErr()) {
        return new Err(new PawArrayIdxError(i, parsed.value));
      }
    }

    return new Ok(val);
  }
}

const OBJ = "obj" as const;
class PawObjectParser<T extends Record<string, PawType>> implements PawObject<T> {
  public readonly kind = OBJ;
  private readonly fields: T;
  private readonly message: string | undefined;
  private refineFn: RefineFn | undefined;

  constructor(fields: T, message?: string) {
    this.fields = fields;
    this.message = message;
  }

  optional(): PawOptional<PawObject<T>> {
    return new PawOptionalParser(this);
  }

  refine<U>(fn: RefineFn<U>): PawObject<T> {
    this.refineFn = fn;
    return this;
  }

  parse(val: unknown): ParsedPawObject<T> {
    const result = this.safeParse(val);
    if (result.isErr()) {
      throw new Error(result.value.message);
    }

    return result.value;
  }

  safeParse(val: unknown): PawResult<ParsedPawObject<T>> {
    if (this.refineFn) {
      val = this.refineFn(val);
    }

    if (val == null || typeof val !== "object") {
      const message = this.message ?? "Value is not an object";
      return new Err(new PawObjectTypeError(message));
    }

    const obj: Record<string, unknown> = val as Record<string, unknown>;
    for (const k in this.fields) {
      const v = obj[k];
      const parsed = this.fields[k]!.safeParse(v);
      if (parsed.isErr()) {
        return new Err(new PawObjectPropError(k, parsed.value));
      }
    }

    return new Ok(obj as ParsedPawObject<T>);
  }
}

const LITERAL = "literal" as const;
class PawLiteralParser<const T extends string> implements PawLiteral<T> {
  public readonly kind = LITERAL;
  private readonly values: T[];
  private readonly message: string;

  constructor(values: T[], message?: string) {
    this.values = values;
    this.message = message ?? "Value is not a valid literal variant";
  }

  optional(): PawOptional<PawLiteral<T>> {
    return new PawOptionalParser(this);
  }

  parse(val: unknown): T {
    const result = this.safeParse(val);
    if (result.isErr()) {
      throw new Error(result.value.message);
    }
    return result.value;
  }

  safeParse(val: unknown): PawResult<T> {
    if (typeof val !== "string") {
      return new Err(new PawLiteralError(this.message));
    }

    const idx = this.values.indexOf(val as T);
    if (idx < 0) {
      return new Err(new PawLiteralError(this.message));
    }

    return new Ok(val as T);
  }
}

const UNION = "union" as const;
class PawUnionParser<T extends Array<PawSchema<any, any>>> implements PawUnion<T> {
  public readonly kind = UNION;
  private readonly schemas: T;
  private readonly message: string;
  private refineFn: RefineFn | undefined;

  constructor(schemas: T, message?: string) {
    this.schemas = schemas;
    this.message = message ?? "Value failed unions constraints";
  }

  optional(): PawOptional<PawUnion<T>> {
    return new PawOptionalParser(this);
  }

  refine<U>(fn: RefineFn<U>): PawUnion<T> {
    this.refineFn = fn;
    return this;
  }

  parse(val: unknown): PawInfer<T[number]> {
    const result = this.safeParse(val);
    if (result.isErr()) {
      throw new Error(result.value.message);
    }

    return result.value;
  }

  safeParse(val: unknown): PawResult<PawInfer<T[number]>> {
    if (this.refineFn) {
      val = this.refineFn(val);
    }

    for (const schema of this.schemas) {
      const parsed = schema.safeParse(val);
      if (parsed.isOk()) {
        return parsed;
      }
    }

    // [TODO] improve error message
    return new Err(new PawUnionError(this.message));
  }
}

export function string(message?: string): PawString {
  return new PawStringParser(message);
}

export function number(message?: string): PawNumber {
  return new PawNumberParser(message);
}

export function boolean(message?: string): PawBoolean {
  return new PawBooleanParser(message);
}

export function unknown(): PawUnknown {
  return new PawUnknownParser();
}

export function array<T extends PawType>(unit: T, message?: string): PawArray<T> {
  return new PawArrayParser(unit, message);
}

export function object<T extends Record<string, PawType>>(
  fields: T,
  message?: string,
): PawObject<T> {
  return new PawObjectParser(fields, message);
}

export function literal<const T extends string>(values: T[], message?: string): PawLiteral<T> {
  return new PawLiteralParser(values, message);
}

export function union<T extends Array<PawSchema<any, any>>>(
  schemas: T,
  message?: string,
): PawUnion<T> {
  return new PawUnionParser(schemas, message);
}
