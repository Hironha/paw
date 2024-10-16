import { assert, assertEquals } from "@std/assert";
import * as paw from "./paw.ts";

Deno.test("string parser should work", () => {
  const str = paw.string();

  assertEquals(str.parse("test"), "test");
  assertEquals(str.safeParse("test").unwrap(), "test");
  assert(str.safeParse(null).isErr());
  assert(str.safeParse(2).isErr());
  assert(str.safeParse({}).isErr());
});

Deno.test("number parser should work", () => {
  const num = paw.number();

  assertEquals(num.parse(2), 2);
  assertEquals(num.safeParse(2).unwrap(), 2);
  assert(num.safeParse(null).isErr());
  assert(num.safeParse("test").isErr());
  assert(num.safeParse({}).isErr());
});

Deno.test("string refine should work", () => {
  const str = paw
    .string()
    .refine((val) => (typeof val === "number" ? val.toString() : val));

  assertEquals(str.parse("test"), "test");
  assertEquals(str.parse(2), "2");
  assert(str.safeParse(true).isErr());
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
  assert(optstr.safeParse(true).isErr());
});
