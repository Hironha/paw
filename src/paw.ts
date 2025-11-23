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
  type PawIssuePath,
  PawCheckIssue,
  PawRefineIssue,
  PawTransformIssue,
} from "./issue";
import type { StandardSchemaV1 } from "./standard-schema";
import type { MergeRecord, Pretty } from "./types";

export type PawType =
  | PawString
  | PawNumber
  | PawBoolean
  | PawUnknown
  | PawAny
  | PawArray<PawType>
  | PawObject<Record<string, PawType>>
  | PawOptional<any>
  | PawNullable<any>
  | PawLiteral<string>
  | PawUnion<Array<PawType>>
  | PawTransform<any>;

export type PawInfer<T extends PawType> = T extends PawSchema<string, infer U> ? U : "invalid-type";

type PawParsedObject<T extends Record<string, PawType>> = {
  [K in keyof T]: PawInfer<T[K]>;
} & {};

export class PawRefineContext {
  readonly input: unknown;
  readonly src: PawType["kind"];

  constructor(input: unknown, src: PawType["kind"]) {
    this.input = input;
    this.src = src;
  }

  ok<T>(output: T): PawOk<T> {
    return new PawOk(output);
  }

  error(message: string, path?: PawIssuePath): PawError<PawRefineIssue> {
    const issue = new PawRefineIssue(message, this.src, path);
    return new PawError(issue);
  }
}

export type PawRefineFn<O = any> = (ctx: PawRefineContext) => PawResult<O, PawRefineIssue>;

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

export interface PawSchema<N extends string, T> extends PawParser<T>, StandardSchemaV1<unknown, T> {
  readonly kind: N;
}

export interface PawRefinable<S extends PawParser<any>> {
  /** Transform the value before validation */
  refine<T>(fn: PawRefineFn<T>): S;
}

export class PawCheckContext<O> {
  public readonly input: unknown;
  public readonly output: O;
  public readonly src: PawType["kind"];

  constructor(input: unknown, output: O, src: PawType["kind"]) {
    this.input = input;
    this.output = output;
    this.src = src;
  }

  ok(): PawOk<void> {
    return PawOk.empty();
  }

  error(message: string, path?: PawIssuePath): PawError<PawCheckIssue> {
    const issue = new PawCheckIssue(message, this.src, path);
    return new PawError(issue);
  }
}

export type PawCheckFn<T> = (ctx: PawCheckContext<T>) => PawResult<void, PawCheckIssue>;

const PAW_VENDOR = "paw" as const;

class PawStandardSchemaProps<S extends PawSchema<any, any>>
  implements StandardSchemaV1.Props<unknown, PawInfer<S>>
{
  public readonly version: 1;
  public readonly vendor: string;
  public readonly validate: (value: unknown) => StandardSchemaV1.Result<PawInfer<S>>;

  constructor(schema: S) {
    this.version = 1;
    this.vendor = PAW_VENDOR;
    this.validate = (value) => {
      const result = schema.safeParse(value);
      if (result.ok) {
        return { value: result.value };
      }
      return { issues: [result.error] };
    };
  }
}

// TODO: maybe should allow configuring checks to run in immediate mode or retained mode
// also, maybe `check` should have it's own issue type
export interface PawCheckable<S, T> {
  /**
   * Add a custom check constraint. Checks runs after the parsing and are usually meant to validate
   * rules that the typesystem does not support.
   */
  check(fn: PawCheckFn<T>): S;
}

export class PawTransformContext<I> {
  public readonly output: I;
  public readonly src: PawType["kind"];

  constructor(output: I, src: PawType["kind"]) {
    this.output = output;
    this.src = src;
  }

  ok<O>(out: O): PawOk<O> {
    return new PawOk(out);
  }

  error(message: string, path?: PawIssuePath): PawError<PawTransformIssue> {
    const issue = new PawTransformIssue(message, this.src, path);
    return new PawError(issue);
  }
}

export type PawTransformFn<I, O> = (ctx: PawTransformContext<I>) => PawResult<O, PawTransformIssue>;

// export type PawTransformFn<T, U> = (val: T) => U;

interface PawTransformable<T> {
  /**
   * Transform the parsed value into another value. Transform function runs after parsing
   * and check constraints
   */
  transform<U>(fn: PawTransformFn<T, U>): PawTransform<U>;
}

// TODO: change transformations to be similar to refinements and checks, where they
// receive a context and are able to return issues.
export interface PawTransform<T> extends PawSchema<"transform", T>, PawTransformable<T> {}

export interface PawOptional<S extends PawSchema<string, any>>
  extends PawSchema<"optional", ReturnType<S["parse"]> | undefined> {}

export interface PawRequireable<S extends PawSchema<string, any>> {
  /** Set the required error message. Does NOT change any validations or type schema. */
  required(message: string): S;
}

export interface PawMaybeOptional<S extends PawSchema<string, any>> {
  /** Allow value to be `undefined` */
  optional(): PawOptional<S>;
}

