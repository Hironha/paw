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
  PawBigIntIssue,
} from "./issue";
import type { StandardSchemaV1 } from "./standard-schema";

type Pretty<T> = { [K in keyof T]: T[K] } & {};
type MergeRecord<B extends Record<any, any>, T extends Record<any, any>> = Omit<B, keyof T> & T;

export type PawType =
  | PawString
  | PawNumber
  | PawBoolean
  | PawUnknown
  | PawAny
  | PawBigInt
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

/**
 * A context that holds states of the parsing process used to build refinements on the input.
 */
export class PawRefineContext {
  /**
   * Refine `input` is the value before parsing. If there are more than 1 `refine` defined,
   * then the value of subsequent `input` is of output of the previous `refine`.
   */
  readonly input: unknown;
  /**
   * Refers to which parsing schema the `refine` belongs to.
   */
  readonly src: PawType["kind"];

  constructor(input: unknown, src: PawType["kind"]) {
    this.input = input;
    this.src = src;
  }

  /**
   * Method to return a successful refined value.
   * @example
   * const Schema = paw.string().refine((ctx) => {
   *   return ctx.ok(ctx.input.toString());
   * });
   *
   * expect(Schema.parse(2)).toStrictEqual("2")
   */
  ok<T>(output: T): PawOk<T> {
    return new PawOk(output);
  }

  /**
   * Method to return an issue when the refinement fails.
   * @example
   * const Schema = paw.number().refine((ctx) => {
   *   const n = Number(ctx.input);
   *   if (Number.isNaN(n)) {
   *     return ctx.error("Schema does not accept NaN");
   *   }
   *   return ctx.ok(n);
   * });
   *
   * const result = Schema.safeParse("test");
   * expect(result).toMatchObject({
   *   ok: false,
   *   error: {
   *     kind: "refine",
   *     src: "number",
   *     message: "Schema does not accept NaN"
   *   }
   * });
   */
  error(message: string, path?: PawIssuePath): PawError<PawRefineIssue> {
    const issue = new PawRefineIssue(message, this.src, path);
    return new PawError(issue);
  }
}

/**
 * Type signature of a refinement function. It receives the {@link PawRefineContext} as parameter
 * that should be used to refine the value.
 */
export type PawRefineFn<O = any> = (ctx: PawRefineContext) => PawResult<O, PawRefineIssue>;

class PawRefinementPipeline {
  private readonly src: PawType["kind"];
  private readonly refinements: PawRefineFn[];

  constructor(refinements: PawRefineFn[], src: PawType["kind"]) {
    this.src = src;
    this.refinements = refinements;
  }

  run(input: unknown): PawResult<unknown, PawRefineIssue> {
    for (const refinefn of this.refinements) {
      const result = refinefn(new PawRefineContext(input, this.src));
      if (!result.ok) {
        return result;
      }
      input = result.value;
    }
    return new PawOk(input);
  }
}

export interface PawParser<T> {
  /**
   * Failable method that parses `val` into  {@link T}
   * @throws {Error} Throws a {@link PawParseError} when parsing fails
   * @example
   * const Schema = paw.string();
   * expect(Schema.parse("test")).toBe("test");
   */
  parse(val: unknown): T;
  /**
   * Parse `val` into a {@link PawResult<T, PawIssue>}, returning a {@link PawError<PawIssue>} when the parse
   * fails and {@link PawOk<T>} when succeeds.
   * @example
   * const Schema = paw.number();
   * const result = Schema.safeParse(2);
   * expect(result.ok).toBeTruthy();
   * if (result.ok) {
   *   expect(result.value).toStrictEqual(2);
   * } else {
   *   expect(result.error).toMatchObject({
   *     kind: "number",
   *     message: expect.any(String)
   *   });
   * }
   */
  safeParse(val: unknown): PawResult<T, PawIssue>;
}

/**
 * Interface representing a Paw schema. It combines the core parsing capabilities
 * defined by {@link PawParser} with the {@link StandardSchemaV1} specification.
 *
 * @template N - The string literal type representing the kind of the schema.
 * @template T - The type that the schema will infer and return after parsing.
 */
export interface PawSchema<N extends string, T> extends PawParser<T>, StandardSchemaV1<unknown, T> {
  /** Kind of the parsing schema. */
  readonly kind: N;
}

/**
 * An interface for refinements. All schemas that support refinements should implement this interface.
 */
export interface PawRefinable<S extends PawParser<any>> {
  /**
   * Refine receives a closure to transform the value before parsing. Each refinement closure may
   * return a new value that is forwarded to the next refinement and to the parser.
   * @example
   * const Schema = paw.number().refine((ctx) => {
   *   return ctx.ok(Number(ctx.input));
   * });
   *
   * expect(Schema.parse("2")).toBe(2);
   */
  refine<T>(fn: PawRefineFn<T>): S;
}

/**
 * A context that holds states of the parsing process used to build custom validation.
 */
