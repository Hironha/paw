import { describe, test, expect } from "vitest";
import * as paw from "./paw";

describe("paw", () => {
  test("string parser works", () => {
    const str = paw.string();

    expect(str.parse("test")).toStrictEqual("test");
    expect(str.safeParse(null).isErr(), "null is not a string").toBeTruthy();
    expect(str.safeParse(2).isErr(), "2 is not a string").toBeTruthy();
    expect(str.safeParse({}).isErr(), "object is not a string").toBeTruthy();
  });

  test("string parse error returns correct string error", () => {
    const str = paw.string();
    const result = str.safeParse(2);
    expect(result.isErr(), "2 is not a string").toBeTruthy();

    const error = result.unwrapErr();
    expect(error.source).toStrictEqual("str");
  });

  test("string refine works", () => {
    const str = paw.string().refine((val) => (typeof val === "number" ? val.toString() : val));

    expect(str.parse("test")).toStrictEqual("test");
    expect(str.parse(2), "refined to string").toStrictEqual("2");
    expect(str.safeParse(true).isErr(), "true is not a string").toBeTruthy();
  });

  test("number parser works", () => {
    const num = paw.number();

    expect(num.parse(2)).toStrictEqual(2);
    expect(num.safeParse(2).unwrap()).toStrictEqual(2);
    expect(num.safeParse(null).isErr(), "null is not a number").toBeTruthy();
    expect(num.safeParse("test").isErr(), "test it not a number").toBeTruthy();
    expect(num.safeParse({}).isErr(), "object is not a number").toBeTruthy();
  });

  test("number parse error returns  correct number error", () => {
    const num = paw.number();
    const result = num.safeParse("test");
    expect(result.isErr(), "test is not a number").toBeTruthy();

    const error = result.unwrapErr();
    expect(error.source).toStrictEqual("num");
  });

  test("number min works", () => {
    const num = paw.number().min(10);

    expect(num.parse(12)).toStrictEqual(12);
    expect(num.parse(10.1)).toStrictEqual(10.1);
    expect(num.safeParse(9).isErr(), "9 is less than 10").toBeTruthy();
    expect(num.safeParse(9.9).isErr(), "9.9 is less than 10").toBeTruthy();
    expect(num.safeParse("test").isErr(), "test is not a number").toBeTruthy();
  });

  test("number max works", () => {
    const num = paw.number().max(10);

    expect(num.parse(9)).toStrictEqual(9);
    expect(num.parse(9.9)).toStrictEqual(9.9);
    expect(num.safeParse(11).isErr(), "11 is bigger than 10").toBeTruthy();
    expect(num.safeParse(10.1).isErr(), "10.1 is bigger than 10").toBeTruthy();
    expect(num.safeParse("test").isErr(), "test is not a number").toBeTruthy();
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
    expect(num.safeParse("false").isErr(), "false cannot be converted to number").toBeTruthy();
    expect(num.safeParse(null).isErr(), "null cannot be converted to number").toBeTruthy();
    expect(num.safeParse({}).isErr(), "object cannot be converted to number").toBeTruthy();
  });

  test("number int works", () => {
    const num = paw.number().int();

    expect(num.parse(10)).toStrictEqual(10);
    expect(num.safeParse(10.1).isErr(), "10.1 is not an int").toBeTruthy();
    expect(num.safeParse("test").isErr(), "test is not an int").toBeTruthy();
  });

  test("boolean parser works", () => {
    const bool = paw.boolean();

    expect(bool.parse(true)).toStrictEqual(true);
    expect(bool.parse(false)).toStrictEqual(false);
    expect(bool.safeParse("test").isErr(), "test is not a boolean").toBeTruthy();
    expect(bool.safeParse(null).isErr(), "null is not a boolean").toBeTruthy();
    expect(bool.safeParse({}).isErr(), "object is not a boolean").toBeTruthy();
  });

  test("boolean parse error returns boolean error", () => {
    const bool = paw.boolean();
    const result = bool.safeParse("test");
    expect(result.isErr(), "test is not a boolean").toBeTruthy();

    const error = result.unwrapErr();
    expect(error.source).toStrictEqual("bool");
  });

  test("boolean refine works", () => {
    const bool = paw.boolean().refine((val) => !!val);

    expect(bool.parse(true)).toStrictEqual(true);
    expect(bool.parse(false)).toStrictEqual(false);
    expect(bool.parse("test"), "refined to trueish").toStrictEqual(true);
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
    expect(result.isErr(), "2 is not an optional string");

    const error = result.unwrapErr();
    expect(error.source).toStrictEqual("str");
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
    expect(optstr.safeParse(true).isErr(), "true is not a optional string");
  });

  test("array parser works", () => {
    const strarr = paw.array(paw.string());

    expect(strarr.parse(["test"])).toMatchObject(["test"]);
    expect(strarr.parse([])).toMatchObject([]);
    expect(strarr.safeParse([2]).isErr(), "arr includes non string value").toBeTruthy();
    expect(strarr.safeParse({}).isErr(), "value is not an array").toBeTruthy();
  });

  test("array parse error returns array type error", () => {
    const strarr = paw.array(paw.string());
    const result = strarr.safeParse("test");
    expect(result.isErr(), "test is not an array").toBeTruthy();

    const error = result.unwrapErr();
    expect(error.source).toStrictEqual("arr");
    const kind = error.source === "arr" ? error.kind : undefined;
    expect(kind).toStrictEqual("type");
  });

  test("array parse error returns array idx error", () => {
    const strarr = paw.array(paw.string());
    const result = strarr.safeParse(["test", 2]);
    expect(result.isErr(), "array includes a non string value");

    const error = result.unwrapErr();
    expect(error.source).toStrictEqual("arr");
    const kind = error.source === "arr" ? error.kind : undefined;
    expect(kind).toStrictEqual("idx");
    const idx = error.source === "arr" && error.kind === "idx" ? error.idx : undefined;
    expect(idx).toStrictEqual(1);
  });

  test("array min works", () => {
    const strarr = paw.array(paw.string()).min(1);

    expect(strarr.parse(["test"])).toMatchObject(["test"]);
    expect(strarr.safeParse([]).isErr(), "arr length less than min").toBeTruthy();
    expect(strarr.safeParse([2]).isErr(), "arr includes non string value").toBeTruthy();
    expect(strarr.safeParse({}).isErr(), "value is not an array").toBeTruthy();
  });

  test("array max works", () => {
    const strarr = paw.array(paw.string()).max(2);

    expect(strarr.parse(["test"])).toMatchObject(["test"]);
    expect(strarr.safeParse(["a", "b", "c"]).isErr(), "arr length bigger than max").toBeTruthy();
    expect(strarr.safeParse([2]).isErr(), "arr includes non string value").toBeTruthy();
    expect(strarr.safeParse({}).isErr(), "value is not an array").toBeTruthy();
  });

  test("array optional works", () => {
    const strarr = paw.array(paw.string()).optional();

    expect(strarr.parse(["test"])).toMatchObject(["test"]);
    expect(strarr.parse(undefined)).toStrictEqual(undefined);
    expect(strarr.parse(null)).toStrictEqual(null);
    expect(strarr.safeParse([2]).isErr(), "arr includes non string value").toBeTruthy();
    expect(strarr.safeParse({}).isErr(), "value is not an array").toBeTruthy();
  });

  test("array refine works", () => {
    const strarr = paw.array(paw.string()).refine((val) => (typeof val === "string" ? [val] : val));

    expect(strarr.parse("test")).toMatchObject(["test"]);
    expect(strarr.safeParse(2).isErr(), "value is not an array").toBeTruthy();
    expect(strarr.safeParse([2]).isErr(), "arr includes non string value").toBeTruthy();
    expect(strarr.safeParse({}).isErr(), "value is not an array").toBeTruthy();
  });

  test("object parser works", () => {
    const obj = paw.object({ name: paw.string() });

    expect(obj.parse({ name: "test" })).toMatchObject({ name: "test" });
    expect(obj.safeParse("test").isErr(), "value is not a valid object").toBeTruthy();
    expect(obj.safeParse(null).isErr(), "null is not a valid object").toBeTruthy();
  });

  test("object parse error returns object type error", () => {
    const obj = paw.object({ name: paw.string() });
    const result = obj.safeParse("test");
    expect(result.isErr(), "test is not an object").toBeTruthy();

    const error = result.unwrapErr();
    expect(error.source).toStrictEqual("obj");
    const kind = error.source === "obj" ? error.kind : undefined;
    expect(kind).toStrictEqual("type");
  });

  test("object parse error returns object prop error", () => {
    const obj = paw.object({ name: paw.string() });
    const result = obj.safeParse({ name: 2 });
    expect(result.isErr(), "name property is not a string").toBeTruthy();

    const error = result.unwrapErr();
    expect(error.source).toStrictEqual("obj");
    const kind = error.source === "obj" ? error.kind : undefined;
    expect(kind).toStrictEqual("prop");
    const prop = error.source === "obj" && error.kind === "prop" ? error.prop : undefined;
    expect(prop).toStrictEqual("name");
  });

  test("literal parser works", () => {
    const animals = paw.literal(["cat", "dog"]);
    expect(animals.parse("cat")).toStrictEqual("cat");
    expect(animals.parse("dog")).toStrictEqual("dog");
    expect(animals.safeParse("beer").isErr(), "beer is not a valid animal").toBeTruthy();
  });

  test("literal parse error returns a literal error ", () => {
    const animals = paw.literal(["cat", "dog"]);
    const result = animals.safeParse("beer");
    expect(result.isErr(), "beer is not a valid animal").toBeTruthy();

    const error = result.unwrapErr();
    expect(error.source).toStrictEqual("literal");
  });

  test("union with primitive types works", () => {
    const union = paw.union([paw.string(), paw.number()]);
    const result = union.safeParse("test");
    expect(result.isOk()).toBeTruthy();
    expect(result.unwrap() === "test").toBeTruthy();
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
    expect(result.isOk()).toBeTruthy();

    const nina = result.unwrap();
    expect(nina.name).toStrictEqual("nina");
    expect(nina.sound).toStrictEqual("meow");
  });

  test("union with refine works", () => {
    const schema = paw
      .union([paw.boolean(), paw.literal(["true", "false"])])
      .refine((value) => (typeof value === "number" ? value > 0 : false));

    const result = schema.safeParse(1);
    expect(result.isOk()).toBeTruthy();
    expect(result.unwrap()).toStrictEqual(true);
  });
});