export interface PawNullable<S extends PawSchema<string, any>>
  extends PawSchema<"nullable", ReturnType<S["parse"]> | null>,
    PawMaybeOptional<PawNullable<S>> {}

export interface PawMaybeNullable<S extends PawSchema<string, any>> {
  /** Allow value to be `null` */
  nullable(): PawNullable<S>;
}

export interface PawString
  extends PawSchema<"string", string>,
    PawRefinable<PawString>,
    PawMaybeOptional<PawString>,
    PawMaybeNullable<PawString>,
    PawCheckable<PawString, string>,
    PawTransformable<string>,
    PawRequireable<PawString> {
  /** Set minimum (inclusive) acceptable length for the string.  */
  min(length: number, message?: string): PawString;
  /** Set maximum (inclusive) acceptable length for the string */
  max(length: number, message?: string): PawString;
}

export interface PawNumber
  extends PawSchema<"number", number>,
    PawRefinable<PawNumber>,
    PawMaybeOptional<PawNumber>,
    PawMaybeNullable<PawNumber>,
    PawCheckable<PawNumber, number>,
    PawTransformable<number>,
    PawRequireable<PawNumber> {
  int(message?: string): PawNumber;
  min(val: number, message?: string): PawNumber;
  max(val: number, message?: string): PawNumber;
}

export interface PawBoolean
  extends PawSchema<"boolean", boolean>,
    PawRefinable<PawBoolean>,
    PawMaybeOptional<PawBoolean>,
    PawMaybeNullable<PawBoolean>,
    PawCheckable<PawBoolean, boolean>,
    PawTransformable<boolean>,
    PawRequireable<PawBoolean> {}

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
    PawMaybeNullable<PawArray<T>>,
    PawCheckable<PawArray<T>, PawInfer<T>[]>,
    PawTransformable<PawInfer<T>[]>,
    PawRequireable<PawArray<T>> {
  /**
   * Set array parsing to immediate mode. Immediate mode stops parsing the object when the first
   * error is encountered.
   */
  immediate(): PawArray<T>;
  min(size: number, message?: string): PawArray<T>;
  max(size: number, message?: string): PawArray<T>;
}

export interface PawObject<T extends Record<string, PawType>>
  extends PawSchema<"object", PawParsedObject<T>>,
    PawRefinable<PawObject<T>>,
    PawMaybeOptional<PawObject<T>>,
    PawMaybeNullable<PawObject<T>>,
    PawCheckable<PawObject<T>, PawParsedObject<T>>,
    PawTransformable<T>,
    PawRequireable<PawObject<T>> {
  /**
   * Set object parsing to immediate mode. Immediate mode stops parsing the object when the first
   * error is encountered.
   */
  immediate(): PawObject<T>;
  /**
   * Set parser to include only defined properties in parsed object.
   */
  strict(): PawObject<T>;
  /**
   * Set the parser to include the `path` in issues.
   */
  pathed(): PawObject<T>;
  /**
   * Creates a new object schema extending from current defined schema. The new schema inherits
   * all configurations, such as `immediate` and `strict`.
   */
  extend<U extends Record<string, PawType>>(
    fields: U,
    message?: string,
  ): PawObject<Pretty<MergeRecord<T, U>>>;
}

export interface PawLiteral<T extends string | number | boolean>
  extends PawSchema<"literal", T>,
    PawRefinable<PawLiteral<T>>,
    PawMaybeOptional<PawLiteral<T>>,
    PawMaybeNullable<PawLiteral<T>>,
    PawCheckable<PawLiteral<T>, T>,
    PawTransformable<T>,
    PawRequireable<PawLiteral<T>> {}

export interface PawUnion<T extends Array<PawSchema<any, any>>>
  extends PawSchema<"union", PawInfer<T[number]>>,
    PawRefinable<PawUnion<T>>,
    PawMaybeOptional<PawUnion<T>>,
    PawMaybeNullable<PawUnion<T>>,
    PawCheckable<PawUnion<T>, PawInfer<T[number]>>,
    PawTransformable<PawInfer<T[number]>>,
    PawRequireable<PawUnion<T>> {}

const TRANSFORM = "transform";
class PawTransformParser<T, S extends PawSchema<PawType["kind"], any>> implements PawTransform<T> {
  public readonly kind = TRANSFORM;
  public readonly "~standard": StandardSchemaV1.Props<unknown, T>;

  private readonly fn: PawTransformFn<ReturnType<S["parse"]>, T>;
  private readonly schema: S;
  private readonly src: PawType["kind"];

  constructor(fn: PawTransformFn<ReturnType<S["parse"]>, T>, schema: S, src?: PawType["kind"]) {
    this.fn = fn;
    this.schema = schema;
    this.src = src ?? this.schema.kind;
    this["~standard"] = new PawStandardSchemaProps(this);
  }

  transform<U>(fn: PawTransformFn<T, U>): PawTransform<U> {
    return new PawTransformParser(fn, this, this.src);
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

    const context = new PawTransformContext(parsed.value, this.src);
    return this.fn(context);
  }
}

