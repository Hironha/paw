import { PawError, PawOk, type PawResult } from "./result";
import {
  PawArraySchemaIssue,
  type PawArrayIndexIssue,
  PawArrayTypeIssue,
  PawBooleanIssue,
  type PawIssue,
  PawLiteralIssue,
  PawNumberIssue,
  type PawObjectFieldIssue,
  PawObjectSchemaIssue,
  PawObjectTypeIssue,
  PawRequiredIssue,
  PawStringIssue,
  PawUnionIssue,
  PawParseError,
} from "./issue";

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

export type PawInfer<T extends PawType> = T extends PawSchema<string, infer U> ? U : "invalid-type";

type PawParsedObject<T extends Record<string, PawType>> = {
  [K in keyof T]: PawInfer<T[K]>;
} & {};

export type RefineFn<T = any> = (val: unknown) => T;

export interface PawParser<T> {
  /**
   * @throws {Error} Throws a `PawParseError` when parsing fails
   */
  parse(val: unknown): T;
  safeParse(val: unknown): PawResult<T, PawIssue>;
}

export interface PawSchema<N extends string, T> extends PawParser<T> {
  readonly kind: N;
}

export interface PawRefinable<S extends PawParser<any>> {
  /** Transform the value before validation */
  refine<T>(fn: RefineFn<T>): S;
}

export interface PawOptional<T extends PawSchema<string, any>>
  extends PawSchema<"opt", ReturnType<T["parse"]> | null | undefined> {}

export interface PawMaybeOptional<S extends PawSchema<string, any>> {
  /** Allow value to be `null` or `undefined` */
  optional(): PawOptional<S>;
  /** Set the required error message. Does NOT change any validations or type schema. */
  required(message: string): S;
}

export interface PawString
  extends PawSchema<"str", string>,
    PawRefinable<PawString>,
    PawMaybeOptional<PawString> {}

export interface PawNumber
  extends PawSchema<"num", number>,
    PawRefinable<PawNumber>,
    PawMaybeOptional<PawNumber> {
  int(): PawNumber;
  min(val: number): PawNumber;
  max(val: number): PawNumber;
}

export interface PawBoolean
  extends PawSchema<"bool", boolean>,
    PawRefinable<PawBoolean>,
    PawMaybeOptional<PawBoolean> {}

export interface PawUnknown extends PawSchema<"unknown", unknown> {}

export interface PawArray<T extends PawType>
  extends PawSchema<"array", PawInfer<T>[]>,
    PawRefinable<PawArray<T>>,
    PawMaybeOptional<PawArray<T>> {
  /**
   * Set array parsing to immediate mode. Immediate mode stops parsing the object when the first
   * error is encountered.
   */
  immediate(): PawArray<T>;
  min(size: number): PawArray<T>;
  max(size: number): PawArray<T>;
}

export interface PawObject<T extends Record<string, PawType>>
  extends PawSchema<"obj", PawParsedObject<T>>,
    PawRefinable<PawObject<T>>,
    PawMaybeOptional<PawObject<T>> {
  /**
   * Set object parsing to immediate mode. Immediate mode stops parsing the object when the first
   * error is encountered.
   */
  immediate(): PawObject<T>;
}

export interface PawLiteral<T extends string | number | boolean>
  extends PawSchema<"literal", T>,
    PawRefinable<PawLiteral<T>>,
    PawMaybeOptional<PawLiteral<T>> {}

export interface PawUnion<T extends Array<PawSchema<any, any>>>
  extends PawSchema<"union", PawInfer<T[number]>>,
    PawRefinable<PawUnion<T>>,
    PawMaybeOptional<PawUnion<T>> {}

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
    if (!result.ok) {
      throw new PawParseError(result.error);
    }
    return result.value;
  }

  safeParse(val: unknown): PawResult<ReturnType<T["parse"]> | null | undefined, PawIssue> {
    if (this.refineFn) {
      val = this.refineFn(val);
    }

    if (val === null || val === undefined) {
      return new PawOk(val);
    }

    return this.parser.safeParse(val);
  }
}

const STR = "str" as const;
class PawStringParser implements PawString {
  public readonly kind = STR;
  private readonly message: string | undefined;
  private reqMessage: string | undefined;
  private refineFn: RefineFn | undefined;

  constructor(message?: string) {
    this.message = message;
  }

  required(message: string): PawString {
    this.reqMessage = message;
    return this;
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
    if (!result.ok) {
      throw new PawParseError(result.error);
    }
    return result.value;
  }

