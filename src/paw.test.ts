import { describe, test, expect } from "vitest";
import * as paw from "./paw";
import { unwrapOk, unwrapError } from "./result";

describe("paw", () => {
  test("string parser works", () => {
    const str = paw.string();

    expect(str.parse("test")).toStrictEqual("test");
    expect(!str.safeParse(null).ok, "null is not a string").toBeTruthy();
    expect(!str.safeParse(2).ok, "2 is not a string").toBeTruthy();
    expect(!str.safeParse({}).ok, "object is not a string").toBeTruthy();
  });

  test("string parse error returns correct string error", () => {
    const str = paw.string();
    const result = str.safeParse(2);
    expect(!result.ok, "2 is not a string").toBeTruthy();

    const error = unwrapError(result);
    expect(error.kind).toStrictEqual("str");
  });

  test("string refine works", () => {
    const str = paw.string().refine((val) => (typeof val === "number" ? val.toString() : val));

    expect(str.parse("test")).toStrictEqual("test");
    expect(str.parse(2), "refined to string").toStrictEqual("2");
    expect(!str.safeParse(true).ok, "true is not a string").toBeTruthy();
  });

  test("string check works", () => {
    const str = paw.string().check((v) => v.includes("/"), "invalid pattern");
    let result = str.safeParse("me/nina");
    expect(result.ok).toBeTruthy();

    result = str.safeParse("test");
    const error = unwrapError(result);
    expect(error).toMatchObject({
      kind: "str",
      message: "invalid pattern",
    });
  });

  test("string transform works", () => {
    const str = paw.string().transform((s) => Number(s));
    const result = str.safeParse("2");
    expect(result.ok).toBeTruthy();
    const value = unwrapOk(result);
    expect(value).toStrictEqual(2);
  });

  test("number parser works", () => {
    const num = paw.number();

    expect(num.parse(2)).toStrictEqual(2);
    expect(unwrapOk(num.safeParse(2))).toStrictEqual(2);
    expect(!num.safeParse(null).ok, "null is not a number").toBeTruthy();
    expect(!num.safeParse("test").ok, "test it not a number").toBeTruthy();
    expect(!num.safeParse({}).ok, "object is not a number").toBeTruthy();
  });

  test("number parse error returns  correct number error", () => {
    const num = paw.number();
    const result = num.safeParse("test");
    expect(!result.ok, "test is not a number").toBeTruthy();

    const error = unwrapError(result);
    expect(error.kind).toStrictEqual("num");
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
    const num = paw.number().refine((val) => {
      if (val == null) {
        return val;
      }
      const num = Number(val);
      return Number.isNaN(num) ? val : num;
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
    const num = paw.number().check((n) => n < 18, "not a minor age");
    let result = num.safeParse(12);
    expect(result.ok).toBeTruthy();

    result = num.safeParse(22);
    expect(!result.ok).toBeTruthy();
    const error = unwrapError(result);
    expect(error).toMatchObject({
      kind: "num",
      message: "not a minor age",
    });
  });

  test("number transform works", () => {
    const num = paw.number().transform((n) => n.toString());
    const result = num.safeParse(2);
    expect(result.ok).toBeTruthy();
    const value = unwrapOk(result);
    expect(value).toStrictEqual("2");
  });

  test("boolean parser works", () => {
    const bool = paw.boolean();

    expect(bool.parse(true)).toStrictEqual(true);
    expect(bool.parse(false)).toStrictEqual(false);
    expect(!bool.safeParse("test").ok, "test is not a boolean").toBeTruthy();
    expect(!bool.safeParse(null).ok, "null is not a boolean").toBeTruthy();
    expect(!bool.safeParse({}).ok, "object is not a boolean").toBeTruthy();
  });

  test("boolean parse error returns boolean error", () => {
    const bool = paw.boolean();
    const result = bool.safeParse("test");
    expect(!result.ok, "test is not a boolean").toBeTruthy();

    const error = unwrapError(result);
    expect(error.kind).toStrictEqual("bool");
  });

  test("boolean refine works", () => {
    const bool = paw.boolean().refine((val) => !!val);

    expect(bool.parse(true)).toStrictEqual(true);
    expect(bool.parse(false)).toStrictEqual(false);
    expect(bool.parse("test"), "refined to trueish").toStrictEqual(true);
  });

  test("boolean check works", () => {
    const bool = paw.boolean().check((b) => b, "boolean should be true");
    let result = bool.safeParse(true);
    expect(result.ok).toBeTruthy();

    result = bool.safeParse(false);
    expect(!result.ok).toBeTruthy();
    const error = unwrapError(result);
    expect(error).toMatchObject({
      kind: "bool",
      message: "boolean should be true",
    });
  });

  test("boolean transform works", () => {
    const bool = paw.boolean().transform((b) => b.toString());
    const result = bool.safeParse(true);
    expect(result.ok).toBeTruthy();
    const value = unwrapOk(result);
    expect(value).toStrictEqual("true");
  });

  test("optional parser works", () => {
    const optstr = paw.string().optional();

    expect(optstr.parse("test")).toStrictEqual("test");
    expect(optstr.parse(null)).toStrictEqual(null);
    expect(optstr.parse(undefined)).toStrictEqual(undefined);
  });

  test("optional parse error forwards error", () => {
    const optstr = paw.string().optional();
    const result = optstr.safeParse(2);
    expect(!result.ok, "2 is not an optional string");

    const error = unwrapError(result);
    expect(error.kind).toStrictEqual("str");
  });

  test("optional refine works", () => {
    const optstr = paw
      .string()
      .refine((val) => (typeof val === "number" ? val.toString() : val))
      .optional();

    expect(optstr.parse("test")).toStrictEqual("test");
    expect(optstr.parse(2)).toStrictEqual("2");
    expect(optstr.parse(undefined)).toStrictEqual(undefined);
    expect(optstr.parse(null)).toStrictEqual(null);
    expect(!optstr.safeParse(true).ok, "true is not a optional string");
  });

  test("array immediate parser works", () => {
    const strarr = paw.array(paw.string());

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
    const arr = paw
      .array(paw.string())
      .check((arr) => arr[0] === "nina", "first should be nina")
      .immediate();

    let result = arr.safeParse(["nina"]);
    expect(result.ok).toBeTruthy();

    result = arr.safeParse(["test", "nina"]);
    expect(!result.ok).toBeTruthy();
    const error = unwrapError(result);
    expect(error).toMatchObject({
      kind: "arr-type",
      message: "first should be nina",
    });
  });

  test("array retained check works", () => {
    const arr = paw.array(paw.string()).check((arr) => arr[0] === "nina", "first should be nina");

    let result = arr.safeParse(["nina"]);
    expect(result.ok).toBeTruthy();

    result = arr.safeParse(["test", "nina"]);
    expect(!result.ok).toBeTruthy();
    const error = unwrapError(result);
    expect(error).toMatchObject({
      kind: "arr-type",
      message: "first should be nina",
    });
  });

  test("array immediate parse error returns array type error", () => {
    const strarr = paw.array(paw.string(), "expected array").immediate();
    const result = strarr.safeParse("test");
    expect(!result.ok, "test is not an array").toBeTruthy();

    const error = unwrapError(result);
    expect(error).toMatchObject({
      kind: "arr-type",
      message: "expected array",
    });
  });

  test("array retained parse error returns array type error", () => {
    const strarr = paw.array(paw.string(), "expected array");
    const result = strarr.safeParse("test");
    expect(!result.ok, "test is not an array").toBeTruthy();

    const error = unwrapError(result);
    expect(error).toMatchObject({
      kind: "arr-type",
      message: "expected array",
    });
  });

  test("array retained parse error returns array idx error", () => {
    const strarr = paw.array(paw.string("expected string"));
    let result = strarr.safeParse(["test", 2]);
    expect(!result.ok, "array includes a non string value");

    let error = unwrapError(result);
    expect(error).toMatchObject({
      kind: "arr-schema",
      issues: [
        {
          idx: 1,
          issue: {
            kind: "str",
            message: "expected string",
          },
        },
      ],
    });

    result = strarr.safeParse([1, 2]);
    error = unwrapError(result);
    expect(error).toMatchObject({
      kind: "arr-schema",
      issues: [
        {
          idx: 0,
          issue: {
            kind: "str",
            message: "expected string",
          },
        },
        {
          idx: 1,
          issue: {
            kind: "str",
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
    expect(strarr.parse(null)).toStrictEqual(null);
    expect(!strarr.safeParse([2]).ok, "arr includes non string value").toBeTruthy();
    expect(!strarr.safeParse({}).ok, "value is not an array").toBeTruthy();
  });

  test("array refine works", () => {
    const strarr = paw.array(paw.string()).refine((val) => (typeof val === "string" ? [val] : val));

    expect(strarr.parse("test")).toMatchObject(["test"]);
    expect(!strarr.safeParse(2).ok, "value is not an array").toBeTruthy();
    expect(!strarr.safeParse([2]).ok, "arr includes non string value").toBeTruthy();
    expect(!strarr.safeParse({}).ok, "value is not an array").toBeTruthy();
  });

  test("array transform works", () => {
    const arr = paw.array(paw.string()).transform((arr) => arr[0]);
    const result = arr.safeParse(["test"]);
    expect(result.ok).toBeTruthy();
    const value = unwrapOk(result);
    expect(value).toStrictEqual("test");
  });

  test("retained object parser works", () => {
    const obj = paw.object({ name: paw.string() });

    expect(obj.parse({ name: "test" })).toMatchObject({ name: "test" });
    expect(!obj.safeParse("test").ok, "value is not a valid object").toBeTruthy();
    expect(!obj.safeParse(null).ok, "null is not a valid object").toBeTruthy();
  });

  test("immediate object parse error returns object type error", () => {
    const obj = paw.object({ name: paw.string() }).immediate();
    const result = obj.safeParse("test");
    expect(!result.ok, "test is not an object").toBeTruthy();

    const error = unwrapError(result);
    expect(error.kind).toStrictEqual("obj-type");
  });

  test("immediate object parse error returns object schema error", () => {
    const obj = paw.object({ name: paw.string("name error") }).immediate();
    const result = obj.safeParse({ name: 2 });
    expect(!result.ok, "name property is not a string").toBeTruthy();

    const error = unwrapError(result);
    expect(error.kind).toStrictEqual("obj-schema");
    const issues = error.kind === "obj-schema" ? error.issues : undefined;
    expect(issues).toMatchObject([
      {
        field: "name",
        issue: {
          kind: "str",
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
    expect(unwrapError(result)).toMatchObject({
      kind: "obj-schema",
      message: expect.any(String),
      issues: [
        {
          field: "name",
          issue: {
            kind: "str",
            message: "name error",
          },
        },
        {
          field: "age",
          issue: {
            kind: "req",
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
    expect(unwrapError(result)).toMatchObject({
      kind: "obj-schema",
      message: "invalid object",
      issues: [
        {
          field: "name",
          issue: {
            kind: "str",
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
    expect(unwrapError(result)).toMatchObject({
      kind: "obj-schema",
      message: "invalid object",
      issues: [
        {
          field: "name",
          issue: {
            kind: "str",
            message: "name error",
          },
        },
        {
          field: "traits",
          issue: {
            kind: "obj-schema",
            message: "invalid traits",
            issues: [
              {
                field: "height",
                issue: {
                  kind: "req",
                  message: "height required",
                },
              },
            ],
          },
        },
      ],
    });
  });

  test("immediate object parse check works", () => {
    const obj = paw
      .object({ name: paw.string(), lastname: paw.string() })
      .check((obj) => obj.name !== obj.lastname, "name and lastname should be different")
      .immediate();

    let result = obj.safeParse({ name: "nina", lastname: "maria" });
    expect(result.ok).toBeTruthy();

    result = obj.safeParse({ name: "nina", lastname: "nina" });
    expect(!result.ok).toBeTruthy();
    const error = unwrapError(result);
    expect(error).toMatchObject({
      kind: "obj-type",
      message: "name and lastname should be different",
    });
  });

  test("retained object parse check works", () => {
    const obj = paw
      .object({ name: paw.string(), lastname: paw.string() })
      .check((obj) => obj.name !== obj.lastname, "name and lastname should be different");

    let result = obj.safeParse({ name: "nina", lastname: "maria" });
    expect(result.ok).toBeTruthy();

    result = obj.safeParse({ name: "nina", lastname: "nina" });
    expect(!result.ok).toBeTruthy();
    const error = unwrapError(result);
    expect(error).toMatchObject({
      kind: "obj-type",
      message: "name and lastname should be different",
    });
  });

  test("object transform works", () => {
    const obj = paw.object({ name: paw.string() }).transform((obj) => obj.name);
    const result = obj.safeParse({ name: "test" });
    expect(result.ok).toBeTruthy();
    const value = unwrapOk(result);
    expect(value).toStrictEqual("test");
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

    const error = unwrapError(result);
    expect(error.kind).toStrictEqual("literal");
  });

  test("literal check works", () => {
    const domestic = ["cat"];
    const animals = paw
      .literal(["cat", "tiger"])
      .check((animal) => domestic.includes(animal), "not a domestic animal");
    let result = animals.safeParse("cat");
    expect(result.ok).toBeTruthy();

    result = animals.safeParse("tiger");
    expect(!result.ok).toBeTruthy();
    const error = unwrapError(result);
    expect(error).toMatchObject({
      kind: "literal",
      message: "not a domestic animal",
    });
  });

  test("literal transform works", () => {
    const schema = paw.literal(["cat", "dog"], "not a domestic animal").transform((animal) => {
      switch (animal) {
        case "cat":
          return 1;
        case "dog":
          return 2;
      }
    });
    let result = schema.safeParse("cat");
    expect(result.ok).toBeTruthy();
    expect(unwrapOk(result)).toStrictEqual(1);

    result = schema.safeParse("tiger");
    expect(!result.ok).toBeTruthy();
    expect(unwrapError(result)).toMatchObject({
      kind: "literal",
      message: "not a domestic animal",
    });
  });

  test("union with primitive types works", () => {
    const union = paw.union([paw.string(), paw.number()]);
    const result = union.safeParse("test");
    expect(result.ok).toBeTruthy();
    expect(unwrapOk(result) === "test").toBeTruthy();
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

    const nina = unwrapOk(result);
    expect(nina.name).toStrictEqual("nina");
    expect(nina.sound).toStrictEqual("meow");
  });

  test("union with refine works", () => {
    const schema = paw
      .union([paw.boolean(), paw.literal(["true", "false"])])
      .refine((value) => (typeof value === "number" ? value > 0 : false));

    const result = schema.safeParse(1);
    expect(result.ok).toBeTruthy();
    expect(unwrapOk(result)).toStrictEqual(true);
  });

  test("union check works", () => {
    const union = paw
      .union([paw.string().optional(), paw.number()])
      .check(
        (union) => typeof union === "string" && union === "nina",
        "if string then should be nina",
      );
    let result = union.safeParse("nina");
    expect(result.ok).toBeTruthy();

    result = union.safeParse("test");
    expect(!result.ok).toBeTruthy();
    const error = unwrapError(result);
    expect(error).toMatchObject({
      kind: "union",
      message: "if string then should be nina",
    });
  });

  test("union transform works", () => {
    const schema = paw
      .union([paw.boolean(), paw.number()], "invalid value")
      .transform((u) => u.toString());
    let result = schema.safeParse(true);
    expect(result.ok).toBeTruthy();
    expect(unwrapOk(result)).toStrictEqual("true");

    result = schema.safeParse({});
    expect(!result.ok).toBeTruthy();
    expect(unwrapError(result)).toMatchObject({
      kind: "union",
      message: "invalid value",
    });
  });

  test("chain of transforms works", () => {
    const schema = paw
      .number("invalid number")
      .transform(String)
      .transform(Number)
      .transform(Boolean);
    let result = schema.safeParse(2);
    expect(result.ok).toBeTruthy();
    expect(unwrapOk(result)).toStrictEqual(true);

    result = schema.safeParse({});
    expect(!result.ok).toBeTruthy();
    expect(unwrapError(result)).toMatchObject({
      kind: "num",
      message: "invalid number",
    });
  });
});
