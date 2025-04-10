import { assert, assertEquals, assertObjectMatch } from "@std/assert";
import * as paw from "./paw.ts";

Deno.test("string parser works", () => {
  const str = paw.string();

  assertEquals(str.parse("test"), "test");
  assertEquals(str.safeParse("test").unwrap(), "test");
  assert(str.safeParse(null).isErr(), "null is not a string");
  assert(str.safeParse(2).isErr(), "2 is not a string");
  assert(str.safeParse({}).isErr(), "object is not a string");
});

Deno.test("string parse error returns correct string error", () => {
  const str = paw.string();
  const result = str.safeParse(2);
  assert(result.isErr(), "2 is not a string");

  const error = result.unwrapErr();
  assertEquals(error.source, "str");
});

Deno.test("string refine works", () => {
  const str = paw.string().refine((val) => (typeof val === "number" ? val.toString() : val));

  assertEquals(str.parse("test"), "test");
  assertEquals(str.parse(2), "2");
  assert(str.safeParse(true).isErr(), "true is not a string");
});

Deno.test("number parser works", () => {
  const num = paw.number();

  assertEquals(num.parse(2), 2);
  assertEquals(num.safeParse(2).unwrap(), 2);
  assert(num.safeParse(null).isErr(), "null is not a number");
  assert(num.safeParse("test").isErr(), "test is not a number");
  assert(num.safeParse({}).isErr(), "object is not a number");
});

Deno.test("number parse error returns  correct number error", () => {
  const num = paw.number();
  const result = num.safeParse("test");
  assert(result.isErr(), "test is not a number");

  const error = result.unwrapErr();
  assertEquals(error.source, "num");
});

Deno.test("number min works", () => {
  const num = paw.number().min(10);

  assertEquals(num.parse(12), 12);
  assertEquals(num.parse(10.1), 10.1);
  assert(num.safeParse(9).isErr(), "9 is less than 10");
  assert(num.safeParse(9.9).isErr(), "9.9 is less than 10");
  assert(num.safeParse("test").isErr(), "test is not a number");
});

Deno.test("number max works", () => {
  const num = paw.number().max(10);

  assertEquals(num.parse(9), 9);
  assertEquals(num.parse(9.9), 9.9);
  assert(num.safeParse(11).isErr(), "11 is bigger than 10");
  assert(num.safeParse(10.1).isErr(), "10.1 is bigger than 10");
  assert(num.safeParse("test").isErr(), "test is not a number");
});

Deno.test("number refine works", () => {
  const num = paw.number().refine((val) => {
    if (val == null) {
      return val;
    }
    const num = Number(val);
    return Number.isNaN(num) ? val : num;
  });

  assertEquals(num.parse("12"), 12);
  assertEquals(num.parse("1.32"), 1.32);
  assert(num.safeParse("false").isErr(), "false cannot be converted to number");
  assert(num.safeParse(null).isErr(), "null cannot be converted to number");
  assert(num.safeParse({}).isErr(), "object cannot be converted to number");
});

Deno.test("number int works", () => {
  const num = paw.number().int();

  assertEquals(num.parse(10), 10);
  assert(num.safeParse(10.1).isErr(), "10.1 is not an int");
  assert(num.safeParse("test").isErr(), "test is not an int");
});

Deno.test("boolean parser works", () => {
  const bool = paw.boolean();

  assertEquals(bool.parse(true), true);
  assertEquals(bool.parse(false), false);
  assert(bool.safeParse("test").isErr(), "test is not a boolean");
  assert(bool.safeParse(null).isErr(), "null is not a boolean");
  assert(bool.safeParse({}).isErr(), "object is not a boolean");
});

Deno.test("boolean parse error returns boolean error", () => {
  const bool = paw.boolean();
  const result = bool.safeParse("test");
  assert(result.isErr(), "test is not a boolean");

  const error = result.unwrapErr();
  assertEquals(error.source, "bool");
});

Deno.test("boolean refine works", () => {
  const bool = paw.boolean().refine((val) => !!val);

  assertEquals(bool.parse(true), true);
  assertEquals(bool.parse(false), false);
  assertEquals(bool.parse("test"), true);
});

Deno.test("optional parser works", () => {
  const optstr = paw.string().optional();

  assertEquals(optstr.parse("test"), "test");
  assertEquals(optstr.parse(null), null);
  assertEquals(optstr.parse(undefined), undefined);
});

Deno.test("optional parse error forwards error", () => {
  const optstr = paw.string().optional();
  const result = optstr.safeParse(2);
  assert(result.isErr(), "2 is not an optional string");

  const error = result.unwrapErr();
  assertEquals(error.source, "str");
});

Deno.test("optional refine works", () => {
  const optstr = paw
    .string()
    .refine((val) => (typeof val === "number" ? val.toString() : val))
    .optional();

  assertEquals(optstr.parse("test"), "test");
  assertEquals(optstr.parse(2), "2");
  assertEquals(optstr.parse(undefined), undefined);
  assertEquals(optstr.parse(null), null);
  assert(optstr.safeParse(true).isErr(), "true is not a optional string");
});