  safeParse(val: unknown): PawResult<string, PawIssue> {
    if (this.refineFn) {
      val = this.refineFn(val);
    }

    if (val === null || val === undefined) {
      const message = this.reqMessage ?? this.message ?? `Expected string but received ${val}`;
      return new PawError(new PawRequiredIssue(message));
    }

    if (typeof val !== "string") {
      const message = this.message ?? `Expected string but received ${typeof val}`;
      return new PawError(new PawStringIssue(message));
    }

    return new PawOk(val);
  }
}

const NUM = "num" as const;
class PawNumberParser implements PawNumber {
  public readonly kind = NUM;
  private readonly message: string | undefined;
  private reqMessage: string | undefined;
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

  required(message: string): PawNumber {
    this.reqMessage = message;
    return this;
  }

  refine<T>(fn: RefineFn<T>): PawNumber {
    this.refineFn = fn;
    return this;
  }

  parse(val: unknown): number {
    const result = this.safeParse(val);
    if (!result.ok) {
      throw new PawParseError(result.error);
    }
    return result.value;
  }

  safeParse(val: unknown): PawResult<number, PawIssue> {
    if (this.refineFn) {
      val = this.refineFn(val);
    }

    if (val === null || val === undefined) {
      const message = this.reqMessage ?? this.message ?? `Expected a number but received ${val}`;
      return new PawError(new PawRequiredIssue(message));
    }

    if (typeof val !== "number") {
      const message = this.message ?? `Expected a number but received ${typeof val}`;
      return new PawError(new PawNumberIssue(message));
    }

    if (this.intcfg.value && !Number.isInteger(val)) {
      const message = this.intcfg.message ?? "Expected number to be a valid integer";
      return new PawError(new PawNumberIssue(message));
    }

    if (this.mincfg && val < this.mincfg.value) {
      const message =
        this.mincfg.message ?? `Expected number to be less than or equal to ${this.mincfg.value}`;
      return new PawError(new PawNumberIssue(message));
    }

    if (this.maxcfg && val > this.maxcfg.value) {
      const message =
        this.maxcfg.message ?? `Expected number to be bigger than or equal to ${this.maxcfg.value}`;
      return new PawError(new PawNumberIssue(message));
    }

    return new PawOk(val);
  }
}

const BOOL = "bool" as const;
class PawBooleanParser implements PawBoolean {
  public readonly kind = BOOL;
  private readonly message: string | undefined;
  private reqMessage: string | undefined;
  private refineFn: RefineFn | undefined;

  constructor(message?: string) {
    this.message = message;
  }

  optional(): PawOptional<PawBoolean> {
    return new PawOptionalParser(this);
  }

  required(message: string): PawBoolean {
    this.reqMessage = message;
    return this;
  }

  refine<T>(fn: RefineFn<T>): PawBoolean {
    this.refineFn = fn;
    return this;
  }

  parse(val: unknown): boolean {
    const result = this.safeParse(val);
    if (!result.ok) {
      throw new PawParseError(result.error);
    }
    return result.value;
  }

  safeParse(val: unknown): PawResult<boolean, PawIssue> {
    if (this.refineFn) {
      val = this.refineFn(val);
    }

    if (val === null || val === undefined) {
      const message = this.reqMessage ?? this.message ?? `Expected boolean but received ${val}`;
      return new PawError(new PawRequiredIssue(message));
    }

    if (typeof val !== "boolean") {
      const message = this.message ?? "Value is not a boolean";
      return new PawError(new PawBooleanIssue(message));
    }

    return new PawOk(val);
  }
}

const UNKNOWN = "unknown" as const;
class PawUnknownParser implements PawUnknown {
  public readonly kind = UNKNOWN;

  parse(val: unknown): unknown {
    return val;
  }

  safeParse(val: unknown): PawResult<unknown, PawIssue> {
    return new PawOk(val);
  }
}

const ARRAY = "array" as const;
class PawArrayParser<T extends PawType> implements PawArray<T> {
  public readonly kind = ARRAY;
  private readonly unit: T;
  private readonly message: string | undefined;
  private isImmediate: boolean;
  private reqMessage: string | undefined;
  private maxcfg: { value: number; message?: string } | undefined;
  private mincfg: { value: number; message?: string } | undefined;
  private refineFn: RefineFn | undefined;

  constructor(unit: T, message?: string) {
    this.unit = unit;
    this.message = message;
    this.isImmediate = false;
  }