export class PawCheckContext<O> {
  /**
   * Check `input` is the value before parsing. It may either be the original value or the last
   * output of a refinement if the schema also supports `refine`.
   * @example
   * const Schema = paw.string().check((ctx) => {
   *   if (typeof ctx.input !== "string") {
   *     return ctx.error("Expected input to be of type string");
   *   }
   *   return ctx.ok();
   * });
   *
   * expect(Schema.parse("test")).toBe("test");
   * @example
   * const Schema = paw.string()
   *   .transform((ctx) => ctx.ok(ctx.input.toString()))
   *   .check((ctx) => {
   *     if (typeof ctx.input !== "string") {
   *       return ctx.error("Expected input to be of type string");
   *     }
   *     return ctx.ok();
   *   });
   *
   * // note that here we pass `2` as value, but the check does not return an
   * // error because `input` is mutated through `refine`
   * expect(Schema.parse(2)).toBe("2");
   */
  public readonly input: unknown;
  /**
   * Check `output` is the parsed value. Note that the transformations do not affect the value
   * of `output`, so it will always be the value parsed by the current schema.
   * @example
   * const Schema = paw.number().int().check((ctx) => {
   *   // note that `output` is a number here
   *   if (ctx.output % 2 !== 0) {
   *     return ctx.error("Expected value to be even");
   *   }
   *   return ctx.ok();
   * });
   *
   * expect(Schema.parse(2)).toBe(2);
   */
  public readonly output: O;
  /**
   * Refers to which parsing schema the `check` belongs to.
   */
  public readonly src: PawType["kind"];

  constructor(input: unknown, output: O, src: PawType["kind"]) {
    this.input = input;
    this.output = output;
    this.src = src;
  }

  /**
   * Method to return a successful check.
   * @example
   * const Schema = paw.string().check((ctx) => {
   *   if (ctx.output === "cow") {
   *     return ctx.error("Cow is not allowed here!")
   *   }
   *   return ctx.oK();
   * });
   *
   * expect(Schema.parse("test")).toBe("test")
   */
  ok(): PawOk<void> {
    return PawOk.empty();
  }

  /**
   * Method to return an issue when the check fails.
   * @example
   * const Schema = paw.number().int().check((ctx) => {
   *   if (ctx.output % 2 !== 0) {
   *     return ctx.error("Expected value to be even");
   *   }
   *   return ctx.ok();
   * });
   *
   * expect(Schema.parse(4)).toEqual(4);
   */
  error(message: string, path?: PawIssuePath): PawError<PawCheckIssue> {
    const issue = new PawCheckIssue(message, this.src, path);
    return new PawError(issue);
  }
}

/**
 * Type signature of a check function. It receives the {@link PawCheckContext} as parameter
 * that should be used to make your own validation.
 */
export type PawCheckFn<T> = (ctx: PawCheckContext<T>) => PawResult<void, PawCheckIssue>;

class PawCheckPipeline<T> {
  private readonly src: PawType["kind"];
  private readonly checks: PawCheckFn<T>[];

  constructor(checks: PawCheckFn<T>[], src: PawType["kind"]) {
    this.src = src;
    this.checks = checks;
  }

  run(input: unknown, output: T): PawResult<void, PawCheckIssue> {
    for (const checkfn of this.checks) {
      const result = checkfn(new PawCheckContext(input, output, this.src));
      if (!result.ok) {
        return result;
      }
    }
    return new PawOk(undefined);
  }
}

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
/**
 * An interface for checks. All schemas that supports checks should implement this interface.
 */
export interface PawCheckable<S, T> {
  /**
   * Add a custom check constraint. Checks runs after the parsing and are usually meant to validate
   * rules that the typesystem does not support.
   * @example
   * const Schema = paw.string().check((ctx) => {
   *   if (ctx.output === "foo") {
   *     return ctx.error("String cannot be foo!");
   *   }
   *   return ctx.ok();
   * });
   *
   * expect(Schema.parse("test")).toBe("test");
   * expect(Schema.safeParse("foo")).toMatchObject({
   *   ok: false,
   *   error: {
   *     kind: "check",
   *     src: "string",
   *     message: "String cannot be foo!"
   *   }
   * });
   */
  check(fn: PawCheckFn<T>): S;
}

/**
 * A context that holds states of the parsing process used to build transformations on the output.
 */
export class PawTransformContext<I> {
  /**
   * Transform `output` refers to the output of the parsing schema.
   * @example
   * const Schema = paw.string().transform((ctx) => {
   *   if (typeof ctx.output !== "string") {
   *     throw new Error("Output of schema string should be a string")
   *   }
   *   return ctx.ok(Number(ctx.output));
   * });
   *
   * expect(Schema.parse("2")).toBe(2);
   */
  public readonly output: I;
  /**
   * Refers to which parsing schema the `transform` belongs to.
   */
  public readonly src: PawType["kind"];

  constructor(output: I, src: PawType["kind"]) {
    this.output = output;
    this.src = src;
  }

  /**
   * Method to return a successful transformed value.
   * @example
   * const Schema = paw.string().transform((ctx) => {
   *   return ctx.ok(Number(ctx.output));
   * });
   *
   * expect(Schema.parse("2")).toStrictEqual(2);
   */
  ok<O>(out: O): PawOk<O> {
    return new PawOk(out);
  }

