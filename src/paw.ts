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
  | PawAny
  | PawArray<PawType>
  | PawObject<Record<string, PawType>>
  | PawOptional<any>
  | PawLiteral<string>
  | PawUnion<Array<PawType>>
  | PawTransform<any>;

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
  /**
   * Parse `val` into a `PawResult<T, PawIssue>`, returning a `PawError<PawIssue>` when the parse
   * fails and `PawOk<T>` when succeeds.
   */
  safeParse(val: unknown): PawResult<T, PawIssue>;
}

export interface PawSchema<N extends string, T> extends PawParser<T> {
  readonly kind: N;
}

export interface PawRefinable<S extends PawParser<any>> {
  /** Transform the value before validation */
  refine<T>(fn: RefineFn<T>): S;
}

export type PawCheckFn<T> = (val: T) => boolean;

class PawCheck<T> {
  public readonly fn: PawCheckFn<T>;
  public readonly message?: string;

  constructor(fn: PawCheckFn<T>, message?: string) {
    this.fn = fn;
    this.message = message;
  }
}

// TODO: maybe should allow configuring checks to run in immediate mode or retained mode
// also, maybe `check` should have it's own issue type
export interface PawCheckable<S, T> {
  /**
   * Add a custom check constraint. Checks runs after the parsing and are usually meant to validate
   * rules that the typesystem does not support.
   */
  check(fn: PawCheckFn<T>, message?: string): S;
}

export type PawTransformFn<T, U> = (val: T) => U;

interface PawTransformable<T> {
  /**
   * Transform the parsed value into another value. Transform function runs after parsing
   * and check constraints
   */
  transform<U>(fn: PawTransformFn<T, U>): PawTransform<U>;
}

export interface PawTransform<T> extends PawSchema<"trans", T>, PawTransformable<T> {}

export interface PawOptional<S extends PawSchema<string, any>>
  extends PawSchema<"opt", ReturnType<S["parse"]> | null | undefined> {}

export interface PawMaybeOptional<S extends PawSchema<string, any>> {
  /** Allow value to be `null` or `undefined` */
  optional(): PawOptional<S>;
  /** Set the required error message. Does NOT change any validations or type schema. */
  required(message: string): S;
}

export interface PawString
  extends PawSchema<"str", string>,
    PawRefinable<PawString>,
    PawMaybeOptional<PawString>,
    PawCheckable<PawString, string>,
    PawTransformable<string> {}

export interface PawNumber
  extends PawSchema<"num", number>,
    PawRefinable<PawNumber>,
    PawMaybeOptional<PawNumber>,
    PawCheckable<PawNumber, number>,
    PawTransformable<number> {
  int(message?: string): PawNumber;
  min(val: number, message?: string): PawNumber;
  max(val: number, message?: string): PawNumber;
}

export interface PawBoolean
  extends PawSchema<"bool", boolean>,
    PawRefinable<PawBoolean>,
    PawMaybeOptional<PawBoolean>,
    PawCheckable<PawBoolean, boolean>,
    PawTransformable<boolean> {}

export interface PawUnknown
  extends PawSchema<"unknown", unknown>,
    PawRefinable<PawUnknown>,
    PawCheckable<PawUnknown, unknown>,
    PawTransformable<unknown> {}

export interface PawAny
  extends PawSchema<"any", any>,
    PawRefinable<PawAny>,
    PawCheckable<PawAny, any>,
    PawTransformable<any> {}

export interface PawArray<T extends PawType>
  extends PawSchema<"array", PawInfer<T>[]>,
    PawRefinable<PawArray<T>>,
    PawMaybeOptional<PawArray<T>>,
    PawCheckable<PawArray<T>, PawInfer<T>[]>,
    PawTransformable<PawInfer<T>[]> {
  /**
   * Set array parsing to immediate mode. Immediate mode stops parsing the object when the first
   * error is encountered.
   */
  immediate(): PawArray<T>;
  min(size: number, message?: string): PawArray<T>;
  max(size: number, message?: string): PawArray<T>;
}

export interface PawObject<T extends Record<string, PawType>>
  extends PawSchema<"obj", PawParsedObject<T>>,
    PawRefinable<PawObject<T>>,
    PawMaybeOptional<PawObject<T>>,
    PawCheckable<PawObject<T>, PawParsedObject<T>>,
    PawTransformable<T> {
  /**
   * Set object parsing to immediate mode. Immediate mode stops parsing the object when the first
   * error is encountered.
   */
  immediate(): PawObject<T>;
}

