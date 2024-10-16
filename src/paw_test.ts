import { assert, assertEquals } from "@std/assert";
import { paw } from "./paw.ts";

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
