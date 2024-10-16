import { assert, assertEquals, assertObjectMatch } from "@std/assert";
import * as paw from "./paw.ts";

Deno.test("string parser should work", () => {
  const str = paw.string();

  assertEquals(str.parse("test"), "test");
  assertEquals(str.safeParse("test").unwrap(), "test");
  assert(str.safeParse(null).isErr(), "null is not a string");
  assert(str.safeParse(2).isErr(), "2 is not a string");
  assert(str.safeParse({}).isErr(), "object is not a string");
});

Deno.test("string refine should work", () => {
  const str = paw.string().refine((val) => (typeof val === "number" ? val.toString() : val));

  assertEquals(str.parse("test"), "test");
  assertEquals(str.parse(2), "2");
  assert(str.safeParse(true).isErr(), "true is not a string");
});

Deno.test("number parser should work", () => {
  const num = paw.number();

  assertEquals(num.parse(2), 2);
  assertEquals(num.safeParse(2).unwrap(), 2);
  assert(num.safeParse(null).isErr(), "null is not a number");
  assert(num.safeParse("test").isErr(), "test is not a number");
  assert(num.safeParse({}).isErr(), "object is not a number");
});

Deno.test("number min should work", () => {
  const num = paw.number().min(10);

  assertEquals(num.parse(12), 12);
  assertEquals(num.parse(10.1), 10.1);
  assert(num.safeParse(9).isErr(), "9 is less than 10");
  assert(num.safeParse(9.9).isErr(), "9.9 is less than 10");
  assert(num.safeParse("test").isErr(), "test is not a number");
});

Deno.test("number max should work", () => {
  const num = paw.number().max(10);

  assertEquals(num.parse(9), 9);
  assertEquals(num.parse(9.9), 9.9);
  assert(num.safeParse(11).isErr(), "11 is bigger than 10");
  assert(num.safeParse(10.1).isErr(), "10.1 is bigger than 10");
  assert(num.safeParse("test").isErr(), "test is not a number");
});

Deno.test("number refine should work", () => {
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

Deno.test("number int should work", () => {
  const num = paw.number().int();

  assertEquals(num.parse(10), 10);
  assert(num.safeParse(10.1).isErr(), "10.1 is not an int");
  assert(num.safeParse("test").isErr(), "test is not an int");
});

Deno.test("boolean should work", () => {
  const bool = paw.boolean();

  assertEquals(bool.parse(true), true);
  assertEquals(bool.parse(false), false);
  assert(bool.safeParse("test").isErr(), "test is not a boolean");
  assert(bool.safeParse(null).isErr(), "null is not a boolean");
  assert(bool.safeParse({}).isErr(), "object is not a boolean");
});

Deno.test("boolean refine should work", () => {
  const bool = paw.boolean().refine((val) => !!val);

  assertEquals(bool.parse(true), true);
  assertEquals(bool.parse(false), false);
  assertEquals(bool.parse("test"), true);
});

Deno.test("optional should work", () => {
  const optstr = paw.string().optional();

  assertEquals(optstr.parse("test"), "test");
  assertEquals(optstr.parse(null), null);
  assertEquals(optstr.parse(undefined), undefined);
});

Deno.test("optional refine should work", () => {
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

Deno.test("array parser should work", () => {
  const strarr = paw.array(paw.string());

  assertEquals(strarr.parse(["test"]), ["test"]);
  assertEquals(strarr.parse([]), []);
  assert(strarr.safeParse([2]).isErr(), "arr includes non string value");
  assert(strarr.safeParse({}).isErr(), "value is not an array");
});

Deno.test("array min should work", () => {
  const strarr = paw.array(paw.string()).min(1);

  assertEquals(strarr.parse(["test"]), ["test"]);
  assert(strarr.safeParse([]).isErr(), "arr length less than min");
  assert(strarr.safeParse([2]).isErr(), "arr includes non string value");
  assert(strarr.safeParse({}).isErr(), "value is not an array");
});

Deno.test("array max should work", () => {
  const strarr = paw.array(paw.string()).max(2);

  assertEquals(strarr.parse(["test"]), ["test"]);
  assert(strarr.safeParse(["a", "b", "c"]).isErr(), "arr length bigger than max");
  assert(strarr.safeParse([2]).isErr(), "arr includes non string value");
  assert(strarr.safeParse({}).isErr(), "value is not an array");
});

Deno.test("array optional should work", () => {
  const strarr = paw.array(paw.string()).optional();

  assertEquals(strarr.parse(["test"]), ["test"]);
  assertEquals(strarr.parse(undefined), undefined);
  assertEquals(strarr.parse(null), null);
  assert(strarr.safeParse([2]).isErr(), "arr includes non string value");
  assert(strarr.safeParse({}).isErr(), "value is not an array");
});

Deno.test("array refine should work", () => {
  const strarr = paw.array(paw.string()).refine((val) => (typeof val === "string" ? [val] : val));

  assertEquals(strarr.parse("test"), ["test"]);
  assert(strarr.safeParse(2).isErr(), "value is not an array");
  assert(strarr.safeParse([2]).isErr(), "arr includes non string value");
  assert(strarr.safeParse({}).isErr(), "value is not an array");
});

Deno.test("object parser should work", () => {
  const obj = paw.object({ name: paw.string() });

  assertObjectMatch(obj.parse({ name: "test" }), { name: "test" });
  assert(obj.safeParse("test").isErr(), "value is not a valid object");
  assert(obj.safeParse(null).isErr(), "null is not a valid object");
});