export interface PawLiteral<T extends string | number | boolean>
  extends PawSchema<"literal", T>,
    PawRefinable<PawLiteral<T>>,
    PawMaybeOptional<PawLiteral<T>>,
    PawCheckable<PawLiteral<T>, T>,
    PawTransformable<T> {}

export interface PawUnion<T extends Array<PawSchema<any, any>>>
  extends PawSchema<"union", PawInfer<T[number]>>,
    PawRefinable<PawUnion<T>>,
    PawMaybeOptional<PawUnion<T>>,
    PawCheckable<PawUnion<T>, PawInfer<T[number]>>,
    PawTransformable<PawInfer<T[number]>> {}

const TRANS = "trans";
class PawTransformParser<T, S extends PawSchema<string, any>> implements PawTransform<T> {
  public readonly kind = TRANS;
  private readonly fn: PawTransformFn<ReturnType<S["parse"]>, T>;
  private readonly schema: S;

  constructor(fn: PawTransformFn<ReturnType<S["parse"]>, T>, schema: S) {
    this.fn = fn;
    this.schema = schema;
  }

  transform<U>(fn: PawTransformFn<T, U>): PawTransform<U> {
    return new PawTransformParser(fn, this);
  }

  parse(val: unknown): T {
    const parsed = this.schema.safeParse(val);
    if (!parsed.ok) {
      throw new PawParseError(parsed.error);
    }
    return parsed.value;
  }

  safeParse(val: unknown): PawResult<T, PawIssue> {
    const parsed = this.schema.safeParse(val);
    if (!parsed.ok) {
      return parsed;
    }

    return new PawOk(this.fn(parsed.value));
  }
}

const OPT = "opt" as const;
export class PawOptionalParser<T extends PawSchema<string, any>> implements PawOptional<T> {
  public readonly kind = OPT;
  private readonly parser: T;
  private refines: RefineFn[];

  constructor(parser: T) {
    this.parser = parser;
    this.refines = [];
  }

