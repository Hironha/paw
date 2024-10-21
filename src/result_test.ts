import { assert, assertEquals, assertThrows } from "@std/assert";
import { createErr, createOk } from "./result.ts";

Deno.test("Ok ok works", () => {
  const ok = createOk("test");
  assertEquals(ok.ok(), "test");
});

Deno.test("Ok err works", () => {
  const ok = createOk("test");
  assertEquals(ok.err(), undefined);
});

Deno.test("Ok is ok works", () => {
  const ok = createOk("test");
  assert(ok.isOk(), "Ok can only be ok");
});

Deno.test("Ok is err works", () => {
  const ok = createOk("test");
  assert(ok.isErr() === false, "Ok cannot be err");
});

Deno.test("Ok unwrap works", () => {
  const ok = createOk("test");
  assertEquals(ok.unwrap(), "test");
});

Deno.test("Ok unwrap err works", () => {
  const ok = createOk("test");
  assertThrows(ok.unwrapErr, "Ok can only throw if trying to unwrap err");
});

Deno.test("Err ok works", () => {
  const err = createErr("test");
  assertEquals(err.ok(), undefined);
});

Deno.test("Err err works", () => {
  const err = createErr("test");
  assertEquals(err.err(), "test");
});

Deno.test("Err is ok works", () => {
  const err = createErr("test");
  assert(err.isOk() === false, "Err cannot be ok");
});

Deno.test("Err is err works", () => {
  const err = createErr("test");
  assert(err.isErr(), "Err can only be err");
});

Deno.test("Err unwrap works", () => {
  const err = createErr("test");
  assertThrows(err.unwrap, "Err can only throw if trying to unwrap ok");
});

Deno.test("Err unwrap err works", () => {
  const ok = createErr("test");
  assertEquals(ok.unwrapErr(), "test");
});