  /**
   * Method to return an issue when the transformation fails.
   * @example
   * const Schema = paw.string().transform((ctx) => {
   *   const n = Number(ctx.output);
   *   if (Number.isNaN(n)) {
   *     return ctx.error("String is not a serialized number");
   *   }
   *   return ctx.ok(n);
   * });
   *
   * const result = Schema.safeParse("test");
   * expect(result).toMatchObject({
   *   ok: false,
   *   error: {
   *     kind: "string",
   *     message: "String is not a serialized number"
   *   }
   * });
   */
  error(message: string, path?: PawIssuePath): PawError<PawTransformIssue> {
    const issue = new PawTransformIssue(message, this.src, path);
    return new PawError(issue);
  }
}

/**
 * Type signature of a transformation function. It receives the {@link PawTransformContext} as parameter
 * that should be used to transform the value.
 */
export type PawTransformFn<I, O> = (ctx: PawTransformContext<I>) => PawResult<O, PawTransformIssue>;

/**
 * An interface for transforms. All schemas that supports transformations should implement this interface.
 */
export interface PawTransformable<T> {
  /**
   * Transform the parsed value into another value. Transform function runs after parsing
   * and check constraints.
   * @example
   * const Schema = paw.string().transform((ctx) => {
   *   const n = Number(ctx.output);
   *   if (Number.isNaN(n)) {
   *     return ctx.error("Value must be a string serialized number");
   *   }
   *   return ctx.ok(n);
   * });
   *
   * expect(Schema.parse("2")).toBe(2);
   */
  transform<U>(fn: PawTransformFn<T, U>): PawTransform<U>;
}

export interface PawTransform<T> extends PawSchema<"transform", T>, PawTransformable<T> {}

export interface PawOptional<S extends PawSchema<string, any>>
  extends PawSchema<"optional", ReturnType<S["parse"]> | undefined> {}

export interface PawRequireable<S extends PawSchema<string, any>> {
  /**
   * Set the required error message. Does NOT change any validations or type schema.
   * @example
   * const Schema = paw.number().required("A number is required!");
   *
   * expect(Schema.safeParse(undefined)).toMatchObject({
   *   ok: false,
   *   error: {
   *     kind: "required",
   *     message: "A number is required!"
   *   }
   * });
   */
  required(message: string): S;
}

export interface PawMaybeOptional<S extends PawSchema<string, any>> {
  /**
   * Allow value to be `undefined`.
   * @example
   * const Schema = paw.object({ name: paw.string () }).optional();
   *
   * expect(Schema.parse(undefined)).toBe(undefined);
   * expect(Schema.parse({ name: "paw" })).toStrictEqual({ name: "paw" });
   */
  optional(): PawOptional<S>;
}

export interface PawNullable<S extends PawSchema<string, any>>
  extends PawSchema<"nullable", ReturnType<S["parse"]> | null>,
    PawMaybeOptional<PawNullable<S>> {}

export interface PawMaybeNullable<S extends PawSchema<string, any>> {
  /**
   * Allow value to be `null`.
   * @example
   * const Schema = paw.object({ name: paw.string () }).nullable();
   *
   * expect(Schema.parse(null)).toBe(null);
   * expect(Schema.parse({ name: "paw" })).toStrictEqual({ name: "paw" });
   */
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
  /**
   * Set minimum (inclusive) acceptable length for the string.
   * @example
   * const Schema = paw.string().min(1);
   *
   * expect(Schema.parse("a")).toBe("a");
   * expect(Schema.parse("ab")).toBe("ab");
   * expect(Schema.safeParse("")).toMatchObject({
   *   ok: false,
   *   error: {
   *     kind: "string",
   *     message: "String length cannot be less than 1"
   *   }
   * });
   */
  min(length: number, message?: string): PawString;
  /**
   * Set maximum (inclusive) acceptable length for the string.
   * @example
   * const Schema = paw.string().max(2);
   *
   * expect(Schema.parse("a")).toBe("a");
   * expect(Schema.parse("ab")).toBe("ab");
   * expect(Schema.safeParse("abc")).toMatchObject({
   *   ok: false,
   *   error: {
   *     kind: "string",
   *     message: "String length cannot be more than 2"
   *   }
   * });
   */
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
  /**
   * Set parser to validate if number is an integer.
   * @example
   * const Schema = paw.number().int();
   *
   * expect(Schema.parse(2)).toBe(2);
   * expect(Schema.safeParse(2.1)).toMatchObject({
   *   ok: false,
   *   error: {
   *     kind: "number",
   *     message: "Expected number to be a valid integer"
   *   }
   * });
   */
  int(message?: string): PawNumber;
  /**
   * Set minimum (inclusive) allowed value.
   * @example
   * const Schema = paw.number().min(1);
   *
   * expect(Schema.parse(2)).toBe(2);
   * expect(Schema.parse(1)).toBe(1);
   * expect(Schema.safeParse(0)).toMatchObject({
   *   ok: false,
   *   error: {
   *     kind: "number",
   *     message: "Expected number to be greater than or equal to 1"
   *   }
   * });
   */
  min(val: number, message?: string): PawNumber;
  /**
   * Set maximum (inclusive) allowed value.
   * @example
   * const Schema = paw.number().max(2);
   *
   * expect(Schema.parse(1)).toBe(1);
   * expect(Schema.parse(2)).toBe(2);
   * expect(Schema.safeParse(3)).toMatchObject({
   *   ok: false,
   *   error: {
   *     kind: "number",
   *     message: "Expected number to be less than or equal to 2"
   *   }
   * });
   */
  max(val: number, message?: string): PawNumber;
}