const OPTIONAL = "optional" as const;
export class PawOptionalParser<T extends PawSchema<string, any>> implements PawOptional<T> {
  public readonly kind = OPTIONAL;
  public readonly "~standard": StandardSchemaV1.Props<unknown, ReturnType<T["parse"]> | undefined>;
  private readonly parser: T;
  private refines: PawRefineFn[];

  constructor(parser: T) {
    this.parser = parser;
    this.refines = [];
    this["~standard"] = new PawStandardSchemaProps(this);
  }

  refine<U>(fn: PawRefineFn<U>): PawOptional<T> {
    this.refines.push(fn);
    return this;
  }

  parse(val: unknown): ReturnType<T["parse"]> | undefined {
    const result = this.safeParse(val);
    if (!result.ok) {
      throw new PawParseError(result.error);
    }
    return result.value;
  }

  safeParse(input: unknown): PawResult<ReturnType<T["parse"]> | undefined, PawIssue> {
    for (const refinefn of this.refines) {
      const result = refinefn(new PawRefineContext(input, this.kind));
      if (!result.ok) {
        return result;
      }
      input = result.value;
    }

    if (input === undefined) {
      return new PawOk(input);
    }

    return this.parser.safeParse(input);
  }
}

const NULLABLE = "nullable" as const;
export class PawNullableParser<T extends PawSchema<string, any>> implements PawNullable<T> {
  public readonly kind = NULLABLE;
  public readonly "~standard": StandardSchemaV1.Props<unknown, ReturnType<T["parse"]> | null>;

  private readonly parser: T;
  private refines: PawRefineFn[];

  constructor(parser: T) {
    this.parser = parser;
    this.refines = [];
    this["~standard"] = new PawStandardSchemaProps(this);
  }

  optional(): PawOptional<PawNullable<T>> {
    return new PawOptionalParser(this);
  }

  refine<U>(fn: PawRefineFn<U>): PawNullable<T> {
    this.refines.push(fn);
    return this;
  }

  parse(val: unknown): ReturnType<T["parse"]> | null {
    const result = this.safeParse(val);
    if (!result.ok) {
      throw new PawParseError(result.error);
    }
    return result.value;
  }

  safeParse(input: unknown): PawResult<ReturnType<T["parse"]> | null, PawIssue> {
    for (const refinefn of this.refines) {
      const result = refinefn(new PawRefineContext(input, this.kind));
      if (!result.ok) {
        return result;
      }
      input = result.value;
    }

    if (input === null) {
      return new PawOk(input);
    }

    return this.parser.safeParse(input);
  }
}

const STRING = "string" as const;
class PawStringParser implements PawString {
  public readonly kind = STRING;
  public readonly "~standard": StandardSchemaV1.Props<unknown, string>;

  private readonly message: string | undefined;
  private reqmessage: string | undefined;
  private refines: PawRefineFn[];
  private checks: PawCheckFn<string>[];
  private mincfg?: { length: number; message?: string };
  private maxcfg?: { length: number; message?: string };

  constructor(message?: string) {
    this.message = message;
    this.checks = [];
    this.refines = [];
    this["~standard"] = new PawStandardSchemaProps(this);
  }

  min(length: number, message?: string): PawString {
    this.mincfg = { length, message };
    return this;
  }

  max(length: number, message?: string): PawString {
    this.maxcfg = { length, message };
    return this;
  }

  check(fn: PawCheckFn<string>): PawString {
    this.checks.push(fn);
    return this;
  }

  required(message: string): PawString {
    this.reqmessage = message;
    return this;
  }

  optional(): PawOptional<PawString> {
    return new PawOptionalParser(this);
  }

  nullable(): PawNullable<PawString> {
    return new PawNullableParser(this);
  }

  refine<T>(fn: PawRefineFn<T>): PawString {
    this.refines.push(fn);
    return this;
  }

  transform<U>(fn: PawTransformFn<string, U>): PawTransform<U> {
    return new PawTransformParser(fn, this);
  }

  parse(input: unknown): string {
    const result = this.safeParse(input);
    if (!result.ok) {
      throw new PawParseError(result.error);
    }
    return result.value;
  }

  safeParse(input: unknown): PawResult<string, PawIssue> {
    for (const refinefn of this.refines) {
      const result = refinefn(new PawRefineContext(input, this.kind));
      if (!result.ok) {
        return result;
      }
      input = result.value;
    }

    if (input === null || input === undefined) {
      const message = this.reqmessage ?? this.message ?? `Expected string but received ${input}`;
      return new PawError(new PawRequiredIssue(message));
    }

    if (typeof input !== "string") {
      const message = this.message ?? `Expected string but received ${typeof input}`;
      return new PawError(new PawStringIssue(message));
    }

    if (this.mincfg && input.length < this.mincfg.length) {
      const minlength = this.mincfg.length;
      const message = this.mincfg.message ?? `String length cannot be less than ${minlength}`;
      return new PawError(new PawStringIssue(message));
    }

    if (this.maxcfg && input.length > this.maxcfg.length) {
      const maxlength = this.maxcfg.length;
      const message = this.maxcfg.message ?? `String length cannot be more than ${maxlength}`;
      return new PawError(new PawStringIssue(message));
    }

    for (const checkfn of this.checks) {
      const result = checkfn(new PawCheckContext(input, input, this.kind));
      if (!result.ok) {
        return result;
      }
    }

    return new PawOk(input);
  }
}