  immediate(): PawArray<T> {
    this.isImmediate = true;
    return this;
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

  required(message: string): PawArray<T> {
    this.reqMessage = message;
    return this;
  }

  refine<U>(fn: RefineFn<U>): PawArray<T> {
    this.refineFn = fn;
    return this;
  }

  parse(val: unknown): PawInfer<T>[] {
    const result = this.safeParse(val);
    if (!result.ok) {
      throw new PawParseError(result.error);
    }
    return result.value;
  }

  safeParse(val: unknown): PawResult<PawInfer<T>[], PawIssue> {
    if (this.isImmediate) {
      return this.safeParseImmediate(val);
    } else {
      return this.safeParseRetained(val);
    }
  }

  private safeParseImmediate(val: unknown): PawResult<PawInfer<T>[], PawIssue> {
    if (this.refineFn) {
      val = this.refineFn(val);
    }

    const parsed = this.parseArray(val);
    if (!parsed.ok) {
      return parsed;
    }

    const arr = parsed.value;
    for (let i = 0; i < arr.length; i++) {
      const v = arr[i];
      const parsed = this.unit.safeParse(v);
      if (!parsed.ok) {
        const issue: PawArrayIndexIssue = { idx: i, issue: parsed.error };
        const message = this.message ?? `Item at ${i} failed schema validation`;
        return new PawError(new PawArraySchemaIssue(message, [issue]));
      }
    }

    return new PawOk(arr);
  }

  private safeParseRetained(val: unknown): PawResult<PawInfer<T>[], PawIssue> {
    if (this.refineFn) {
      val = this.refineFn(val);
    }

    const parsed = this.parseArray(val);
    if (!parsed.ok) {
      return parsed;
    }

    const arr = parsed.value;
    const issues: PawArrayIndexIssue[] = [];
    for (let i = 0; i < arr.length; i++) {
      const v = arr[i];
      const parsed = this.unit.safeParse(v);
      if (!parsed.ok) {
        const issue: PawArrayIndexIssue = { idx: i, issue: parsed.error };
        issues.push(issue);
      }
    }

    if (issues.length > 0) {
      const message = this.message ?? "Array failed schema validation";
      return new PawError(new PawArraySchemaIssue(message, issues));
    }

    return new PawOk(arr);
  }

  private parseArray(val: unknown): PawResult<any[], PawIssue> {
    if (val === null || val === undefined) {
      const message = this.reqMessage ?? this.message ?? `Expected array but received ${val}`;
      return new PawError(new PawRequiredIssue(message));
    }

    if (!Array.isArray(val)) {
      const message = this.message ?? `Expected array but received ${typeof val}`;
      return new PawError(new PawArrayTypeIssue(message));
    }

    if (this.maxcfg != null && val.length > this.maxcfg.value) {
      const message =
        this.maxcfg.message ?? `Array cannot have more than ${this.maxcfg.value} items`;
      return new PawError(new PawArrayTypeIssue(message));
    }

    if (this.mincfg != null && val.length < this.mincfg.value) {
      const message =
        this.mincfg.message ?? `Array cannot have less than ${this.mincfg.value} items`;
      return new PawError(new PawArrayTypeIssue(message));
    }

    return new PawOk(val);
  }
}

const OBJ = "obj" as const;
class PawObjectParser<T extends Record<string, PawType>> implements PawObject<T> {
  public readonly kind = OBJ;
  private readonly fields: T;
  private readonly message: string | undefined;
  private isImmediate: boolean;
  private reqMessage: string | undefined;
  private refineFn: RefineFn | undefined;

  constructor(fields: T, message?: string) {
    this.fields = fields;
    this.message = message;
    this.isImmediate = false;
  }

  optional(): PawOptional<PawObject<T>> {
    return new PawOptionalParser(this);
  }

  required(message: string): PawObject<T> {
    this.reqMessage = message;
    return this;
  }

  immediate(): PawObject<T> {
    this.isImmediate = true;
    return this;
  }

  refine<U>(fn: RefineFn<U>): PawObject<T> {
    this.refineFn = fn;
    return this;
  }

  parse(val: unknown): PawParsedObject<T> {
    const result = this.safeParse(val);
    if (!result.ok) {
      throw new PawParseError(result.error);
    }
    return result.value;
  }

  safeParse(val: unknown): PawResult<PawParsedObject<T>, PawIssue> {
    if (this.isImmediate) {
      return this.safeParseImmediate(val);
    } else {
      return this.safeParseRetained(val);
    }
  }

  private safeParseImmediate(val: unknown): PawResult<PawParsedObject<T>, PawIssue> {
    if (this.refineFn) {
      val = this.refineFn(val);
    }

    const parsed = this.parseObject(val);
    if (!parsed.ok) {
      return parsed;
    }

    const obj = parsed.value;
    for (const k in this.fields) {
      const v = obj[k];
      const parsed = this.fields[k]!.safeParse(v);
      if (!parsed.ok) {
        const message = this.message ?? `Field '${k}' failed object schema validation`;
        const issue: PawObjectFieldIssue = { field: k, issue: parsed.error };
        return new PawError(new PawObjectSchemaIssue(message, [issue]));
      }
    }

    return new PawOk(obj as PawParsedObject<T>);
  }