export interface PawBigInt
  extends PawSchema<"bigint", bigint>,
    PawRefinable<PawBigInt>,
    PawMaybeOptional<PawBigInt>,
    PawMaybeNullable<PawBigInt>,
    PawCheckable<PawBigInt, bigint>,
    PawTransformable<bigint>,
    PawRequireable<PawBigInt> {
  /**
   * Set minimum (inclusive) allowed value for the bigint.
   * @example
   * const Schema = paw.bigint().min(1n);
   *
   * expect(Schema.parse(2n)).toBe(2n);
   * expect(Schema.parse(1n)).toBe(1n);
   * expect(Schema.safeParse(0n)).toMatchObject({
   *   ok: false,
   *   error: {
   *     kind: "bigint",
   *     message: "Expected bigint to be greater than or equal to 1"
   *   }
   * });
   */
  min(val: bigint, message?: string): PawBigInt;
  /**
   * Set maximum (inclusive) allowed value for the bigint.
   * @example
   * const Schema = paw.bigint().max(2n);
   *
   * expect(Schema.parse(1n)).toBe(1n);
   * expect(Schema.parse(2n)).toBe(2n);
   * expect(Schema.safeParse(3n)).toMatchObject({
   *   ok: false,
   *   error: {
   *     kind: "bigint",
   *     message: "Expected bigint to be less than or equal to 2"
   *   }
   * });
   */
  max(val: bigint, message?: string): PawBigInt;
}