const NUMBER = "number" as const;
class PawNumberParser implements PawNumber {
  public readonly kind = NUMBER;
  public readonly "~standard": StandardSchemaV1.Props<unknown, number>;

  private readonly message: string | undefined;
  private reqmessage: string | undefined;
  private intcfg: { value: boolean; message?: string } = { value: false };
  private mincfg: { value: number; message?: string } | undefined;
  private maxcfg: { value: number; message?: string } | undefined;
  private refines: PawRefineFn[];
  private checks: PawCheckFn<number>[];

  constructor(message?: string) {
    this.message = message;
    this.checks = [];
    this.refines = [];
    this["~standard"] = new PawStandardSchemaProps(this);
  }

  check(fn: PawCheckFn<number>): PawNumber {
    this.checks.push(fn);
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

  nullable(): PawNullable<PawNumber> {
    return new PawNullableParser(this);
  }

  required(message: string): PawNumber {
    this.reqmessage = message;
    return this;
  }

  refine<T>(fn: PawRefineFn<T>): PawNumber {
    this.refines.push(fn);
    return this;
  }

  transform<U>(fn: PawTransformFn<number, U>): PawTransform<U> {
    return new PawTransformParser(fn, this);
  }

  parse(input: unknown): number {
    const result = this.safeParse(input);
    if (!result.ok) {
      throw new PawParseError(result.error);
    }
    return result.value;
  }

  safeParse(input: unknown): PawResult<number, PawIssue> {
    for (const refinefn of this.refines) {
      const result = refinefn(new PawRefineContext(input, this.kind));
      if (!result.ok) {
        return result;
      }
      input = result.value;
    }

    if (input === null || input === undefined) {
      const message = this.reqmessage ?? this.message ?? `Expected a number but received ${input}`;
      return new PawError(new PawRequiredIssue(message));
    }

    if (typeof input !== "number") {
      const message = this.message ?? `Expected a number but received ${typeof input}`;
      return new PawError(new PawNumberIssue(message));
    }

    if (this.intcfg.value && !Number.isInteger(input)) {
      const message = this.intcfg.message ?? "Expected number to be a valid integer";
      return new PawError(new PawNumberIssue(message));
    }

    if (this.mincfg && input < this.mincfg.value) {
      const message =
        this.mincfg.message ?? `Expected number to be less than or equal to ${this.mincfg.value}`;
      return new PawError(new PawNumberIssue(message));
    }

    if (this.maxcfg && input > this.maxcfg.value) {
      const message =
        this.maxcfg.message ?? `Expected number to be bigger than or equal to ${this.maxcfg.value}`;
      return new PawError(new PawNumberIssue(message));
    }

    for (const checkfn of this.checks) {
      const result = checkfn(new PawCheckContext(input, input, this.kind));
      if (!result.ok) {
        return result;
      }
    }

    return new PawOk(input);
  }
}

const BOOLEAN = "boolean" as const;
class PawBooleanParser implements PawBoolean {
  public readonly kind = BOOLEAN;
  public readonly "~standard": StandardSchemaV1.Props<unknown, boolean>;

  private readonly message: string | undefined;
  private reqmessage: string | undefined;
  private refines: PawRefineFn[];
  private checks: PawCheckFn<boolean>[];

  constructor(message?: string) {
    this.message = message;
    this.checks = [];
    this.refines = [];
    this["~standard"] = new PawStandardSchemaProps(this);
  }

  check(fn: PawCheckFn<boolean>): PawBoolean {
    this.checks.push(fn);
    return this;
  }

  optional(): PawOptional<PawBoolean> {
    return new PawOptionalParser(this);
  }

  nullable(): PawNullable<PawBoolean> {
    return new PawNullableParser(this);
  }

  required(message: string): PawBoolean {
    this.reqmessage = message;
    return this;
  }

  refine<T>(fn: PawRefineFn<T>): PawBoolean {
    this.refines.push(fn);
    return this;
  }

  transform<U>(fn: PawTransformFn<boolean, U>): PawTransform<U> {
    return new PawTransformParser(fn, this);
  }

  parse(input: unknown): boolean {
    const result = this.safeParse(input);
    if (!result.ok) {
      throw new PawParseError(result.error);
    }
    return result.value;
  }

