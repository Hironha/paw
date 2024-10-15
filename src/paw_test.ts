import { assertEquals } from "@std/assert";
import * as Result from "./result.ts";
import { paw } from "./paw.ts";

Deno.test("string parser should work", () => {
  const str = paw.string();

  assertEquals(str.parse("test"), "test");
  assertEquals(Result.unwrap(str.safeParse("test")), "test");
  assertEquals(str.safeParse(null).kind, "err");
  assertEquals(str.safeParse(2).kind, "err");
  assertEquals(str.safeParse({}).kind, "err");
});

Deno.test("number parser should work", () => {
  const num = paw.number();

  assertEquals(num.parse(2), 2);
  assertEquals(Result.unwrap(num.safeParse(2)), 2);
  assertEquals(num.safeParse(null).kind, "err");
  assertEquals(num.safeParse("test").kind, "err");
  assertEquals(num.safeParse({}).kind, "err");
});