export interface PawBoolean
  extends PawSchema<"boolean", boolean>,
    PawRefinable<PawBoolean>,
    PawMaybeOptional<PawBoolean>,
    PawMaybeNullable<PawBoolean>,
    PawCheckable<PawBoolean, boolean>,
    PawTransformable<boolean>,
    PawRequireable<PawBoolean> {}

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
   * issue is encountered.
   * @example
   * const Schema = paw.array(paw.number()).immediate();
   *
   * expect(Schema.parse([1, 2, 3])).toStrictEqual([1, 2, 3]);
   * expect(Schema.safeParse([1, 2, "test"])).toMatchObject({
   *   ok: false,
   *   error: {
   *     kind: "array-schema",
   *     message: "Item at index 2 failed schema validation",
   *     issues: [{
   *       idx: 2,
   *       issue: {
   *         kind: "number",
   *         message: "Expected a number but received string"
   *       }
   *     }]
   *   }
   * });
   */
  immediate(): PawArray<T>;
  /**
   * Set minimum (inclusive) length allowed for the array.
   * @example
   * const Schema = paw.array(paw.number()).min(1);
   *
   * expect(Schema.parse([1])).toStrictEqual([1]);
   * expect(Schema.safeParse([])).toMatchObject({
   *   ok: false,
   *   error: {
   *     kind: "array-type",
   *     message: "Array cannot have less than 1 items"
   *   }
   * });
   */
  min(size: number, message?: string): PawArray<T>;
  /**
   * Set maximum (inclusive) length allowed for the array.
   * @example
   * const Schema = paw.array(paw.number()).max(2);
   *
   * expect(Schema.parse([1, 2])).toStrictEqual([1, 2]);
   * expect(Schema.safeParse([1, 2, 3])).toMatchObject({
   *   ok: false,
   *   error: {
   *     kind: "array-type",
   *     message: "Array cannot have more than 2 items"
   *   }
   * });
   */
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
   * @example
   * const Schema = paw.object({
   *   name: paw.string().min(1),
   *   age: paw.number().int().min(0)
   * })
   * .immediate();
   *
   * const src = { name: "marin", age : 17 }
   * expect(Schema.parse(src)).toStrictEqual(src);
   * expect(Schema.safeParse({ name: "" })).toMatchObject({
   *   ok: false,
   *   error: {
   *     kind: "object-schema",
   *     message: "Property 'name' failed object schema validation",
   *     issues: [{
   *       field: "name",
   *       issue: {
   *         kind: "string",
   *         message: "String length cannot be less than 1"
   *       }
   *     }]
   *   }
   * });
   */
  immediate(): PawObject<T>;
  /**
   * Set parser to include only defined properties in parsed object.
   * @example
   * const Schema = paw.object({ name: paw.string() }).strict();
   *
   * expect(Schema.parse({ name: "marin" })).toStrictEqual({ name: "test" });
   * expect(Schema.parse({ name: "marin", age: 17 })).toStrictEqual({ name: "test" })
   */
  strict(): PawObject<T>;
  /**
   * Set the parser to include the `path` in issues.
   * @example
   * const Schema = paw.object({ name: paw.string() }).pathed();
   *
   * expect(Schema.safeParse({ name: 17 })).toMatchObject({
   *   ok: false,
   *   error: {
   *     kind: "object-schema",
   *     message: "Object failed schema validation",
   *     path: [],
   *     issues: [{
   *       field: "name",
   *       issue: {
   *         kind: "string",
   *         path: ["name"],
   *         message: "Expected string but received number"
   *       }
   *     }]
   *   }
   * });
   */
  pathed(): PawObject<T>;
  /**
   * Creates a new object schema extending from current defined schema. The new schema inherits
   * all configurations, such as `immediate` and `strict`.
   * @example
   * const BaseSchema = paw.object({ name: paw.string() });
   * const Schema = BaseSchema.extend({ age: paw.number().int().min(0) });
   *
   * expect(Schema.parse({ name: "marin", age: 17 })).toStrictEqual({ name: "marin", age: 17 });
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

  private readonly schema: T;
  private refinements: PawRefineFn[];

  constructor(schema: T) {
    this.schema = schema;
    this.refinements = [];
    this["~standard"] = new PawStandardSchemaProps(this);
  }

  refine<U>(fn: PawRefineFn<U>): PawOptional<T> {
    this.refinements.push(fn);
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
    const refined = new PawRefinementPipeline(this.refinements, this.kind).run(input);
    if (!refined.ok) {
      return refined;
    }
    input = refined.value;

    if (input === undefined) {
      return new PawOk(input);
    }

    return this.schema.safeParse(input);
  }
}

const NULLABLE = "nullable" as const;
export class PawNullableParser<T extends PawSchema<string, any>> implements PawNullable<T> {
  public readonly kind = NULLABLE;
  public readonly "~standard": StandardSchemaV1.Props<unknown, ReturnType<T["parse"]> | null>;

  private readonly parser: T;
  private refinements: PawRefineFn[];

  constructor(parser: T) {
    this.parser = parser;
    this.refinements = [];
    this["~standard"] = new PawStandardSchemaProps(this);
  }

  optional(): PawOptional<PawNullable<T>> {
    return new PawOptionalParser(this);
  }

  refine<U>(fn: PawRefineFn<U>): PawNullable<T> {
    this.refinements.push(fn);
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
    const refined = new PawRefinementPipeline(this.refinements, this.kind).run(input);
    if (!refined.ok) {
      return refined;
    }
    input = refined.value;

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
  private refinements: PawRefineFn[];
  private checks: PawCheckFn<string>[];
  private mincfg?: { length: number; message?: string };
  private maxcfg?: { length: number; message?: string };

  constructor(message?: string) {
    this.message = message;
    this.checks = [];
    this.refinements = [];
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
    this.refinements.push(fn);
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
    const refined = new PawRefinementPipeline(this.refinements, this.kind).run(input);
    if (!refined.ok) {
      return refined;
    }
    input = refined.value;

    if (input === null || input === undefined) {
      const message = this.reqmessage ?? this.message ?? `Expected a string but received ${input}`;
      return new PawError(new PawRequiredIssue(message));
    }

    if (typeof input !== "string") {
      const message = this.message ?? `Expected a string but received ${typeof input}`;
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

    const checkResult = new PawCheckPipeline(this.checks, this.kind).run(input, input);
    if (!checkResult.ok) {
      return checkResult;
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
  private refinements: PawRefineFn[];
  private checks: PawCheckFn<number>[];

  constructor(message?: string) {
    this.message = message;
    this.checks = [];
    this.refinements = [];
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
    this.refinements.push(fn);
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
    const refined = new PawRefinementPipeline(this.refinements, this.kind).run(input);
    if (!refined.ok) {
      return refined;
    }
    input = refined.value;

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
        this.mincfg.message ??
        `Expected number to be greater than or equal to ${this.mincfg.value}`;
      return new PawError(new PawNumberIssue(message));
    }

    if (this.maxcfg && input > this.maxcfg.value) {
      const message =
        this.maxcfg.message ?? `Expected number to be less than or equal to ${this.maxcfg.value}`;
      return new PawError(new PawNumberIssue(message));
    }

    const checkResult = new PawCheckPipeline(this.checks, this.kind).run(input, input);
    if (!checkResult.ok) {
      return checkResult;
    }

    return new PawOk(input);
  }
}

const BIGINT = "bigint" as const;
class PawBigIntParser implements PawBigInt {
  public readonly kind = BIGINT;
  public readonly "~standard": StandardSchemaV1.Props<unknown, bigint>;

  private readonly message: string | undefined;
  private reqmessage: string | undefined;
  private mincfg: { value: bigint; message?: string } | undefined;
  private maxcfg: { value: bigint; message?: string } | undefined;
  private refinements: PawRefineFn[];
  private checks: PawCheckFn<bigint>[];

  constructor(message?: string) {
    this.message = message;
    this.checks = [];
    this.refinements = [];
    this["~standard"] = new PawStandardSchemaProps(this);
  }

  check(fn: PawCheckFn<bigint>): PawBigInt {
    this.checks.push(fn);
    return this;
  }

  min(value: bigint, message?: string): PawBigInt {
    this.mincfg = { value, message };
    return this;
  }

  max(value: bigint, message?: string): PawBigInt {
    this.maxcfg = { value, message };
    return this;
  }

  optional(): PawOptional<PawBigInt> {
    return new PawOptionalParser(this);
  }

  nullable(): PawNullable<PawBigInt> {
    return new PawNullableParser(this);
  }

  required(message: string): PawBigInt {
    this.reqmessage = message;
    return this;
  }

  refine<T>(fn: PawRefineFn<T>): PawBigInt {
    this.refinements.push(fn);
    return this;
  }

  transform<U>(fn: PawTransformFn<bigint, U>): PawTransform<U> {
    return new PawTransformParser(fn, this);
  }

  parse(input: unknown): bigint {
    const result = this.safeParse(input);
    if (!result.ok) {
      throw new PawParseError(result.error);
    }
    return result.value;
  }

  safeParse(input: unknown): PawResult<bigint, PawIssue> {
    const refined = new PawRefinementPipeline(this.refinements, this.kind).run(input);
    if (!refined.ok) {
      return refined;
    }
    input = refined.value;

    if (input === null || input === undefined) {
      const message = this.reqmessage ?? this.message ?? `Expected a bigint but received ${input}`;
      return new PawError(new PawRequiredIssue(message));
    }

    if (typeof input !== "bigint") {
      const message = this.message ?? `Expected a bigint but received ${typeof input}`;
      return new PawError(new PawBigIntIssue(message));
    }

    if (this.mincfg && input < this.mincfg.value) {
      const message =
        this.mincfg.message ??
        `Expected bigint to be greater than or equal to ${this.mincfg.value}`;
      return new PawError(new PawBigIntIssue(message));
    }

    if (this.maxcfg && input > this.maxcfg.value) {
      const message =
        this.maxcfg.message ?? `Expected bigint to be less than or equal to ${this.maxcfg.value}`;
      return new PawError(new PawBigIntIssue(message));
    }

    const checkResult = new PawCheckPipeline(this.checks, this.kind).run(input, input);
    if (!checkResult.ok) {
      return checkResult;
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
  private refinements: PawRefineFn[];
  private checks: PawCheckFn<boolean>[];

  constructor(message?: string) {
    this.message = message;
    this.checks = [];
    this.refinements = [];
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
    this.refinements.push(fn);
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
    const refined = new PawRefinementPipeline(this.refinements, this.kind).run(input);
    if (!refined.ok) {
      return refined;
    }
    input = refined.value;

    if (input === null || input === undefined) {
      const message = this.reqmessage ?? this.message ?? `Expected a boolean but received ${input}`;
      return new PawError(new PawRequiredIssue(message));
    }

    if (typeof input !== "boolean") {
      const message = this.message ?? `Expected a boolean but received ${typeof input}`;
      return new PawError(new PawBooleanIssue(message));
    }

    const checkResult = new PawCheckPipeline(this.checks, this.kind).run(input, input);
    if (!checkResult.ok) {
      return checkResult;
    }

    return new PawOk(input);
  }
}

const UNKNOWN = "unknown" as const;
class PawUnknownParser implements PawUnknown {
  public readonly kind = UNKNOWN;
  public readonly "~standard": StandardSchemaV1.Props<unknown, unknown>;

  private refinements: PawRefineFn[];
  private checks: PawCheckFn<unknown>[];

  constructor() {
    this.refinements = [];
    this.checks = [];
    this["~standard"] = new PawStandardSchemaProps(this);
  }

  check(fn: PawCheckFn<any>): PawUnknown {
    this.checks.push(fn);
    return this;
  }

  refine<T>(fn: PawRefineFn<T>): PawUnknown {
    this.refinements.push(fn);
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
    const refined = new PawRefinementPipeline(this.refinements, this.kind).run(input);
    if (!refined.ok) {
      return refined;
    }
    input = refined.value;

    const checkResult = new PawCheckPipeline(this.checks, this.kind).run(input, input);
    if (!checkResult.ok) {
      return checkResult;
    }

    return new PawOk(input);
  }
}

const ANY = "any" as const;
export class PawAnyParser implements PawAny {
  public readonly kind = ANY;
  public readonly "~standard": StandardSchemaV1.Props<unknown, any>;

  private refinements: PawRefineFn[];
  private checks: PawCheckFn<any>[];

  constructor() {
    this.refinements = [];
    this.checks = [];
    this["~standard"] = new PawStandardSchemaProps(this);
  }

  check(fn: PawCheckFn<any>): PawAny {
    this.checks.push(fn);
    return this;
  }

  refine<T>(fn: PawRefineFn<T>): PawAny {
    this.refinements.push(fn);
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
    const refined = new PawRefinementPipeline(this.refinements, this.kind).run(input);
    if (!refined.ok) {
      return refined;
    }
    input = refined.value;

    const checkResult = new PawCheckPipeline(this.checks, this.kind).run(input, input);
    if (!checkResult.ok) {
      return checkResult;
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
    const refined = new PawRefinementPipeline(this.refinements, this.kind).run(input);
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
        const message = this.message ?? `Item at index ${i} failed schema validation`;
        return new PawError(new PawArraySchemaIssue(message, [issue]));
      }
    }

    const output = arr.value as PawInfer<T>[];
    const checkResult = new PawCheckPipeline(this.checks, this.kind).run(input, output);
    if (!checkResult.ok) {
      return checkResult;
    }

    return new PawOk(output);
  }

  private safeParseRetained(input: unknown): PawResult<PawInfer<T>[], PawIssue> {
    const refined = new PawRefinementPipeline(this.refinements, this.kind).run(input);
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
    const checkResult = new PawCheckPipeline(this.checks, this.kind).run(input, output);
    if (!checkResult.ok) {
      return checkResult;
    }

    return new PawOk(output);
  }

  private parseArray(input: unknown): PawResult<any[], PawIssue> {
    if (input === null || input === undefined) {
      const message = this.reqmessage ?? this.message ?? `Expected an array but received ${input}`;
      return new PawError(new PawRequiredIssue(message));
    }

    if (!Array.isArray(input)) {
      const message = this.message ?? `Expected an array but received ${typeof input}`;
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
      const pathedIssues = this.setNestedIssuePath(result.error);
      return new PawError(pathedIssues);
    }
    return result;
  }

  private safeParseImmediate(input: unknown): PawResult<PawParsedObject<T>, PawIssue> {
    const refined = new PawRefinementPipeline(this.refinements, this.kind).run(input);
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

    const checkResult = new PawCheckPipeline(this.checks, this.kind).run(input, output);
    if (!checkResult.ok) {
      return checkResult;
    }

    return new PawOk(output);
  }

  private safeParseRetained(input: unknown): PawResult<PawParsedObject<T>, PawIssue> {
    const refined = new PawRefinementPipeline(this.refinements, this.kind).run(input);
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

    const checkResult = new PawCheckPipeline(this.checks, this.kind).run(input, output);
    if (!checkResult.ok) {
      return checkResult;
    }

    return new PawOk(output);
  }

  private parseObject(val: unknown): PawResult<Record<string, unknown>, PawIssue> {
    if (val === null || val === undefined) {
      const message = this.reqmessage ?? this.message ?? `Expected an object but received ${val}`;
      return new PawError(new PawRequiredIssue(message));
    }

    if (typeof val !== "object") {
      const message = this.message ?? `Expected an object but received ${typeof val}`;
      return new PawError(new PawObjectTypeIssue(message));
    }

    return new PawOk(val as Record<string, unknown>);
  }

  // TODO: maybe improve performance for super nested issues by removing recursion
  private setNestedIssuePath(issue: PawIssue, path: PawIssuePath = []): PawIssue {
    if (issue.kind === "object-schema") {
      for (let j = 0; j < issue.issues.length; j += 1) {
        const objIssue = issue.issues[j];
        const pathedIssue = this.setNestedIssuePath(objIssue.issue, path.concat(objIssue.field));
        Object.assign(objIssue, { issue: pathedIssue });
      }
    } else if (issue.kind === "array-schema") {
      for (let j = 0; j < issue.issues.length; j += 1) {
        const arrIssue = issue.issues[j];
        const pathedIssue = this.setNestedIssuePath(arrIssue.issue, path.concat(arrIssue.idx));
        Object.assign(arrIssue, { issue: pathedIssue });
      }
    }

    Object.assign(issue, { path });
    return issue;
  }

  private getFieldIssueMessage(key: string): string {
    return this.message ?? `Property '${key}' failed object schema validation`;
  }
}

const LITERAL = "literal" as const;
class PawLiteralParser<const T extends string | number | boolean> implements PawLiteral<T> {
  public readonly kind = LITERAL;
  public readonly "~standard": StandardSchemaV1.Props<unknown, T>;

  private readonly values: T[];
  private readonly message: string | undefined;
  private reqmessage: string | undefined;
  private refinements: PawRefineFn[];
  private checks: PawCheckFn<T>[];

  constructor(values: T[], message?: string) {
    this.values = values;
    this.message = message;
    this.refinements = [];
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
    this.refinements.push(fn);
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
    const refined = new PawRefinementPipeline(this.refinements, this.kind).run(input);
    if (!refined.ok) {
      return refined;
    }
    input = refined.value;

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

    const checkResult = new PawCheckPipeline(this.checks, this.kind).run(input, input as T);
    if (!checkResult.ok) {
      return checkResult;
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
  private refinements: PawRefineFn[];
  private checks: PawCheckFn<PawInfer<T[number]>>[];

  constructor(schemas: T, message?: string) {
    this.schemas = schemas;
    this.message = message;
    this.refinements = [];
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
    this.refinements.push(fn);
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
    const refined = new PawRefinementPipeline(this.refinements, this.kind).run(input);
    if (!refined.ok) {
      return refined;
    }
    input = refined.value;

    for (const schema of this.schemas) {
      const parsed = schema.safeParse(input);
      if (parsed.ok) {
        const checkResult = new PawCheckPipeline(this.checks, this.kind).run(input, parsed.value);
        if (!checkResult.ok) {
          return checkResult;
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

/**
 * Create a new string schema parsing.
 * @param message Use this param to define a custom error message.
 * @example
 * const Schema = paw.string();
 *
 * expect(Schema.parse("test")).toBe("test");
 * expect(Schema.safeParse(2)).toMatchObject({
 *   ok: false,
 *   error: {
 *     kind: "string",
 *     message: "Expected a string but received number"
 *   }
 * });
 */