Deno.test("array parser works", () => {
  const strarr = paw.array(paw.string());

  assertEquals(strarr.parse(["test"]), ["test"]);
  assertEquals(strarr.parse([]), []);
  assert(strarr.safeParse([2]).isErr(), "arr includes non string value");
  assert(strarr.safeParse({}).isErr(), "value is not an array");
});

Deno.test("array parse error returns array type error", () => {
  const strarr = paw.array(paw.string());
  const result = strarr.safeParse("test");
  assert(result.isErr(), "test is not an array");

  const error = result.unwrapErr();
  assertEquals(error.source, "arr");
  const kind = error.source === "arr" ? error.kind : undefined;
  assertEquals(kind, "type");
});

Deno.test("array parse error returns array idx error", () => {
  const strarr = paw.array(paw.string());
  const result = strarr.safeParse(["test", 2]);
  assert(result.isErr(), "array includes a non string value");

  const error = result.unwrapErr();
  assertEquals(error.source, "arr");
  const kind = error.source === "arr" ? error.kind : undefined;
  assertEquals(kind, "idx");
  const idx = error.source === "arr" && error.kind === "idx" ? error.idx : undefined;
  assertEquals(idx, 1);
});

Deno.test("array min works", () => {
  const strarr = paw.array(paw.string()).min(1);

  assertEquals(strarr.parse(["test"]), ["test"]);
  assert(strarr.safeParse([]).isErr(), "arr length less than min");
  assert(strarr.safeParse([2]).isErr(), "arr includes non string value");
  assert(strarr.safeParse({}).isErr(), "value is not an array");
});

Deno.test("array max works", () => {
  const strarr = paw.array(paw.string()).max(2);

  assertEquals(strarr.parse(["test"]), ["test"]);
  assert(strarr.safeParse(["a", "b", "c"]).isErr(), "arr length bigger than max");
  assert(strarr.safeParse([2]).isErr(), "arr includes non string value");
  assert(strarr.safeParse({}).isErr(), "value is not an array");
});

Deno.test("array optional works", () => {
  const strarr = paw.array(paw.string()).optional();

  assertEquals(strarr.parse(["test"]), ["test"]);
  assertEquals(strarr.parse(undefined), undefined);
  assertEquals(strarr.parse(null), null);
  assert(strarr.safeParse([2]).isErr(), "arr includes non string value");
  assert(strarr.safeParse({}).isErr(), "value is not an array");
});

Deno.test("array refine works", () => {
  const strarr = paw.array(paw.string()).refine((val) => (typeof val === "string" ? [val] : val));

  assertEquals(strarr.parse("test"), ["test"]);
  assert(strarr.safeParse(2).isErr(), "value is not an array");
  assert(strarr.safeParse([2]).isErr(), "arr includes non string value");
  assert(strarr.safeParse({}).isErr(), "value is not an array");
});

Deno.test("object parser works", () => {
  const obj = paw.object({ name: paw.string() });

  assertObjectMatch(obj.parse({ name: "test" }), { name: "test" });
  assert(obj.safeParse("test").isErr(), "value is not a valid object");
  assert(obj.safeParse(null).isErr(), "null is not a valid object");
});

Deno.test("object parse error returns object type error", () => {
  const obj = paw.object({ name: paw.string() });
  const result = obj.safeParse("test");
  assert(result.isErr(), "test is not an object");

  const error = result.unwrapErr();
  assertEquals(error.source, "obj");
  const kind = error.source === "obj" ? error.kind : undefined;
  assertEquals(kind, "type");
});

Deno.test("object parse error returns object prop error", () => {
  const obj = paw.object({ name: paw.string() });
  const result = obj.safeParse({ name: 2 });
  assert(result.isErr(), "name property is not a string");

  const error = result.unwrapErr();
  assertEquals(error.source, "obj");
  const kind = error.source === "obj" ? error.kind : undefined;
  assertEquals(kind, "prop");
  const prop = error.source === "obj" && error.kind === "prop" ? error.prop : undefined;
  assertEquals(prop, "name");
});

Deno.test("literal parser works", () => {
  const animals = paw.literal(["cat", "dog"]);
  assertEquals(animals.parse("cat"), "cat");
  assertEquals(animals.parse("dog"), "dog");
  assert(animals.safeParse("beer").isErr(), "beer is not a valid animal");
});

Deno.test("literal parse error returns a literal error ", () => {
  const animals = paw.literal(["cat", "dog"]);
  const result = animals.safeParse("beer");
  assert(result.isErr(), "beer is not a valid animal");

  const error = result.unwrapErr();
  assertEquals(error.source, "literal");
});

Deno.test("union with primitive types works", () => {
  const union = paw.union([paw.string(), paw.number()]);
  const result = union.safeParse("test");
  assert(result.isOk());
  assert(result.unwrap() === "test");
});

Deno.test("union with complex objects works", () => {
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
  assert(result.isOk());

  const nina = result.unwrap();
  assertEquals(nina.name, "nina");
  assertEquals(nina.sound, "meow");
});

Deno.test("union with refine works", () => {
  const schema = paw
    .union([paw.boolean(), paw.literal(["true", "false"])])
    .refine((value) => (typeof value === "number" ? value > 0 : false));

  const result = schema.safeParse(1);
  assert(result.isOk());
  assertEquals(result.unwrap(), true);
});