  private safeParseRetained(val: unknown): PawResult<PawParsedObject<T>, PawIssue> {
    if (this.refineFn) {
      val = this.refineFn(val);
    }

    const parsed = this.parseObject(val);
    if (!parsed.ok) {
      return parsed;
    }

    const obj = parsed.value;
    const issues: PawObjectFieldIssue[] = [];
    for (const k in this.fields) {
      const v = obj[k];
      const parsed = this.fields[k]!.safeParse(v);
      if (!parsed.ok) {
        issues.push({ field: k, issue: parsed.error });
      }
    }

    if (issues.length > 0) {
      const message = this.message ?? "Object failed schema validation";
      return new PawError(new PawObjectSchemaIssue(message, issues));
    }

    return new PawOk(obj as PawParsedObject<T>);
  }

  private parseObject(val: unknown): PawResult<Record<string, unknown>, PawIssue> {
    if (val === null || val === undefined) {
      const message = this.reqMessage ?? this.message ?? `Expected object but received ${val}`;
      return new PawError(new PawRequiredIssue(message));
    }

    if (typeof val !== "object") {
      const message = this.message ?? `Expected object but received ${typeof val}`;
      return new PawError(new PawObjectTypeIssue(message));
    }

    return new PawOk(val as Record<string, unknown>);
  }
}

const LITERAL = "literal" as const;
class PawLiteralParser<const T extends string | number | boolean> implements PawLiteral<T> {
  public readonly kind = LITERAL;
  private readonly values: T[];
  private readonly message: string | undefined;
  private reqMessage: string | undefined;
  private refineFn: RefineFn | undefined;

  constructor(values: T[], message?: string) {
    this.values = values;
    this.message = message;
  }

  optional(): PawOptional<PawLiteral<T>> {
    return new PawOptionalParser(this);
  }

  required(message: string): PawLiteral<T> {
    this.reqMessage = message;
    return this;
  }

  refine<U>(fn: RefineFn<U>): PawLiteral<T> {
    this.refineFn = fn;
    return this;
  }

  parse(val: unknown): T {
    const result = this.safeParse(val);
    if (!result.ok) {
      throw new PawParseError(result.error);
    }
    return result.value;
  }

  safeParse(val: unknown): PawResult<T, PawIssue> {
    if (this.refineFn) {
      val = this.refineFn(val);
    }

    if (val === null || val === undefined) {
      const message = this.reqMessage ?? `Expected literal but received ${val}`;
      return new PawError(new PawRequiredIssue(message));
    }

    const idx = this.values.indexOf(val as T);
    if (idx < 0) {
      const options = this.values.join(", ");
      const message = this.message ?? `Expected one of the following values: ${options}`;
      return new PawError(new PawLiteralIssue(message));
    }

    return new PawOk(val as T);
  }
}

const UNION = "union" as const;
class PawUnionParser<T extends Array<PawSchema<any, any>>> implements PawUnion<T> {
  public readonly kind = UNION;
  private readonly schemas: T;
  private readonly message: string | undefined;
  private reqMessage: string | undefined;
  private refineFn: RefineFn | undefined;

  constructor(schemas: T, message?: string) {
    this.schemas = schemas;
    this.message = message;
  }

  optional(): PawOptional<PawUnion<T>> {
    return new PawOptionalParser(this);
  }

  required(message: string): PawUnion<T> {
    this.reqMessage = message;
    return this;
  }

  refine<U>(fn: RefineFn<U>): PawUnion<T> {
    this.refineFn = fn;
    return this;
  }

  parse(val: unknown): PawInfer<T[number]> {
    const result = this.safeParse(val);
    if (!result.ok) {
      throw new PawParseError(result.error);
    }
    return result.value;
  }

  safeParse(val: unknown): PawResult<PawInfer<T[number]>, PawIssue> {
    if (this.refineFn) {
      val = this.refineFn(val);
    }

    for (const schema of this.schemas) {
      const parsed = schema.safeParse(val);
      if (parsed.ok) {
        return parsed;
      }
    }

    if (val === null || val === undefined) {
      const message = this.reqMessage ?? `Expected union but received ${val}`;
      return new PawError(new PawRequiredIssue(message));
    }

    // [TODO] improve error message
    const message = this.message ?? "Value does not match any of the union variants";
    return new PawError(new PawUnionIssue(message));
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

export function literal<const T extends string | number | boolean>(
  values: T[],
  message?: string,
): PawLiteral<T> {
  return new PawLiteralParser(values, message);
}

export function union<T extends Array<PawSchema<any, any>>>(
  schemas: T,
  message?: string,
): PawUnion<T> {
  return new PawUnionParser(schemas, message);
}