export function string(message?: string): PawString {
  return new PawStringParser(message);
}

/**
 * Create a new number schema parsing.
 * @param message Use this param to define a custom error message.
 * @example
 * const Schema = paw.number();
 *
 * expect(Schema.parse(2)).toBe(2);
 * expect(Schema.safeParse("test")).toMatchObject({
 *   ok: false,
 *   error: {
 *     kind: "string",
 *     message: "Expected a number but received string"
 *   }
 * });
 */
export function number(message?: string): PawNumber {
  return new PawNumberParser(message);
}

/**
 * Create a new bigint schema parsing.
 * @example
 * const Schema = paw.bigint();
 *
 * expect(Schema.parse(2n)).toBe(2n);
 * expect(Schema.safeParse(2)).toMatchObject({
 *   ok: false,
 *   error: {
 *     kind: "bigint",
 *     message: "Expected a bigint but received number"
 *   }
 * });
 */
export function bigint(message?: string): PawBigInt {
  return new PawBigIntParser(message);
}

/**
 * Create a new boolean schema parsing.
 * @param message Use this param to define a custom error message.
 * @example
 * const Schema = paw.boolean();
 *
 * expect(Schema.parse(true)).toBe(true);
 * expect(Schema.safeParse(1)).toMatchObject({
 *   ok: false,
 *   error: {
 *     kind: "boolean",
 *     message: "Expected a boolean but received number"
 *   }
 * });
 */