  safeParse(input: unknown): PawResult<boolean, PawIssue> {
    for (const refinefn of this.refines) {
      const result = refinefn(new PawRefineContext(input, this.kind));
      if (!result.ok) {
        return result;
      }
      input = result.value;
    }

    if (input === null || input === undefined) {
      const message = this.reqmessage ?? this.message ?? `Expected boolean but received ${input}`;
      return new PawError(new PawRequiredIssue(message));
    }

    if (typeof input !== "boolean") {
      const message = this.message ?? "Value is not a boolean";
      return new PawError(new PawBooleanIssue(message));
    }

    for (const checkfn of this.checks) {
      const result = checkfn(new PawCheckContext(input, input, this.kind));
      if (!result.ok) {
        return result;
      }
    }

    return new PawOk(input);
  }
}

const UNKNOWN = "unknown" as const;
class PawUnknownParser implements PawUnknown {
  public readonly kind = UNKNOWN;
  public readonly "~standard": StandardSchemaV1.Props<unknown, unknown>;

  private refines: PawRefineFn[];
  private checks: PawCheckFn<unknown>[];

  constructor() {
    this.refines = [];
    this.checks = [];
    this["~standard"] = new PawStandardSchemaProps(this);
  }

  check(fn: PawCheckFn<any>): PawUnknown {
    this.checks.push(fn);
    return this;
  }

  refine<T>(fn: PawRefineFn<T>): PawUnknown {
    this.refines.push(fn);
    return this;
  }

  transform<U>(fn: PawTransformFn<any, U>): PawTransform<U> {
    return new PawTransformParser(fn, this);
  }

  parse(input: unknown): unknown {
    const result = this.safeParse(input);
    if (!result.ok) {
      throw new PawParseError(result.error);
    }
    return result.value;
  }

  safeParse(input: unknown): PawResult<unknown, PawIssue> {
    for (const refinefn of this.refines) {
      const result = refinefn(new PawRefineContext(input, this.kind));
      if (!result.ok) {
        return result;
      }
      input = result.value;
    }

    for (const checkfn of this.checks) {
      const result = checkfn(new PawCheckContext(input, input, this.kind));
      if (!result.ok) {
        return result;
      }
    }

    return new PawOk(input);
  }
}

const ANY = "any" as const;
export class PawAnyParser implements PawAny {
  public readonly kind = ANY;
  public readonly "~standard": StandardSchemaV1.Props<unknown, any>;

  private refines: PawRefineFn[];
  private checks: PawCheckFn<any>[];

  constructor() {
    this.refines = [];
    this.checks = [];
    this["~standard"] = new PawStandardSchemaProps(this);
  }

  check(fn: PawCheckFn<any>): PawAny {
    this.checks.push(fn);
    return this;
  }

  refine<T>(fn: PawRefineFn<T>): PawAny {
    this.refines.push(fn);
    return this;
  }

  transform<U>(fn: PawTransformFn<any, U>): PawTransform<U> {
    return new PawTransformParser(fn, this);
  }

  parse(input: unknown): any {
    const result = this.safeParse(input);
    if (!result.ok) {
      throw new PawParseError(result.error);
    }
    return result.value;
  }

  safeParse(input: unknown): PawResult<any, PawIssue> {
    for (const refinefn of this.refines) {
      const result = refinefn(new PawRefineContext(input, this.kind));
      if (!result.ok) {
        return result;
      }
      input = result.value;
    }

    for (const checkfn of this.checks) {
      const result = checkfn(new PawCheckContext(input, input, this.kind));
      if (!result.ok) {
        return result;
      }
    }

    return new PawOk(input);
  }
}

const ARRAY = "array" as const;
class PawArrayParser<T extends PawType> implements PawArray<T> {
  public readonly kind = ARRAY;
  public readonly "~standard": StandardSchemaV1.Props<unknown, PawInfer<T>[]>;

  private readonly unit: T;
  private readonly message: string | undefined;
  private isImmediate: boolean;
  private reqmessage: string | undefined;
  private maxcfg: { value: number; message?: string } | undefined;
  private mincfg: { value: number; message?: string } | undefined;
  private refinements: PawRefineFn[];
  private checks: PawCheckFn<PawInfer<T>[]>[];

  constructor(unit: T, message?: string) {
    this.unit = unit;
    this.message = message;
    this.isImmediate = false;
    this.checks = [];
    this.refinements = [];
    this["~standard"] = new PawStandardSchemaProps(this);
  }

  immediate(): PawArray<T> {
    this.isImmediate = true;
    return this;
  }