  refine<U>(fn: RefineFn<U>): PawOptional<T> {
    this.refines.push(fn);
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
    for (const fn of this.refines) {
      val = fn(val);
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
  private refines: RefineFn[];
  private checks: PawCheck<string>[];

  constructor(message?: string) {
    this.message = message;
    this.checks = [];
    this.refines = [];
  }

  check(fn: PawCheckFn<string>, message?: string): PawString {
    this.checks.push(new PawCheck(fn, message));
    return this;
  }

  required(message: string): PawString {
    this.reqMessage = message;
    return this;
  }

  optional(): PawOptional<PawString> {
    return new PawOptionalParser(this);
  }

  refine<T>(fn: RefineFn<T>): PawString {
    this.refines.push(fn);
    return this;
  }

  transform<U>(fn: PawTransformFn<string, U>): PawTransform<U> {
    return new PawTransformParser(fn, this);
  }

  parse(val: unknown): string {
    const result = this.safeParse(val);
    if (!result.ok) {
      throw new PawParseError(result.error);
    }
    return result.value;
  }

  safeParse(val: unknown): PawResult<string, PawIssue> {
    for (const fn of this.refines) {
      val = fn(val);
    }

    if (val === null || val === undefined) {
      const message = this.reqMessage ?? this.message ?? `Expected string but received ${val}`;
      return new PawError(new PawRequiredIssue(message));
    }

    if (typeof val !== "string") {
      const message = this.message ?? `Expected string but received ${typeof val}`;
      return new PawError(new PawStringIssue(message));
    }

    for (const ch of this.checks) {
      const valid = ch.fn(val);
      if (!valid) {
        const message = ch.message ?? "Valid string but failed check constraint";
        return new PawError(new PawStringIssue(message));
      }
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
  private refines: RefineFn[];
  private checks: PawCheck<number>[];

  constructor(message?: string) {
    this.message = message;
    this.checks = [];
    this.refines = [];
  }

  check(fn: PawCheckFn<number>, message?: string): PawNumber {
    this.checks.push(new PawCheck(fn, message));
    return this;
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
    this.refines.push(fn);
    return this;
  }

  transform<U>(fn: PawTransformFn<number, U>): PawTransform<U> {
    return new PawTransformParser(fn, this);
  }

  parse(val: unknown): number {
    const result = this.safeParse(val);
    if (!result.ok) {
      throw new PawParseError(result.error);
    }
    return result.value;
  }

  safeParse(val: unknown): PawResult<number, PawIssue> {
    for (const fn of this.refines) {
      val = fn(val);
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

    for (const ch of this.checks) {
      const valid = ch.fn(val);
      if (!valid) {
        const message = ch.message ?? "Valid number but failed check constraint";
        return new PawError(new PawNumberIssue(message));
      }
    }

    return new PawOk(val);
  }
}

const BOOL = "bool" as const;
class PawBooleanParser implements PawBoolean {
  public readonly kind = BOOL;
  private readonly message: string | undefined;
  private reqMessage: string | undefined;
  private refines: RefineFn[];
  private checks: PawCheck<boolean>[];

  constructor(message?: string) {
    this.message = message;
    this.checks = [];
    this.refines = [];
  }

  check(fn: PawCheckFn<boolean>, message?: string): PawBoolean {
    this.checks.push(new PawCheck(fn, message));
    return this;
  }

  optional(): PawOptional<PawBoolean> {
    return new PawOptionalParser(this);
  }

  required(message: string): PawBoolean {
    this.reqMessage = message;
    return this;
  }

  refine<T>(fn: RefineFn<T>): PawBoolean {
    this.refines.push(fn);
    return this;
  }

  transform<U>(fn: PawTransformFn<boolean, U>): PawTransform<U> {
    return new PawTransformParser(fn, this);
  }

  parse(val: unknown): boolean {
    const result = this.safeParse(val);
    if (!result.ok) {
      throw new PawParseError(result.error);
    }
    return result.value;
  }

  safeParse(val: unknown): PawResult<boolean, PawIssue> {
    for (const fn of this.refines) {
      val = fn(val);
    }

    if (val === null || val === undefined) {
      const message = this.reqMessage ?? this.message ?? `Expected boolean but received ${val}`;
      return new PawError(new PawRequiredIssue(message));
    }

    if (typeof val !== "boolean") {
      const message = this.message ?? "Value is not a boolean";
      return new PawError(new PawBooleanIssue(message));
    }

    for (const ch of this.checks) {
      const valid = ch.fn(val);
      if (!valid) {
        const message = ch.message ?? "Valid boolean but failed check constraint";
        return new PawError(new PawBooleanIssue(message));
      }
    }

    return new PawOk(val);
  }
}

const UNKNOWN = "unknown" as const;
class PawUnknownParser implements PawUnknown {
  public readonly kind = UNKNOWN;
  private refines: RefineFn[];
  private checks: PawCheck<unknown>[];

  constructor() {
    this.refines = [];
    this.checks = [];
  }

  check(fn: PawCheckFn<any>, message?: string): PawUnknown {
    this.checks.push(new PawCheck(fn, message));
    return this;
  }

  refine<T>(fn: RefineFn<T>): PawUnknown {
    this.refines.push(fn);
    return this;
  }

  transform<U>(fn: PawTransformFn<any, U>): PawTransform<U> {
    return new PawTransformParser(fn, this);
  }

  parse(val: unknown): unknown {
    const result = this.safeParse(val);
    if (!result.ok) {
      throw new PawParseError(result.error);
    }
    return result.value;
  }

  safeParse(val: unknown): PawResult<unknown, PawIssue> {
    for (const fn of this.refines) {
      val = fn(val);
    }
    return new PawOk(val);
  }
}

const ANY = "any" as const;
export class PawAnyParser implements PawAny {
  public readonly kind = ANY;
  private refines: RefineFn[];
  private checks: PawCheck<any>[];

  constructor() {
    this.refines = [];
    this.checks = [];
  }

  check(fn: PawCheckFn<any>, message?: string): PawAny {
    this.checks.push(new PawCheck(fn, message));
    return this;
  }

  refine<T>(fn: RefineFn<T>): PawAny {
    this.refines.push(fn);
    return this;
  }

  transform<U>(fn: PawTransformFn<any, U>): PawTransform<U> {
    return new PawTransformParser(fn, this);
  }

  parse(val: unknown): any {
    const result = this.safeParse(val);
    if (!result.ok) {
      throw new PawParseError(result.error);
    }
    return result.value;
  }

  safeParse(val: unknown): PawResult<any, PawIssue> {
    for (const fn of this.refines) {
      val = fn(val);
    }
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
  private refines: RefineFn[];
  private checks: PawCheck<PawInfer<T>[]>[];

  constructor(unit: T, message?: string) {
    this.unit = unit;
    this.message = message;
    this.isImmediate = false;
    this.checks = [];
    this.refines = [];
  }

  immediate(): PawArray<T> {
    this.isImmediate = true;
    return this;
  }

  check(fn: PawCheckFn<PawInfer<T>[]>, message?: string): PawArray<T> {
    this.checks.push(new PawCheck(fn, message));
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
    this.refines.push(fn);
    return this;
  }

  transform<U>(fn: PawTransformFn<PawInfer<T>[], U>): PawTransform<U> {
    return new PawTransformParser(fn, this);
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
    for (const fn of this.refines) {
      val = fn(val);
    }

    const arr = this.parseArray(val);
    if (!arr.ok) {
      return arr;
    }

    for (let i = 0; i < arr.value.length; i++) {
      const v = arr.value[i];
      const parsed = this.unit.safeParse(v);
      if (!parsed.ok) {
        const issue: PawArrayIndexIssue = { idx: i, issue: parsed.error };
        const message = this.message ?? `Item at ${i} failed schema validation`;
        return new PawError(new PawArraySchemaIssue(message, [issue]));
      }
    }

    const parsed = arr.value as PawInfer<T>[];
    const checkResult = this.runChecks(parsed);
    if (!checkResult.ok) {
      return checkResult;
    }

    return new PawOk(parsed);
  }

  private safeParseRetained(val: unknown): PawResult<PawInfer<T>[], PawIssue> {
    for (const fn of this.refines) {
      val = fn(val);
    }

    const arr = this.parseArray(val);
    if (!arr.ok) {
      return arr;
    }

    const issues: PawArrayIndexIssue[] = [];
    for (let i = 0; i < arr.value.length; i++) {
      const v = arr.value[i];
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

    const parsed = arr.value as PawInfer<T>[];
    const checkResult = this.runChecks(parsed);
    if (!checkResult.ok) {
      return checkResult;
    }

    return new PawOk(parsed);
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

  private runChecks(val: PawInfer<T>[]): PawResult<void, PawIssue> {
    for (const ch of this.checks) {
      const valid = ch.fn(val);
      if (!valid) {
        const message = ch.message ?? "Valid array but failed check constraint";
        return new PawError(new PawArrayTypeIssue(message));
      }
    }
    return new PawOk(undefined);
  }
}

const OBJ = "obj" as const;
class PawObjectParser<T extends Record<string, PawType>> implements PawObject<T> {
  public readonly kind = OBJ;
  private readonly fields: T;
  private readonly message: string | undefined;
  private isImmediate: boolean;
  private reqMessage: string | undefined;
  private refines: RefineFn[];
  private checks: PawCheck<PawParsedObject<T>>[];

  constructor(fields: T, message?: string) {
    this.fields = fields;
    this.message = message;
    this.isImmediate = false;
    this.refines = [];
    this.checks = [];
  }

  optional(): PawOptional<PawObject<T>> {
    return new PawOptionalParser(this);
  }

  check(fn: PawCheckFn<PawParsedObject<T>>, message?: string): PawObject<T> {
    this.checks.push(new PawCheck(fn, message));
    return this;
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
    this.refines.push(fn);
    return this;
  }

  transform<U>(fn: PawTransformFn<T, U>): PawTransform<U> {
    return new PawTransformParser(fn, this);
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
    for (const fn of this.refines) {
      val = fn(val);
    }

    const obj = this.parseObject(val);
    if (!obj.ok) {
      return obj;
    }

    for (const k in this.fields) {
      const v = obj.value[k];
      const parsed = this.fields[k]!.safeParse(v);
      if (!parsed.ok) {
        const message = this.message ?? `Field '${k}' failed object schema validation`;
        const issue: PawObjectFieldIssue = { field: k, issue: parsed.error };
        return new PawError(new PawObjectSchemaIssue(message, [issue]));
      }
    }

    const parsed = obj.value as PawParsedObject<T>;
    const checkResult = this.runChecks(parsed);
    if (!checkResult.ok) {
      return checkResult;
    }

    return new PawOk(parsed);
  }

  private safeParseRetained(val: unknown): PawResult<PawParsedObject<T>, PawIssue> {
    for (const fn of this.refines) {
      val = fn(val);
    }

    const obj = this.parseObject(val);
    if (!obj.ok) {
      return obj;
    }

    const issues: PawObjectFieldIssue[] = [];
    for (const k in this.fields) {
      const v = obj.value[k];
      const parsed = this.fields[k]!.safeParse(v);
      if (!parsed.ok) {
        issues.push({ field: k, issue: parsed.error });
      }
    }

    if (issues.length > 0) {
      const message = this.message ?? "Object failed schema validation";
      return new PawError(new PawObjectSchemaIssue(message, issues));
    }

    const parsed = obj.value as PawParsedObject<T>;
    const checkResult = this.runChecks(parsed);
    if (!checkResult.ok) {
      return checkResult;
    }

    return new PawOk(parsed);
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

  private runChecks(val: PawParsedObject<T>): PawResult<void, PawIssue> {
    for (const ch of this.checks) {
      const valid = ch.fn(val);
      if (!valid) {
        const message = ch.message ?? "Valid object but failed check constraint";
        return new PawError(new PawObjectTypeIssue(message));
      }
    }
    return new PawOk(undefined);
  }
}

const LITERAL = "literal" as const;
class PawLiteralParser<const T extends string | number | boolean> implements PawLiteral<T> {
  public readonly kind = LITERAL;
  private readonly values: T[];
  private readonly message: string | undefined;
  private reqMessage: string | undefined;
  private refines: RefineFn[];
  private checks: PawCheck<T>[];

  constructor(values: T[], message?: string) {
    this.values = values;
    this.message = message;
    this.refines = [];
    this.checks = [];
  }

  optional(): PawOptional<PawLiteral<T>> {
    return new PawOptionalParser(this);
  }

  check(fn: PawCheckFn<T>, message?: string): PawLiteral<T> {
    this.checks.push(new PawCheck(fn, message));
    return this;
  }

  required(message: string): PawLiteral<T> {
    this.reqMessage = message;
    return this;
  }

  refine<U>(fn: RefineFn<U>): PawLiteral<T> {
    this.refines.push(fn);
    return this;
  }

  transform<U>(fn: PawTransformFn<T, U>): PawTransform<U> {
    return new PawTransformParser(fn, this);
  }

  parse(val: unknown): T {
    const result = this.safeParse(val);
    if (!result.ok) {
      throw new PawParseError(result.error);
    }
    return result.value;
  }

  safeParse(val: unknown): PawResult<T, PawIssue> {
    for (const fn of this.refines) {
      val = fn(val);
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

    for (const ch of this.checks) {
      const valid = ch.fn(val as T);
      if (!valid) {
        const message = ch.message ?? "Valid literal but failed check constraint";
        return new PawError(new PawLiteralIssue(message));
      }
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
  private refines: RefineFn[];
  private checks: PawCheck<PawInfer<T[number]>>[];

  constructor(schemas: T, message?: string) {
    this.schemas = schemas;
    this.message = message;
    this.refines = [];
    this.checks = [];
  }

  optional(): PawOptional<PawUnion<T>> {
    return new PawOptionalParser(this);
  }

  check(fn: PawCheckFn<PawInfer<T[number]>>, message?: string): PawUnion<T> {
    this.checks.push(new PawCheck(fn, message));
    return this;
  }

  required(message: string): PawUnion<T> {
    this.reqMessage = message;
    return this;
  }

  refine<U>(fn: RefineFn<U>): PawUnion<T> {
    this.refines.push(fn);
    return this;
  }

  transform<U>(fn: PawTransformFn<PawInfer<T[number]>, U>): PawTransform<U> {
    return new PawTransformParser(fn as any, this);
  }

  parse(val: unknown): PawInfer<T[number]> {
    const result = this.safeParse(val);
    if (!result.ok) {
      throw new PawParseError(result.error);
    }
    return result.value;
  }

  safeParse(val: unknown): PawResult<PawInfer<T[number]>, PawIssue> {
    for (const fn of this.refines) {
      val = fn(val);
    }

    for (const schema of this.schemas) {
      const parsed = schema.safeParse(val);
      if (parsed.ok) {
        for (const ch of this.checks) {
          const valid = ch.fn(parsed.value);
          if (!valid) {
            const message = ch.message ?? "Valid union but failed check constraint";
            return new PawError(new PawUnionIssue(message));
          }
        }
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

export function any(): PawAny {
  return new PawAnyParser();
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