export function boolean(message?: string): PawBoolean {
  return new PawBooleanParser(message);
}

/**
 * Create a new unknown schema parsing.
 * @example
 * const Schema = paw.unknown();
 *
 * expect(Schema.parse(2)).toBe(2);
 * expect(Schema.parse("test")).toBe("test");
 */
export function unknown(): PawUnknown {
  return new PawUnknownParser();
}

/**
 * Create a new any schema parsing.
 * @example
 * const Schema = paw.any();
 *
 * expect(Schema.parse(2)).toBe(2);
 * expect(Schema.parse("test")).toBe("test");
 */
export function any(): PawAny {
  return new PawAnyParser();
}

/**
 * Create a new array schema parsing.
 * @example
 * const Schema = paw.array(paw.number());
 *
 * expect(Schema.parse([1, 2, 3])).toStrictEqual([1, 2, 3]);
 * expect(Schema.safeParse("test")).toMatchObject({
 *   ok: false,
 *   error: {
 *     kind: "array-type",
 *     message: "Expected an array but received string"
 *   }
 * });
 */
export function array<T extends PawType>(unit: T, message?: string): PawArray<T> {
  return new PawArrayParser(unit, message);
}

/**
 * Create a new object schema parsing.
 * @example
 * const Schema = paw.object({ name: paw.string() });
 *
 * expect(Schema.parse({ name: "test" })).toStrictEqual({ name: "test" });
 * expect(Schema.safeParse("test")).toMatchObject({
 *   ok: false,
 *   error: {
 *     kind: "object-type",
 *     message: "Expected an object but received string"
 *   }
 * });
 */