  check(fn: PawCheckFn<PawInfer<T>[]>): PawArray<T> {
    this.checks.push(fn);
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

  nullable(): PawNullable<PawArray<T>> {
    return new PawNullableParser(this);
  }

  required(message: string): PawArray<T> {
    this.reqmessage = message;
    return this;
  }

  refine<U>(fn: PawRefineFn<U>): PawArray<T> {
    this.refinements.push(fn);
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

  safeParse(input: unknown): PawResult<PawInfer<T>[], PawIssue> {
    if (this.isImmediate) {
      return this.safeParseImmediate(input);
    } else {
      return this.safeParseRetained(input);
    }
  }

  private safeParseImmediate(input: unknown): PawResult<PawInfer<T>[], PawIssue> {
    const refined = this.runRefinements(input);
    if (!refined.ok) {
      return refined;
    }

    input = refined.value;
    const arr = this.parseArray(input);
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

    const output = arr.value as PawInfer<T>[];
    const checkResult = this.runChecks(input, output);
    if (!checkResult.ok) {
      return checkResult;
    }

    return new PawOk(output);
  }

  private safeParseRetained(input: unknown): PawResult<PawInfer<T>[], PawIssue> {
    const refined = this.runRefinements(input);
    if (!refined.ok) {
      return refined;
    }

    input = refined.value;
    const arr = this.parseArray(input);
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

    const output = arr.value as PawInfer<T>[];
    const checkResult = this.runChecks(input, output);
    if (!checkResult.ok) {
      return checkResult;
    }

    return new PawOk(output);
  }

  private parseArray(input: unknown): PawResult<any[], PawIssue> {
    if (input === null || input === undefined) {
      const message = this.reqmessage ?? this.message ?? `Expected array but received ${input}`;
      return new PawError(new PawRequiredIssue(message));
    }

    if (!Array.isArray(input)) {
      const message = this.message ?? `Expected array but received ${typeof input}`;
      return new PawError(new PawArrayTypeIssue(message));
    }

    if (this.maxcfg != null && input.length > this.maxcfg.value) {
      const message =
        this.maxcfg.message ?? `Array cannot have more than ${this.maxcfg.value} items`;
      return new PawError(new PawArrayTypeIssue(message));
    }

    if (this.mincfg != null && input.length < this.mincfg.value) {
      const message =
        this.mincfg.message ?? `Array cannot have less than ${this.mincfg.value} items`;
      return new PawError(new PawArrayTypeIssue(message));
    }

    return new PawOk(input);
  }

  private runChecks(input: unknown, output: PawInfer<T>[]): PawResult<void, PawIssue> {
    for (const checkfn of this.checks) {
      const result = checkfn(new PawCheckContext(input, output, this.kind));
      if (!result.ok) {
        return result;
      }
    }
    return new PawOk(undefined);
  }

  private runRefinements(input: unknown): PawResult<unknown, PawIssue> {
    for (const fn of this.refinements) {
      const result = fn(new PawRefineContext(input, this.kind));
      if (!result.ok) {
        return result;
      }
      input = result.value;
    }
    return new PawOk(input);
  }
}

const OBJECT = "object" as const;
class PawObjectParser<T extends Record<string, PawType>> implements PawObject<T> {
  public readonly kind = OBJECT;
  public readonly "~standard": StandardSchemaV1.Props<unknown, PawParsedObject<T>>;

  private readonly fields: T;
  private readonly message: string | undefined;
  private isImmediate: boolean;
  private reqmessage: string | undefined;
  private refinements: PawRefineFn[];
  private checks: PawCheckFn<PawParsedObject<T>>[];
  private isStrict: boolean;
  private isPathed: boolean;

  constructor(fields: T, message?: string) {
    this.fields = fields;
    this.message = message;
    this.isImmediate = false;
    this.refinements = [];
    this.checks = [];
    this.isStrict = false;
    this.isPathed = false;
    this["~standard"] = new PawStandardSchemaProps(this);
  }

  extend<U extends Record<string, PawType>>(
    fields: U,
    message?: string,
  ): PawObject<Pretty<MergeRecord<T, U>>> {
    const mergedFields: T & U = { ...this.fields, ...fields };
    const clone = new PawObjectParser(mergedFields, message);
    clone.isImmediate = this.isImmediate;
    clone.reqmessage = this.reqmessage;
    clone.isStrict = this.isStrict;
    clone.isPathed = this.isPathed;
    this.refinements.forEach((fn) => clone.refine(fn));
    this.checks.forEach((ck) => clone.check(ck));
    return clone;
  }

  optional(): PawOptional<PawObject<T>> {
    return new PawOptionalParser(this);
  }

  nullable(): PawNullable<PawObject<T>> {
    return new PawNullableParser(this);
  }

  check(fn: PawCheckFn<PawParsedObject<T>>): PawObject<T> {
    this.checks.push(fn);
    return this;
  }

  required(message: string): PawObject<T> {
    this.reqmessage = message;
    return this;
  }

  immediate(): PawObject<T> {
    this.isImmediate = true;
    return this;
  }

  refine<U>(fn: PawRefineFn<U>): PawObject<T> {
    this.refinements.push(fn);
    return this;
  }

  transform<U>(fn: PawTransformFn<T, U>): PawTransform<U> {
    return new PawTransformParser(fn, this);
  }

  pathed(): PawObject<T> {
    this.isPathed = true;
    return this;
  }

  strict(): PawObject<T> {
    this.isStrict = true;
    return this;
  }

  parse(val: unknown): PawParsedObject<T> {
    const result = this.safeParse(val);
    if (!result.ok) {
      throw new PawParseError(result.error);
    }
    return result.value;
  }

  // TODO: refactor how strict parsing is handled to remove code duplication
  safeParse(val: unknown): PawResult<PawParsedObject<T>, PawIssue> {
    const result = this.isImmediate ? this.safeParseImmediate(val) : this.safeParseRetained(val);
    if (!result.ok && this.isPathed) {
      const pathedIssues = this.makeIssueWithPath(result.error);
      return new PawError(pathedIssues);
    }
    return result;
  }

  private safeParseImmediate(input: unknown): PawResult<PawParsedObject<T>, PawIssue> {
    const refined = this.runRefinements(input);
    if (!refined.ok) {
      return refined;
    }

    input = refined.value;
    const obj = this.parseObject(input);
    if (!obj.ok) {
      return obj;
    }

    let output: PawParsedObject<T>;
    if (this.isStrict) {
      const strict: Record<string, any> = {};
      for (const k in this.fields) {
        const v = obj.value[k];
        const result = this.fields[k]!.safeParse(v);
        if (!result.ok) {
          const message = this.getFieldIssueMessage(k);
          const issue: PawObjectFieldIssue = { field: k, issue: result.error };
          return new PawError(new PawObjectSchemaIssue(message, [issue], [k]));
        }
        strict[k] = result.value;
      }
      output = strict as PawParsedObject<T>;
    } else {
      for (const k in this.fields) {
        const v = obj.value[k];
        const result = this.fields[k]!.safeParse(v);
        if (!result.ok) {
          const message = this.getFieldIssueMessage(k);
          const issue: PawObjectFieldIssue = { field: k, issue: result.error };
          return new PawError(new PawObjectSchemaIssue(message, [issue]));
        }
      }
      output = obj.value as PawParsedObject<T>;
    }

    const checkResult = this.runChecks(input, output);
    if (!checkResult.ok) {
      return checkResult;
    }

    return new PawOk(output);
  }

  private safeParseRetained(input: unknown): PawResult<PawParsedObject<T>, PawIssue> {
    const refined = this.runRefinements(input);
    if (!refined.ok) {
      return refined;
    }

    input = refined.value;
    const obj = this.parseObject(input);
    if (!obj.ok) {
      return obj;
    }

    const issues: PawObjectFieldIssue[] = [];
    let output: PawParsedObject<T>;
    if (this.isStrict) {
      const strict: Record<string, any> = {};
      for (const k in this.fields) {
        const v = obj.value[k];
        const result = this.fields[k]!.safeParse(v);
        if (!result.ok) {
          issues.push({ field: k, issue: result.error });
        } else {
          strict[k] = result.value;
        }
      }
      output = strict as PawParsedObject<T>;
    } else {
      for (const k in this.fields) {
        const v = obj.value[k];
        const parsed = this.fields[k]!.safeParse(v);
        if (!parsed.ok) {
          issues.push({ field: k, issue: parsed.error });
        }
      }
      output = obj.value as PawParsedObject<T>;
    }

    if (issues.length > 0) {
      const message = this.message ?? "Object failed schema validation";
      return new PawError(new PawObjectSchemaIssue(message, issues));
    }

    const checkResult = this.runChecks(input, output);
    if (!checkResult.ok) {
      return checkResult;
    }

    return new PawOk(output);
  }

  private runRefinements(input: unknown): PawResult<unknown, PawIssue> {
    for (const refinefn of this.refinements) {
      const result = refinefn(new PawRefineContext(input, this.kind));
      if (!result.ok) {
        return result;
      }
      input = result.value;
    }
    return new PawOk(input);
  }

  private parseObject(val: unknown): PawResult<Record<string, unknown>, PawIssue> {
    if (val === null || val === undefined) {
      const message = this.reqmessage ?? this.message ?? `Expected object but received ${val}`;
      return new PawError(new PawRequiredIssue(message));
    }

    if (typeof val !== "object") {
      const message = this.message ?? `Expected object but received ${typeof val}`;
      return new PawError(new PawObjectTypeIssue(message));
    }

    return new PawOk(val as Record<string, unknown>);
  }

  private runChecks(input: unknown, output: PawParsedObject<T>): PawResult<void, PawIssue> {
    for (const checkfn of this.checks) {
      const result = checkfn(new PawCheckContext(input, output, this.kind));
      if (!result.ok) {
        return result;
      }
    }
    return new PawOk(undefined);
  }

  // TODO: improve how `path` is injected in `PawIssue`, since this method fews
  // like a hack, bypassing the `readonly` constraint and using recursion
  private makeIssueWithPath(issue: PawIssue, path: PawIssuePath = []): PawIssue {
    if (issue.kind === "object-schema") {
      for (let j = 0; j < issue.issues.length; j += 1) {
        const objIssue = issue.issues[j];
        const pathedIssue = this.makeIssueWithPath(objIssue.issue, path.concat(objIssue.field));
        Object.assign(objIssue, { issue: pathedIssue });
      }
    } else if (issue.kind === "array-schema") {
      for (let j = 0; j < issue.issues.length; j += 1) {
        const arrIssue = issue.issues[j];
        const pathedIssue = this.makeIssueWithPath(arrIssue.issue, path.concat(arrIssue.idx));
        Object.assign(arrIssue, { issue: pathedIssue });
      }
    }

    Object.assign(issue, { path });
    return issue;
  }

  private getFieldIssueMessage(key: string): string {
    return this.message ?? `Field '${key}' failed object schema validation`;
  }
}

const LITERAL = "literal" as const;
class PawLiteralParser<const T extends string | number | boolean> implements PawLiteral<T> {
  public readonly kind = LITERAL;
  public readonly "~standard": StandardSchemaV1.Props<unknown, T>;

  private readonly values: T[];
  private readonly message: string | undefined;
  private reqmessage: string | undefined;
  private refines: PawRefineFn[];
  private checks: PawCheckFn<T>[];

  constructor(values: T[], message?: string) {
    this.values = values;
    this.message = message;
    this.refines = [];
    this.checks = [];
    this["~standard"] = new PawStandardSchemaProps(this);
  }

  optional(): PawOptional<PawLiteral<T>> {
    return new PawOptionalParser(this);
  }

  nullable(): PawNullable<PawLiteral<T>> {
    return new PawNullableParser(this);
  }

  check(fn: PawCheckFn<T>): PawLiteral<T> {
    this.checks.push(fn);
    return this;
  }

  required(message: string): PawLiteral<T> {
    this.reqmessage = message;
    return this;
  }

  refine<U>(fn: PawRefineFn<U>): PawLiteral<T> {
    this.refines.push(fn);
    return this;
  }

  transform<U>(fn: PawTransformFn<T, U>): PawTransform<U> {
    return new PawTransformParser(fn, this);
  }

  parse(input: unknown): T {
    const result = this.safeParse(input);
    if (!result.ok) {
      throw new PawParseError(result.error);
    }
    return result.value;
  }

  safeParse(input: unknown): PawResult<T, PawIssue> {
    for (const refinefn of this.refines) {
      const result = refinefn(new PawRefineContext(input, this.kind));
      if (!result.ok) {
        return result;
      }
      input = result.value;
    }

    if (input === null || input === undefined) {
      const message = this.reqmessage ?? `Expected literal but received ${input}`;
      return new PawError(new PawRequiredIssue(message));
    }

    const idx = this.values.indexOf(input as T);
    if (idx < 0) {
      const options = this.values.join(", ");
      const message = this.message ?? `Expected one of the following values: ${options}`;
      return new PawError(new PawLiteralIssue(message));
    }

    for (const checkfn of this.checks) {
      const result = checkfn(new PawCheckContext(input, input as T, this.kind));
      if (!result.ok) {
        return result;
      }
    }

    return new PawOk(input as T);
  }
}

const UNION = "union" as const;
class PawUnionParser<T extends Array<PawSchema<any, any>>> implements PawUnion<T> {
  public readonly kind = UNION;
  public readonly "~standard": StandardSchemaV1.Props<unknown, PawInfer<T[number]>>;

  private readonly schemas: T;
  private readonly message: string | undefined;
  private reqmessage: string | undefined;
  private refines: PawRefineFn[];
  private checks: PawCheckFn<PawInfer<T[number]>>[];

  constructor(schemas: T, message?: string) {
    this.schemas = schemas;
    this.message = message;
    this.refines = [];
    this.checks = [];
    this["~standard"] = new PawStandardSchemaProps(this);
  }

  optional(): PawOptional<PawUnion<T>> {
    return new PawOptionalParser(this);
  }

  nullable(): PawNullable<PawUnion<T>> {
    return new PawNullableParser(this);
  }

  check(fn: PawCheckFn<PawInfer<T[number]>>): PawUnion<T> {
    this.checks.push(fn);
    return this;
  }

  required(message: string): PawUnion<T> {
    this.reqmessage = message;
    return this;
  }

  refine<U>(fn: PawRefineFn<U>): PawUnion<T> {
    this.refines.push(fn);
    return this;
  }

  transform<U>(fn: PawTransformFn<PawInfer<T[number]>, U>): PawTransform<U> {
    return new PawTransformParser(fn as any, this);
  }

  parse(input: unknown): PawInfer<T[number]> {
    const result = this.safeParse(input);
    if (!result.ok) {
      throw new PawParseError(result.error);
    }
    return result.value;
  }

  safeParse(input: unknown): PawResult<PawInfer<T[number]>, PawIssue> {
    for (const refinefn of this.refines) {
      const result = refinefn(new PawRefineContext(input, this.kind));
      if (!result.ok) {
        return result;
      }
      input = result.value;
    }

    for (const schema of this.schemas) {
      const parsed = schema.safeParse(input);
      if (parsed.ok) {
        for (const checkfn of this.checks) {
          const result = checkfn(new PawCheckContext(input, parsed.value, this.kind));
          if (!result.ok) {
            return result;
          }
        }
        return parsed;
      }
    }

    if (input === null || input === undefined) {
      const message = this.reqmessage ?? `Expected union but received ${input}`;
      return new PawError(new PawRequiredIssue(message));
    }

    // TODO: improve error message
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
