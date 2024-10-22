import { assert, assertEquals, assertThrows } from "@std/assert";
import { Err, Ok } from "./result.ts";

Deno.test("Ok ok works", () => {
  const ok = new Ok("test");
  assertEquals(ok.ok(), "test");
});

Deno.test("Ok err works", () => {
  const ok = new Ok("test");
  assertEquals(ok.err(), undefined);
});

Deno.test("Ok is ok works", () => {
  const ok = new Ok("test");
  assert(ok.isOk(), "Ok can only be ok");
});

Deno.test("Ok is err works", () => {
  const ok = new Ok("test");
  assert(ok.isErr() === false, "Ok cannot be err");
});

Deno.test("Ok unwrap works", () => {
  const ok = new Ok("test");
  assertEquals(ok.unwrap(), "test");
});

Deno.test("Ok unwrap err works", () => {
  const ok = new Ok("test");
  assertThrows(ok.unwrapErr, "Ok can only throw if trying to unwrap err");
});

Deno.test("Err ok works", () => {
  const err = new Err("test");
  assertEquals(err.ok(), undefined);
});

Deno.test("Err err works", () => {
  const err = new Err("test");
  assertEquals(err.err(), "test");
});

Deno.test("Err is ok works", () => {
  const err = new Err("test");
  assert(err.isOk() === false, "Err cannot be ok");
});

Deno.test("Err is err works", () => {
  const err = new Err("test");
  assert(err.isErr(), "Err can only be err");
});

Deno.test("Err unwrap works", () => {
  const err = new Err("test");
  assertThrows(err.unwrap, "Err can only throw if trying to unwrap ok");
});

Deno.test("Err unwrap err works", () => {
  const ok = new Err("test");
  assertEquals(ok.unwrapErr(), "test");
});