export function object<T extends Record<string, PawType>>(
  fields: T,
  message?: string,
): PawObject<T> {
  return new PawObjectParser(fields, message);
}

/**
 * Create a new literal schema parsing.
 * @example
 * const Schema = paw.literal(["cat", "dog"]);
 *
 * expect(Schema.parse("cat")).toBe("cat");
 * expect(Schema.safeParse("test")).toMatchObject({
 *   ok: false,
 *   error: {
 *     kind: "literal",
 *     message: "Expected one of the following values: cat, dog"
 *   }
 * });
 */
export function literal<const T extends string | number | boolean>(
  values: T[],
  message?: string,
): PawLiteral<T> {
  return new PawLiteralParser(values, message);
}

/**
 * Create a new union schema parsing.
 * @example
 * const Schema = paw.union([paw.string(), paw.number()]);
 *
 * expect(Schema.parse("cat")).toBe("cat");
 * expect(Schema.parse(2)).toBe(2);
 * expect(Schema.safeParse(true)).toMatchObject({
 *   ok: false,
 *   error: {
 *     kind: "union",
 *     message: "Value does not match any of the union variants"
 *   }
 * });
 */
export function union<T extends Array<PawSchema<any, any>>>(
  schemas: T,
  message?: string,
): PawUnion<T> {
  return new PawUnionParser(schemas, message);
}
