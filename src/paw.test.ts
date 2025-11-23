import { describe, test, expect } from "vitest";
import * as paw from "./paw";
import { PawOk, PawError } from "./result";
import {
  PawCheckIssue,
  PawObjectSchemaIssue,
  PawRefineIssue,
  PawRequiredIssue,
  PawTransformIssue,
} from "./issue";

describe("paw", () => {
  describe("string", () => {
    test("string parser works", () => {
      const str = paw.string();

      expect(str.parse("test")).toStrictEqual("test");
      expect(!str.safeParse(null).ok, "null is not a string").toBeTruthy();
      expect(!str.safeParse(2).ok, "2 is not a string").toBeTruthy();
      expect(!str.safeParse({}).ok, "object is not a string").toBeTruthy();
    });

    test("string parse error returns correct string error", () => {
      const str = paw.string("invalid string");
      const result = str.safeParse(2);
      expect(!result.ok, "2 is not a string").toBeTruthy();

      const error = PawError.unwrap(result);
      expect(error).toMatchObject({
        kind: "string",
        message: "invalid string",
      });
    });

    test("string refine works", () => {
      const str = paw
        .string()
        .refine((ctx) =>
          typeof ctx.input === "number" ? ctx.ok(ctx.input.toString()) : ctx.ok(ctx.input),
        );

      expect(str.parse("test")).toStrictEqual("test");
      expect(str.parse(2), "refined to string").toStrictEqual("2");
      expect(!str.safeParse(true).ok, "true is not a string").toBeTruthy();
    });

    test("string check works", () => {
      const checkmsg = "invalid pattern";
      const str = paw
        .string()
        .check((ctx) => (ctx.output.includes("/") ? ctx.ok() : ctx.error(checkmsg)));
      let result = str.safeParse("me/nina");
      expect(result.ok).toBeTruthy();

      result = str.safeParse("test");
      const error = PawError.unwrap(result);
      expect(error).toStrictEqual(new PawCheckIssue(checkmsg, "string"));
    });

    test("string transform works", () => {
      const Schema = paw.string().transform((ctx) => ctx.ok(Number(ctx.output)));
      const result = Schema.safeParse("2");
      expect(result.ok).toBeTruthy();
      const value = PawOk.unwrap(result);
      expect(value).toStrictEqual(2);
    });

    test("string min works", () => {
      const msg = "cannot have less than 3 characters";
      const str = paw.string().min(3, msg);
      const result = str.safeParse("12");

      expect(result.ok).toBeFalsy();
      expect(PawError.unwrap(result)).toMatchObject({
        kind: "string",
        message: msg,
      });
    });

    test("string max works", () => {
      const msg = "cannot have more than 3 characters";
      const str = paw.string().max(3, msg);
      const result = str.safeParse("1234");

      expect(result.ok).toBeFalsy();
      expect(PawError.unwrap(result)).toMatchObject({
        kind: "string",
        message: msg,
      });
    });
  });

  describe("number", () => {
    test("number parser works", () => {
      const num = paw.number();

      expect(num.parse(2)).toStrictEqual(2);
      expect(PawOk.unwrap(num.safeParse(2))).toStrictEqual(2);
      expect(!num.safeParse(null).ok, "null is not a number").toBeTruthy();
      expect(!num.safeParse("test").ok, "test it not a number").toBeTruthy();
      expect(!num.safeParse({}).ok, "object is not a number").toBeTruthy();
    });

    test("number parse error returns  correct number error", () => {
      const num = paw.number("invalid number");
      const result = num.safeParse("test");
      expect(!result.ok, "test is not a number").toBeTruthy();

      const error = PawError.unwrap(result);
      expect(error).toMatchObject({
        kind: "number",
        message: "invalid number",
      });
    });

    test("number min works", () => {
      const num = paw.number().min(10);

      expect(num.parse(12)).toStrictEqual(12);
      expect(num.parse(10.1)).toStrictEqual(10.1);
      expect(!num.safeParse(9).ok, "9 is less than 10").toBeTruthy();
      expect(!num.safeParse(9.9).ok, "9.9 is less than 10").toBeTruthy();
      expect(!num.safeParse("test").ok, "test is not a number").toBeTruthy();
    });

    test("number max works", () => {
      const num = paw.number().max(10);

      expect(num.parse(9)).toStrictEqual(9);
      expect(num.parse(9.9)).toStrictEqual(9.9);
      expect(!num.safeParse(11).ok, "11 is bigger than 10").toBeTruthy();
      expect(!num.safeParse(10.1).ok, "10.1 is bigger than 10").toBeTruthy();
      expect(!num.safeParse("test").ok, "test is not a number").toBeTruthy();
    });

    test("number refine works", () => {
      const num = paw.number().refine((ctx) => {
        if (ctx.input == null) {
          return ctx.ok(ctx.input);
        }
        const num = Number(ctx.input);
        return ctx.ok(Number.isNaN(num) ? ctx.input : num);
      });

      expect(num.parse("12")).toStrictEqual(12);
      expect(num.parse("1.32")).toStrictEqual(1.32);
      expect(!num.safeParse("false").ok, "false cannot be converted to number").toBeTruthy();
      expect(!num.safeParse(null).ok, "null cannot be converted to number").toBeTruthy();
      expect(!num.safeParse({}).ok, "object cannot be converted to number").toBeTruthy();
    });

    test("number int works", () => {
      const num = paw.number().int();

      expect(num.parse(10)).toStrictEqual(10);
      expect(!num.safeParse(10.1).ok, "10.1 is not an int").toBeTruthy();
      expect(!num.safeParse("test").ok, "test is not an int").toBeTruthy();
    });

    test("number check works", () => {
      const checkmsg = "not a minor age";
      const num = paw.number().check((ctx) => (ctx.output < 18 ? ctx.ok() : ctx.error(checkmsg)));
      let result = num.safeParse(12);
      expect(result.ok).toBeTruthy();

      result = num.safeParse(22);
      expect(!result.ok).toBeTruthy();
      const error = PawError.unwrap(result);
      expect(error).toStrictEqual(new PawCheckIssue(checkmsg, "number"));
    });

    test("number transform works", () => {
      const Schema = paw.number().transform((ctx) => ctx.ok(ctx.output.toString()));
      const result = Schema.safeParse(2);
      expect(result.ok).toBeTruthy();
      const value = PawOk.unwrap(result);
      expect(value).toStrictEqual("2");
    });
  });

  describe("boolean", () => {
    test("boolean parser works", () => {
      const bool = paw.boolean();

      expect(bool.parse(true)).toStrictEqual(true);
      expect(bool.parse(false)).toStrictEqual(false);
      expect(!bool.safeParse("test").ok, "test is not a boolean").toBeTruthy();
      expect(!bool.safeParse(null).ok, "null is not a boolean").toBeTruthy();
      expect(!bool.safeParse({}).ok, "object is not a boolean").toBeTruthy();
    });

    test("boolean parse error returns boolean error", () => {
      const bool = paw.boolean("invalid boolean");
      const result = bool.safeParse("test");
      expect(!result.ok, "test is not a boolean").toBeTruthy();

      const error = PawError.unwrap(result);
      expect(error).toMatchObject({
        kind: "boolean",
        message: "invalid boolean",
      });
    });

    test("boolean refine works", () => {
      const bool = paw.boolean().refine((ctx) => ctx.ok(!!ctx.input));

      expect(bool.parse(true)).toStrictEqual(true);
      expect(bool.parse(false)).toStrictEqual(false);
      expect(bool.parse("test"), "refined to trueish").toStrictEqual(true);
    });

    test("boolean check works", () => {
      const checkmsg = "boolean should be true";
      const bool = paw.boolean().check((ctx) => (ctx.output ? ctx.ok() : ctx.error(checkmsg)));
      let result = bool.safeParse(true);
      expect(result.ok).toBeTruthy();

      result = bool.safeParse(false);
      expect(!result.ok).toBeTruthy();
      const error = PawError.unwrap(result);
      expect(error).toStrictEqual(new PawCheckIssue(checkmsg, "boolean"));
    });

    test("boolean transform works", () => {
      const Schema = paw.boolean().transform((ctx) => ctx.ok(ctx.output.toString()));
      const result = Schema.safeParse(true);
      expect(result.ok).toBeTruthy();
      const value = PawOk.unwrap(result);
      expect(value).toStrictEqual("true");
    });
  });

  test("optional parser works", () => {
    const optstr = paw.string().optional();

    expect(optstr.parse("test")).toStrictEqual("test");
    expect(optstr.safeParse(null).ok).toBeFalsy();
    expect(optstr.parse(undefined)).toStrictEqual(undefined);
  });

  test("nullable parser works", () => {
    const nullablestr = paw.string().nullable();

    expect(nullablestr.parse("test")).toStrictEqual("test");
    expect(nullablestr.safeParse(undefined).ok).toBeFalsy();
    expect(nullablestr.parse(null)).toStrictEqual(null);
  });

  test("optional parse error forwards error", () => {
    const optstr = paw.string("invalid string").optional();
    const result = optstr.safeParse(2);
    expect(!result.ok, "2 is not an optional string");

    const error = PawError.unwrap(result);
    expect(error).toMatchObject({
      kind: "string",
      message: "invalid string",
    });
  });

  test("optional refine works", () => {
    const optstr = paw
      .string()
      .refine((ctx) =>
        typeof ctx.input === "number" ? ctx.ok(ctx.input.toString()) : ctx.ok(ctx.input),
      )
      .optional();

    expect(optstr.parse("test")).toStrictEqual("test");
    expect(optstr.parse(2)).toStrictEqual("2");
    expect(optstr.parse(undefined)).toStrictEqual(undefined);
    expect(optstr.safeParse(null).ok).toBeFalsy();
    expect(!optstr.safeParse(true).ok, "true is not a optional string");
  });

  test("array immediate parser works", () => {
    const strarr = paw.array(paw.string()).immediate();

    expect(strarr.parse(["test"])).toMatchObject(["test"]);
    expect(strarr.parse([])).toMatchObject([]);
    expect(strarr.parse(["nina", "cat", "pet"])).toMatchObject(["nina", "cat", "pet"]);
    expect(!strarr.safeParse([2]).ok, "arr includes non string value").toBeTruthy();
    expect(!strarr.safeParse({}).ok, "value is not an array").toBeTruthy();
  });

  test("array retained parser works", () => {
    const strarr = paw.array(paw.string());

    expect(strarr.parse(["test"])).toMatchObject(["test"]);
    expect(strarr.parse([])).toMatchObject([]);
    expect(strarr.parse(["nina", "cat", "pet"])).toMatchObject(["nina", "cat", "pet"]);
    expect(!strarr.safeParse([2]).ok, "arr includes non string value").toBeTruthy();
    expect(!strarr.safeParse({}).ok, "value is not an array").toBeTruthy();
  });

  test("array immediate check works", () => {
    const checkmsg = "first should be nina";
    const arr = paw
      .array(paw.string())
      .check((ctx) => (ctx.output[0] === "nina" ? ctx.ok() : ctx.error(checkmsg)))
      .immediate();

    let result = arr.safeParse(["nina"]);
    expect(result.ok).toBeTruthy();

    result = arr.safeParse(["test", "nina"]);
    expect(!result.ok).toBeTruthy();
    const error = PawError.unwrap(result);
    expect(error).toStrictEqual(new PawCheckIssue(checkmsg, "array"));
  });

  test("array retained check works", () => {
    const checkmsg = "first should be nina";
    const arr = paw
      .array(paw.string())
      .check((ctx) => (ctx.output[0] === "nina" ? ctx.ok() : ctx.error(checkmsg)));

    let result = arr.safeParse(["nina"]);
    expect(result.ok).toBeTruthy();

    result = arr.safeParse(["test", "nina"]);
    expect(!result.ok).toBeTruthy();
    const error = PawError.unwrap(result);
    expect(error).toStrictEqual(new PawCheckIssue(checkmsg, "array"));
  });

  test("array immediate parse error returns array type error", () => {
    const strarr = paw.array(paw.string(), "expected array").immediate();
    const result = strarr.safeParse("test");
    expect(!result.ok, "test is not an array").toBeTruthy();

    const error = PawError.unwrap(result);
    expect(error).toMatchObject({
      kind: "array-type",
      message: "expected array",
    });
  });

  test("array retained parse error returns array type error", () => {
    const strarr = paw.array(paw.string(), "expected array");
    const result = strarr.safeParse("test");
    expect(!result.ok, "test is not an array").toBeTruthy();

    const error = PawError.unwrap(result);
    expect(error).toMatchObject({
      kind: "array-type",
      message: "expected array",
    });
  });

  test("array retained parse error returns array idx error", () => {
    const strarr = paw.array(paw.string("expected string"));
    let result = strarr.safeParse(["test", 2]);
    expect(!result.ok, "array includes a non string value");

    let error = PawError.unwrap(result);
    expect(error).toMatchObject({
      kind: "array-schema",
      issues: [
        {
          idx: 1,
          issue: {
            kind: "string",
            message: "expected string",
          },
        },
      ],
    });

    result = strarr.safeParse([1, 2]);
    error = PawError.unwrap(result);
    expect(error).toMatchObject({
      kind: "array-schema",
      issues: [
        {
          idx: 0,
          issue: {
            kind: "string",
            message: "expected string",
          },
        },
        {
          idx: 1,
          issue: {
            kind: "string",
            message: "expected string",
          },
        },
      ],
    });
  });

  test("array min works", () => {
    const strarr = paw.array(paw.string()).min(1);

    expect(strarr.parse(["test"])).toMatchObject(["test"]);
    expect(!strarr.safeParse([]).ok, "arr length less than min").toBeTruthy();
    expect(!strarr.safeParse([2]).ok, "arr includes non string value").toBeTruthy();
    expect(!strarr.safeParse({}).ok, "value is not an array").toBeTruthy();
  });

  test("array max works", () => {
    const strarr = paw.array(paw.string()).max(2);

    expect(strarr.parse(["test"])).toMatchObject(["test"]);
    expect(!strarr.safeParse(["a", "b", "c"]).ok, "arr length bigger than max").toBeTruthy();
    expect(!strarr.safeParse([2]).ok, "arr includes non string value").toBeTruthy();
    expect(!strarr.safeParse({}).ok, "value is not an array").toBeTruthy();
  });

  test("array optional works", () => {
    const strarr = paw.array(paw.string()).optional();

    expect(strarr.parse(["test"])).toMatchObject(["test"]);
    expect(strarr.parse(undefined)).toStrictEqual(undefined);
    expect(strarr.safeParse(null).ok).toBeFalsy();
    expect(!strarr.safeParse([2]).ok, "arr includes non string value").toBeTruthy();
    expect(!strarr.safeParse({}).ok, "value is not an array").toBeTruthy();
  });

  test("array refine works", () => {
    const strarr = paw
      .array(paw.string())
      .refine((ctx) => (typeof ctx.input === "string" ? ctx.ok([ctx.input]) : ctx.ok(ctx.input)));

    expect(strarr.parse("test")).toMatchObject(["test"]);
    expect(!strarr.safeParse(2).ok, "value is not an array").toBeTruthy();
    expect(!strarr.safeParse([2]).ok, "arr includes non string value").toBeTruthy();
    expect(!strarr.safeParse({}).ok, "value is not an array").toBeTruthy();
  });

  test("array transform works", () => {
    const Schema = paw.array(paw.string()).transform((ctx) => ctx.ok(ctx.output[0]));
    const result = Schema.safeParse(["test"]);
    expect(result.ok).toBeTruthy();
    const value = PawOk.unwrap(result);
    expect(value).toStrictEqual("test");
  });

  test("retained object parse works", () => {
    const obj = paw.object({ name: paw.string() });

    expect(obj.parse({ name: "test" })).toMatchObject({ name: "test" });
    expect(!obj.safeParse("test").ok, "value is not a valid object").toBeTruthy();
    expect(!obj.safeParse(null).ok, "null is not a valid object").toBeTruthy();
  });

  test("extended object parse works", () => {
    const message = "invalid extended schema object";
    const Schema = paw.object({ name: paw.string() });
    const ExtendedSchema = Schema.extend(
      { lastname: paw.string().required("missing lastname") },
      message,
    );

    let result = ExtendedSchema.safeParse({ name: "test" });
    expect(result.ok, "value should not match extended schema").toBeFalsy();
    expect(PawError.unwrap(result)).toMatchObject(
      new PawObjectSchemaIssue(message, [
        {
          field: "lastname",
          issue: new PawRequiredIssue("missing lastname"),
        },
      ]),
    );

    result = ExtendedSchema.safeParse({ name: "firstname", lastname: "lastname" });
    expect(result.ok, "value should match extended schema").toBeTruthy();
    expect(PawOk.unwrap(result)).toStrictEqual({
      name: "firstname",
      lastname: "lastname",
    });
  });

  test("object extend allow overwriting field schema", () => {
    const Schema = paw.object({ age: paw.string() });
    const ExtendedSchema = Schema.extend({ age: paw.number() });
    const value = { age: 18 };
    const result = ExtendedSchema.safeParse(value);

    expect(result.ok, "value should be valid extended schema").toBeTruthy();
    expect(PawOk.unwrap(result)).toStrictEqual(value);
  });

  test("immediate object parse error returns object type error", () => {
    const obj = paw.object({ name: paw.string() }).immediate();
    const result = obj.safeParse("test");
    expect(!result.ok, "test is not an object").toBeTruthy();

    const error = PawError.unwrap(result);
    expect(error.kind).toStrictEqual("object-type");
  });

  test("immediate object parse error returns object schema error", () => {
    const obj = paw.object({ name: paw.string("name error") }).immediate();
    const result = obj.safeParse({ name: 2 });
    expect(!result.ok, "name property is not a string").toBeTruthy();

    const error = PawError.unwrap(result);
    expect(error.kind).toStrictEqual("object-schema");
    const issues = error.kind === "object-schema" ? error.issues : undefined;
    expect(issues).toMatchObject([
      {
        field: "name",
        issue: {
          kind: "string",
          message: "name error",
        },
      },
    ]);
  });

  test("retained object parse error returns object schema error", () => {
    const obj = paw.object({
      name: paw.string("name error"),
      age: paw.number("age error").required("age required"),
    });
    let result = obj.safeParse({ name: "test", age: 18 });
    expect(result.ok).toBeTruthy();

    result = obj.safeParse({ name: 2 });
    expect(!result.ok).toBeTruthy();
    expect(PawError.unwrap(result)).toMatchObject({
      kind: "object-schema",
      message: expect.any(String),
      issues: [
        {
          field: "name",
          issue: {
            kind: "string",
            message: "name error",
          },
        },
        {
          field: "age",
          issue: {
            kind: "required",
            message: "age required",
          },
        },
      ],
    });
  });

  test("immediate object parse with nested object work", () => {
    const obj = paw
      .object(
        {
          name: paw.string("name error"),
          traits: paw.object(
            {
              height: paw.number("height error").required("height required"),
            },
            "invalid traits",
          ),
        },
        "invalid object",
      )
      .immediate();

    const result = obj.safeParse({ name: 2, traits: {} });
    expect(!result.ok).toBeTruthy();
    expect(PawError.unwrap(result)).toMatchObject({
      kind: "object-schema",
      message: "invalid object",
      issues: [
        {
          field: "name",
          issue: {
            kind: "string",
            message: "name error",
          },
        },
      ],
    });
  });

  test("retained object parse with nested object work", () => {
    const obj = paw.object(
      {
        name: paw.string("name error"),
        traits: paw.object(
          {
            height: paw.number("height error").required("height required"),
          },
          "invalid traits",
        ),
      },
      "invalid object",
    );

    const result = obj.safeParse({ name: 2, traits: {} });
    expect(!result.ok).toBeTruthy();
    expect(PawError.unwrap(result)).toMatchObject({
      kind: "object-schema",
      message: "invalid object",
      issues: [
        {
          field: "name",
          issue: {
            kind: "string",
            message: "name error",
          },
        },
        {
          field: "traits",
          issue: {
            kind: "object-schema",
            message: "invalid traits",
            issues: [
              {
                field: "height",
                issue: {
                  kind: "required",
                  message: "height required",
                },
              },
            ],
          },
        },
      ],
    });
  });

  test("retained object parse with nested object and pathed works", () => {
    const obj = paw
      .object(
        {
          name: paw.string("name error"),
          traits: paw.object(
            {
              height: paw.number("height error").required("height required"),
            },
            "invalid traits",
          ),
        },
        "invalid object",
      )
      .pathed();

    const result = obj.safeParse({ name: 2, traits: {} });
    expect(!result.ok).toBeTruthy();
    expect(PawError.unwrap(result)).toMatchObject({
      kind: "object-schema",
      message: "invalid object",
      issues: [
        {
          field: "name",
          issue: {
            kind: "string",
            message: "name error",
            path: ["name"],
          },
        },
        {
          field: "traits",
          issue: {
            kind: "object-schema",
            message: "invalid traits",
            path: ["traits"],
            issues: [
              {
                field: "height",
                issue: {
                  kind: "required",
                  message: "height required",
                  path: ["traits", "height"],
                },
              },
            ],
          },
        },
      ],
    });
  });

  test("immediate object parse check works", () => {
    const checkmsg = "name and lastname should be different";
    const obj = paw
      .object({ name: paw.string(), lastname: paw.string() })
      .check((ctx) => (ctx.output.name !== ctx.output.lastname ? ctx.ok() : ctx.error(checkmsg)))
      .immediate();

    let result = obj.safeParse({ name: "nina", lastname: "maria" });
    expect(result.ok).toBeTruthy();

    result = obj.safeParse({ name: "nina", lastname: "nina" });
    expect(!result.ok).toBeTruthy();
    const error = PawError.unwrap(result);
    expect(error).toStrictEqual(new PawCheckIssue(checkmsg, "object"));
  });

  test("retained object parse check works", () => {
    const checkmsg = "name and lastname should be different";
    const obj = paw
      .object({ name: paw.string(), lastname: paw.string() })
      .check((ctx) => (ctx.output.name !== ctx.output.lastname ? ctx.ok() : ctx.error(checkmsg)));

    let result = obj.safeParse({ name: "nina", lastname: "maria" });
    expect(result.ok).toBeTruthy();

    result = obj.safeParse({ name: "nina", lastname: "nina" });
    expect(!result.ok).toBeTruthy();
    const error = PawError.unwrap(result);
    expect(error).toStrictEqual(new PawCheckIssue(checkmsg, "object"));
  });

  test("object transform works", () => {
    const Schema = paw.object({ name: paw.string() }).transform((ctx) => ctx.ok(ctx.output.name));
    const result = Schema.safeParse({ name: "test" });
    expect(result.ok).toBeTruthy();
    const value = PawOk.unwrap(result);
    expect(value).toStrictEqual("test");
  });

  test("object strict works", () => {
    const nonstrict = paw.object({ name: paw.string() });
    const nonstrictResult = nonstrict.safeParse({ name: "string", age: 2 });
    expect(nonstrictResult.ok).toBeTruthy();
    expect(PawOk.unwrap(nonstrictResult)).toStrictEqual({ name: "string", age: 2 });

    const strict = paw.object({ name: paw.string() }).strict();
    const strictResult = strict.safeParse({ name: "string", age: 2 });
    expect(strictResult.ok).toBeTruthy();
    expect(PawOk.unwrap(strictResult)).toStrictEqual({ name: "string" });
  });

  test("non strict parsing keeps reference to original object", () => {
    const src = { name: "Nina", age: 7 };
    const PetSchema = paw.object({ name: paw.string(), age: paw.number().int().min(0) });
    const result = PetSchema.safeParse(src);
    expect(result.ok).toBeTruthy();
    expect(PawOk.unwrap(result)).toStrictEqual(src);
    expect(PawOk.unwrap(result) === src).toBeTruthy();
  });

  test("literal parser works", () => {
    const animals = paw.literal(["cat", "dog"]);
    expect(animals.parse("cat")).toStrictEqual("cat");
    expect(animals.parse("dog")).toStrictEqual("dog");
    expect(!animals.safeParse("beer").ok, "beer is not a valid animal").toBeTruthy();

    const nameOrAge = paw.literal(["maria", "carlito", 21]);
    expect(nameOrAge.parse("maria")).toStrictEqual("maria");
    expect(nameOrAge.parse("carlito")).toStrictEqual("carlito");
    expect(nameOrAge.parse(21)).toStrictEqual(21);
    expect(!nameOrAge.safeParse("john").ok).toBeTruthy();
  });

  test("literal parse error returns a literal error ", () => {
    const animals = paw.literal(["cat", "dog"]);
    const result = animals.safeParse("beer");
    expect(!result.ok, "beer is not a valid animal").toBeTruthy();

    const error = PawError.unwrap(result);
    expect(error.kind).toStrictEqual("literal");
  });

  test("literal check works", () => {
    const checkmsg = "not a domestic animal";
    const domestic = ["cat"];
    const animals = paw
      .literal(["cat", "tiger"])
      .check((ctx) => (domestic.includes(ctx.output) ? ctx.ok() : ctx.error(checkmsg)));
    let result = animals.safeParse("cat");
    expect(result.ok).toBeTruthy();

    result = animals.safeParse("tiger");
    expect(!result.ok).toBeTruthy();
    const error = PawError.unwrap(result);
    expect(error).toStrictEqual(new PawCheckIssue(checkmsg, "literal"));
  });

  test("literal transform works", () => {
    const schema = paw.literal(["cat", "dog"], "not a domestic animal").transform((ctx) => {
      switch (ctx.output) {
        case "cat":
          return ctx.ok(1);
        case "dog":
          return ctx.ok(2);
      }
    });
    let result = schema.safeParse("cat");
    expect(result.ok).toBeTruthy();
    expect(PawOk.unwrap(result)).toStrictEqual(1);

    result = schema.safeParse("tiger");
    expect(!result.ok).toBeTruthy();
    expect(PawError.unwrap(result)).toMatchObject({
      kind: "literal",
      message: "not a domestic animal",
    });
  });

  describe("union", () => {
    test("union with primitive types works", () => {
      const union = paw.union([paw.string(), paw.number()]);
      const result = union.safeParse("test");
      expect(result.ok).toBeTruthy();
      expect(PawOk.unwrap(result) === "test").toBeTruthy();
    });

    test("union with complex objects works", () => {
      const dog = paw.object({
        name: paw.string(),
        sound: paw.literal(["woof"]),
      });
      const cat = paw.object({
        name: paw.string(),
        sound: paw.literal(["meow"]),
      });
      const union = paw.union([dog, cat]);

      const result = union.safeParse({
        name: "nina",
        sound: "meow",
      });
      expect(result.ok).toBeTruthy();

      const nina = PawOk.unwrap(result);
      expect(nina.name).toStrictEqual("nina");
      expect(nina.sound).toStrictEqual("meow");
    });

    test("union with refine works", () => {
      const schema = paw
        .union([paw.boolean(), paw.literal(["true", "false"])])
        .refine((ctx) => (typeof ctx.input === "number" ? ctx.ok(ctx.input > 0) : ctx.ok(false)));

      const result = schema.safeParse(1);
      expect(result.ok).toBeTruthy();
      expect(PawOk.unwrap(result)).toStrictEqual(true);
    });

    test("union check works", () => {
      const checkmsg = "if string then should be nina";
      const union = paw.union([paw.string().optional(), paw.number()]).check((ctx) => {
        return typeof ctx.output === "string" && ctx.output === "nina"
          ? ctx.ok()
          : ctx.error(checkmsg);
      });
      let result = union.safeParse("nina");
      expect(result.ok, "nina should satisfy union and check constraint").toBeTruthy();

      result = union.safeParse("test");
      expect(!result.ok, "test should fail check constraint").toBeTruthy();
      const error = PawError.unwrap(result);
      expect(error).toStrictEqual(new PawCheckIssue(checkmsg, "union"));
    });

    test("union transform works", () => {
      const Schema = paw
        .union([paw.boolean(), paw.number()], "invalid value")
        .transform((ctx) => ctx.ok(ctx.output.toString()));
      let result = Schema.safeParse(true);
      expect(result.ok).toBeTruthy();
      expect(PawOk.unwrap(result)).toStrictEqual("true");

      result = Schema.safeParse({});
      expect(!result.ok).toBeTruthy();
      expect(PawError.unwrap(result)).toMatchObject({
        kind: "union",
        message: "invalid value",
      });
    });
  });

  test("chain of transforms works", () => {
    const Schema = paw
      .number("invalid number")
      .transform((ctx) => ctx.ok(ctx.output.toString()))
      .transform((ctx) => ctx.ok(Number(ctx.output)))
      .transform((ctx) => ctx.ok(Boolean(ctx.output)));
    let result = Schema.safeParse(2);
    expect(result.ok).toBeTruthy();
    expect(PawOk.unwrap(result)).toStrictEqual(true);

    result = Schema.safeParse({});
    expect(!result.ok).toBeTruthy();
    expect(PawError.unwrap(result)).toMatchObject({
      kind: "number",
      message: "invalid number",
    });
  });

  test("transform is able to return an issue", () => {
    const errmsg = "Expected string to be parsable to number";
    const Schema = paw.string().transform((ctx) => {
      const n = Number(ctx.output);
      if (Number.isNaN(n)) {
        return ctx.error(errmsg);
      }
      return ctx.ok(n);
    });

    let result = Schema.safeParse("2");
    expect(result.ok).toBeTruthy();
    expect(PawOk.unwrap(result)).toStrictEqual(2);

    result = Schema.safeParse("abc");
    expect(result.ok).toBeFalsy();
    expect(PawError.unwrap(result)).toStrictEqual(new PawTransformIssue(errmsg, "string"));
  });

  test("transform chain stops at the first issue", () => {
    const strErrorMessage = "Expected string to be parsable to number";
    const boolErrorMessage = "Expected either 0 or 1";
    const Schema = paw
      .string()
      .transform((ctx) => {
        const n = Number(ctx.output);
        if (Number.isNaN(n)) {
          return ctx.error(strErrorMessage);
        }
        return ctx.ok(n);
      })
      .transform((ctx) => {
        switch (ctx.output) {
          case 0:
            return ctx.ok(false);
          case 1:
            return ctx.ok(true);
          default:
            return ctx.error(boolErrorMessage);
        }
      });

    let result = Schema.safeParse("1");
    expect(result.ok).toBeTruthy();
    expect(PawOk.unwrap(result)).toStrictEqual(true);

    result = Schema.safeParse("0");
    expect(result.ok).toBeTruthy();
    expect(PawOk.unwrap(result)).toStrictEqual(false);

    result = Schema.safeParse("abc");
    expect(result.ok).toBeFalsy();
    expect(PawError.unwrap(result)).toStrictEqual(new PawTransformIssue(strErrorMessage, "string"));

    result = Schema.safeParse("2");
    expect(result.ok).toBeFalsy();
    expect(PawError.unwrap(result)).toStrictEqual(
      new PawTransformIssue(boolErrorMessage, "string"),
    );
  });

  test("refine issue works", () => {
    const refinemsg = "Could not convert string into number";
    const Schema = paw.number().refine((ctx) => {
      if (typeof ctx.input === "number" && !Number.isNaN(ctx.input)) return ctx.ok(ctx.input);
      const n = Number(ctx.input);
      return Number.isNaN(n) ? ctx.error(refinemsg) : ctx.ok(n);
    });

    expect(Schema.parse(2)).toStrictEqual(2);
    expect(Schema.parse("2")).toStrictEqual(2);
    expect(Schema.safeParse("nan")).toStrictEqual(
      new PawError(new PawRefineIssue(refinemsg, "number")),
    );
  });

  test("check chain stops at first check", () => {
    const emailErrorMessage = "String should be a valid email";
    const testEmailErrorMessage = "Email cannot be a test email";
    const testEmail = "test@test.com";
    const Schema = paw
      .string()
      .check((ctx) => (ctx.output.includes("@") ? ctx.ok() : ctx.error(emailErrorMessage)))
      .check((ctx) => (ctx.output === testEmail ? ctx.error(testEmailErrorMessage) : ctx.ok()));

    let result = Schema.safeParse("johndoe@gmail.com");
    expect(result.ok).toBeTruthy();
    expect(PawOk.unwrap(result)).toStrictEqual("johndoe@gmail.com");

    result = Schema.safeParse("johndoe");
    expect(result.ok).toBeFalsy();
    expect(PawError.unwrap(result)).toStrictEqual(new PawCheckIssue(emailErrorMessage, "string"));

    result = Schema.safeParse(testEmail);
    expect(result.ok).toBeFalsy();
    expect(PawError.unwrap(result)).toStrictEqual(
      new PawCheckIssue(testEmailErrorMessage, "string"),
    );
  });
});
