import assert from "node:assert/strict";
import { describe, test } from "node:test";

import {
  PawArrayTypeIssue,
  PawBigIntIssue,
  PawBooleanIssue,
  PawCheckIssue,
  PawCustomIssue,
  type PawIssue,
  PawLiteralIssue,
  PawNumberIssue,
  PawObjectSchemaIssue,
  PawObjectTypeIssue,
  PawRefineIssue,
  PawRequiredIssue,
  PawStringIssue,
  PawTransformIssue,
  PawUnionIssue,
} from "../src/issue.js";
import * as paw from "../src/paw.js";
import { PawError, PawOk } from "../src/result.js";

describe("paw", () => {
  describe("string", () => {
    test("string parser works", () => {
      const str = paw.string();

      assert.equal(str.parse("test"), "test");
      assert(!str.safeParse(null).ok, "null is not a string");
      assert(!str.safeParse(2).ok, "2 is not a string");
      assert(!str.safeParse({}).ok, "object is not a string");
    });

    test("string parse error returns correct string error", () => {
      const str = paw.string("invalid string");
      const result = str.safeParse(2);
      assert(!result.ok, "2 is not a string");

      const error = PawError.unwrap(result);
      assert.partialDeepStrictEqual(error, {
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

      assert.equal(str.parse("test"), "test");
      assert.equal(str.parse(2), "2", "refined to string");
      assert(!str.safeParse(true).ok, "true is not a string");
    });

    test("string check works", () => {
      const checkmsg = "invalid pattern";
      const str = paw
        .string()
        .check((ctx) => (ctx.output.includes("/") ? ctx.ok() : ctx.error(checkmsg)));
      let result = str.safeParse("me/nina");
      assert(result.ok, "value should contain a /");

      result = str.safeParse("test");
      const error = PawError.unwrap(result);
      assert.deepEqual(error, new PawCheckIssue(checkmsg, "string"));
    });

    test("string transform works", () => {
      const Schema = paw.string().transform((ctx) => ctx.ok(Number(ctx.output)));
      const result = Schema.safeParse("2");
      assert(result.ok, "transform never fails");
      const value = PawOk.unwrap(result);
      assert.equal(value, 2, "should transform to 2");
    });

    test("string min works", () => {
      const msg = "cannot have less than 3 characters";
      const str = paw.string().min(3, msg);
      const result = str.safeParse("12");

      assert(!result.ok);
      assert.partialDeepStrictEqual(PawError.unwrap(result), {
        kind: "string",
        message: msg,
      });
    });

    test("string max works", () => {
      const msg = "cannot have more than 3 characters";
      const str = paw.string().max(3, msg);
      const result = str.safeParse("1234");

      assert(!result.ok);
      assert.partialDeepStrictEqual(PawError.unwrap(result), {
        kind: "string",
        message: msg,
      });
    });
  });

  describe("number", () => {
    test("number parser works", () => {
      const num = paw.number();

      assert.equal(num.parse(2), 2);
      assert.equal(PawOk.unwrap(num.safeParse(2)), 2);
      assert(!num.safeParse(null).ok, "null is not a number");
      assert(!num.safeParse("test").ok, "test it not a number");
      assert(!num.safeParse({}).ok, "object is not a number");
    });

    test("number parse error returns correct number error", () => {
      const num = paw.number("invalid number");
      const result = num.safeParse("test");
      assert(!result.ok, "test is not a number");

      const error = PawError.unwrap(result);
      assert.partialDeepStrictEqual(error, {
        kind: "number",
        message: "invalid number",
      });
    });

    test("number min works", () => {
      const num = paw.number().min(10);

      assert.equal(num.parse(12), 12);
      assert.equal(num.parse(10.1), 10.1);
      assert(!num.safeParse(9).ok, "9 is less than 10");
      assert(!num.safeParse(9.9).ok, "9.9 is less than 10");
      assert(!num.safeParse("test").ok, "test is not a number");
    });

    test("number max works", () => {
      const num = paw.number().max(10);

      assert.equal(num.parse(9), 9);
      assert.equal(num.parse(9.9), 9.9);
      assert(!num.safeParse(11).ok, "11 is bigger than 10");
      assert(!num.safeParse(10.1).ok, "10.1 is bigger than 10");
      assert(!num.safeParse("test").ok, "test is not a number");
    });

    test("number refine works", () => {
      const num = paw.number().refine((ctx) => {
        if (ctx.input == null) {
          return ctx.ok(ctx.input);
        }
        const num = Number(ctx.input);
        return ctx.ok(Number.isNaN(num) ? ctx.input : num);
      });

      assert.equal(num.parse("12"), 12);
      assert.equal(num.parse("1.32"), 1.32);
      assert(!num.safeParse("false").ok, "false cannot be converted to number");
      assert(!num.safeParse(null).ok, "null cannot be converted to number");
      assert(!num.safeParse({}).ok, "object cannot be converted to number");
    });

    test("number int works", () => {
      const num = paw.number().int();

      assert.equal(num.parse(10), 10);
      assert(!num.safeParse(10.1).ok, "10.1 is not an int");
      assert(!num.safeParse("test").ok, "test is not an int");
    });

    test("number check works", () => {
      const checkmsg = "not a minor age";
      const num = paw.number().check((ctx) => (ctx.output < 18 ? ctx.ok() : ctx.error(checkmsg)));
      let result = num.safeParse(12);
      assert(result.ok);

      result = num.safeParse(22);
      assert(!result.ok);
      const error = PawError.unwrap(result);
      assert.deepEqual(error, new PawCheckIssue(checkmsg, "number"));
    });

    test("number transform works", () => {
      const Schema = paw.number().transform((ctx) => ctx.ok(ctx.output.toString()));
      const result = Schema.safeParse(2);
      assert(result.ok);
      const value = PawOk.unwrap(result);
      assert.equal(value, "2");
    });

    test("number default works", () => {
      const errormsg = "not a number";
      const Schema = paw.number(errormsg).default(17);
      let result = Schema.safeParse(null);
      assert(result.ok);
      assert.equal(PawOk.unwrap(result), 17);

      result = Schema.safeParse(undefined);
      assert(result.ok);
      assert.equal(PawOk.unwrap(result), 17);

      result = Schema.safeParse(4);
      assert(result.ok);
      assert.equal(PawOk.unwrap(result), 4);

      result = Schema.safeParse("nina");
      assert(!result.ok);
      assert.deepEqual(PawError.unwrap(result), new PawNumberIssue(errormsg));
    });
  });

  describe("bigint", () => {
    test("bigint parser works", () => {
      const bigint = paw.bigint();

      assert.equal(bigint.parse(2n), 2n);
      assert.equal(PawOk.unwrap(bigint.safeParse(2n)), 2n);
      assert(!bigint.safeParse(null).ok, "null is not a bigint");
      assert(!bigint.safeParse("test").ok, "test it not a bigint");
      assert(!bigint.safeParse({}).ok, "object is not a bigint");
      assert(!bigint.safeParse(2).ok, "number is not a bigint");
    });

    test("bigint parse error returns bigint number error", () => {
      const bigint = paw.bigint("invalid bigint");
      const result = bigint.safeParse("test");
      assert(!result.ok, "test is not a bigint");

      const error = PawError.unwrap(result);
      assert.partialDeepStrictEqual(error, {
        kind: "bigint",
        message: "invalid bigint",
      });
    });

    test("bigint min works", () => {
      const bigint = paw.bigint().min(10n);

      assert.equal(bigint.parse(12n), 12n);
      assert.equal(bigint.parse(10n), 10n);
      assert(!bigint.safeParse(9n).ok, "9n is less than 10n");
      assert(!bigint.safeParse("test").ok, "test is not a bigint");
    });

    test("bigint max works", () => {
      const bigint = paw.bigint().max(10n);

      assert.equal(bigint.parse(9n), 9n);
      assert.equal(bigint.parse(10n), 10n);
      assert(!bigint.safeParse(11n).ok, "11 is bigger than 10");
      assert(!bigint.safeParse("test").ok, "test is not a bigint");
    });

    test("bigint refine works", () => {
      const bigint = paw.bigint().refine((ctx) => {
        if (typeof ctx.input === "string") {
          try {
            return ctx.ok(BigInt(ctx.input));
          } catch (_e) {
            return ctx.ok(ctx.input);
          }
        }
        return ctx.ok(ctx.input);
      });

      assert.equal(bigint.parse("12"), 12n);
      assert(!bigint.safeParse("false").ok, "false cannot be converted to bigint");
      assert(!bigint.safeParse(null).ok, "null cannot be converted to bigint");
      assert(!bigint.safeParse({}).ok, "object cannot be converted to bigint");
    });

    test("bigint check works", () => {
      const checkmsg = "not a minor age";
      const num = paw.bigint().check((ctx) => (ctx.output < 18n ? ctx.ok() : ctx.error(checkmsg)));
      let result = num.safeParse(12n);
      assert(result.ok);

      result = num.safeParse(22n);
      assert(!result.ok);
      const error = PawError.unwrap(result);
      assert.deepEqual(error, new PawCheckIssue(checkmsg, "bigint"));
    });

    test("bigint transform works", () => {
      const Schema = paw.bigint().transform((ctx) => ctx.ok(ctx.output.toString()));
      const result = Schema.safeParse(2n);
      assert(result.ok);
      const value = PawOk.unwrap(result);
      assert.equal(value, "2");
    });

    test("bigint default works", () => {
      const errormsg = "not a bigint";
      const Schema = paw.bigint(errormsg).default(17n);
      let result = Schema.safeParse(null);
      assert(result.ok);
      assert.equal(PawOk.unwrap(result), 17n);

      result = Schema.safeParse(undefined);
      assert(result.ok);
      assert.equal(PawOk.unwrap(result), 17n);

      result = Schema.safeParse(4n);
      assert(result.ok);
      assert.equal(PawOk.unwrap(result), 4n);

      result = Schema.safeParse("nina");
      assert(!result.ok);
      assert.deepEqual(PawError.unwrap(result), new PawBigIntIssue(errormsg));
    });
  });

  describe("boolean", () => {
    test("boolean parser works", () => {
      const bool = paw.boolean();

      assert.equal(bool.parse(true), true);
      assert.equal(bool.parse(false), false);
      assert(!bool.safeParse("test").ok, "test is not a boolean");
      assert(!bool.safeParse(null).ok, "null is not a boolean");
      assert(!bool.safeParse({}).ok, "object is not a boolean");
    });

    test("boolean parse error returns boolean error", () => {
      const bool = paw.boolean("invalid boolean");
      const result = bool.safeParse("test");
      assert(!result.ok, "test is not a boolean");

      const error = PawError.unwrap(result);
      assert.partialDeepStrictEqual(error, {
        kind: "boolean",
        message: "invalid boolean",
      });
    });

    test("boolean refine works", () => {
      const bool = paw.boolean().refine((ctx) => ctx.ok(!!ctx.input));

      assert.equal(bool.parse(true), true);
      assert.equal(bool.parse(false), false);
      assert.equal(bool.parse("test"), true, "refined to trueish");
    });

    test("boolean check works", () => {
      const checkmsg = "boolean should be true";
      const bool = paw.boolean().check((ctx) => (ctx.output ? ctx.ok() : ctx.error(checkmsg)));
      let result = bool.safeParse(true);
      assert(result.ok);

      result = bool.safeParse(false);
      assert(!result.ok);
      const error = PawError.unwrap(result);
      assert.deepEqual(error, new PawCheckIssue(checkmsg, "boolean"));
    });

    test("boolean transform works", () => {
      const Schema = paw.boolean().transform((ctx) => ctx.ok(ctx.output.toString()));
      const result = Schema.safeParse(true);
      assert(result.ok);
      const value = PawOk.unwrap(result);
      assert.equal(value, "true");
    });

    test("boolean default works", () => {
      const errormsg = "not a boolean";
      const Schema = paw.boolean(errormsg).default(true);
      let result = Schema.safeParse(null);
      assert(result.ok);
      assert.equal(PawOk.unwrap(result), true);

      result = Schema.safeParse(undefined);
      assert(result.ok);
      assert.equal(PawOk.unwrap(result), true);

      result = Schema.safeParse(false);
      assert(result.ok);
      assert.equal(PawOk.unwrap(result), false);

      result = Schema.safeParse("nina");
      assert(!result.ok);
      assert.deepEqual(PawError.unwrap(result), new PawBooleanIssue(errormsg));
    });
  });

  test("optional parser works", () => {
    const optstr = paw.string().optional();

    assert.equal(optstr.parse("test"), "test");
    assert(!optstr.safeParse(null).ok);
    assert.equal(optstr.parse(undefined), undefined);
  });

  test("nullable parser works", () => {
    const nullablestr = paw.string().nullable();

    assert.equal(nullablestr.parse("test"), "test");
    assert(!nullablestr.safeParse(undefined).ok);
    assert.equal(nullablestr.parse(null), null);
  });

  test("nullable refinement works", () => {
    const invalidmsg = "received invalid type";
    const Schema = paw
      .number()
      .nullable()
      .refine((ctx) => {
        if (typeof ctx.input === "string") {
          return ctx.ok(Number(ctx.input));
        } else if (typeof ctx.input === "number") {
          return ctx.ok(ctx.input);
        }
        return ctx.error(invalidmsg);
      });

    let result = Schema.safeParse("2");
    assert(result.ok);
    assert.equal(PawOk.unwrap(result), 2);

    result = Schema.safeParse(2);
    assert(result.ok);
    assert.equal(PawOk.unwrap(result), 2);

    result = Schema.safeParse(true);
    assert(!result.ok);
    assert.deepEqual(PawError.unwrap(result), new PawRefineIssue(invalidmsg, "number"));
  });

  test("nullable check works and forwards issue from wrapped schema", () => {
    const nullmsg = "nullable is not really allowed hehe";
    const ninamsg = "no cats are allowed here";
    const Schema = paw
      .string()
      .nullable()
      .check((ctx) => {
        if (ctx.output === null) {
          return ctx.error(nullmsg);
        }
        return ctx.ok();
      })
      .check((ctx) => {
        if (ctx.output === "nina") {
          return ctx.error(ninamsg);
        }
        return ctx.ok();
      });

    let result = Schema.safeParse(null);
    assert(!result.ok);
    assert.deepEqual(PawError.unwrap(result), new PawCheckIssue(nullmsg, "string"));

    result = Schema.safeParse("nina");
    assert(!result.ok);
    assert.deepEqual(PawError.unwrap(result), new PawCheckIssue(ninamsg, "string"));

    result = Schema.safeParse("marine");
    assert(result.ok);
    assert.deepEqual(PawOk.unwrap(result), "marine");
  });

  test("nullable transform works", () => {
    type Out = paw.PawInfer<typeof Schema>;
    const Schema = paw
      .string()
      .nullable()
      .transform((ctx) => {
        if (ctx.output === null) {
          return ctx.ok(0);
        }
        return ctx.ok(Number(ctx.output));
      });

    let result = Schema.safeParse(null);
    assert(result.ok);
    assert.deepEqual(PawOk.unwrap(result), 0);

    result = Schema.safeParse("2");
    assert(result.ok);
    assert.deepEqual(PawOk.unwrap<Out, PawIssue>(result), 2);
  });

  test("nullable default works", () => {
    const Schema = paw.string().nullable().default("nina");

    let result = Schema.safeParse(null);
    assert(result.ok);
    assert.deepEqual(PawOk.unwrap(result), "nina");

    result = Schema.safeParse(undefined);
    assert(result.ok);
    assert.equal(PawOk.unwrap(result), "nina");

    result = Schema.safeParse("marine");
    assert(result.ok);
    assert.deepEqual(PawOk.unwrap(result), "marine");
  });

  describe("optional", () => {
    test("optional parse error forwards error", () => {
      const optstr = paw.string("invalid string").optional();
      const result = optstr.safeParse(2);
      assert(!result.ok, "2 is not an optional string");

      const error = PawError.unwrap(result);
      assert.deepEqual(error, new PawStringIssue("invalid string"));
    });
  });

  test("optional refine works", () => {
    const optstr = paw
      .string()
      .refine((ctx) =>
        typeof ctx.input === "number" ? ctx.ok(ctx.input.toString()) : ctx.ok(ctx.input),
      )
      .optional();

    assert.equal(optstr.parse("test"), "test");
    assert.equal(optstr.parse(2), "2");
    assert.equal(optstr.parse(undefined), undefined);
    assert(!optstr.safeParse(null).ok);
    assert(!optstr.safeParse(true).ok, "true is not a optional string");
  });

  test("optional check works and forwards issue from wrapped schema", () => {
    const errormsg = "cats are not allowe here!";
    const Schema = paw
      .string()
      .optional()
      .check((ctx) => (ctx.output === "nina" ? ctx.error(errormsg) : ctx.ok()));

    let result = Schema.safeParse("nina");
    assert(!result.ok);
    assert.deepEqual(PawError.unwrap(result), new PawCheckIssue(errormsg, "string"));

    result = Schema.safeParse("marine");
    assert(result.ok);
    assert.equal(PawOk.unwrap(result), "marine");
  });

  test("optional transform works", () => {
    const Schema = paw
      .string()
      .optional()
      .transform((ctx) => (ctx.output == null ? ctx.ok(0) : ctx.ok(Number(ctx.output))));

    let result = Schema.safeParse(undefined);
    assert(result.ok);
    assert.equal(PawOk.unwrap(result), 0);

    result = Schema.safeParse("2");
    assert(result.ok);
    assert.equal(PawOk.unwrap(result), 2);
  });

  test("optional runs internal schema checks", () => {
    const cats = ["nina", "mimi"];
    const catserror = "only cats are allowed here!";
    const ninaerror = "only nina is allowed";
    const Schema = paw
      .string()
      .check((ctx) => (cats.includes(ctx.output) ? ctx.ok() : ctx.error(catserror)))
      .optional()
      .check((ctx) => (ctx.output === "nina" ? ctx.ok() : ctx.error(ninaerror)));

    let result = Schema.safeParse("rodolfo");
    assert(!result.ok);
    assert.deepEqual(PawError.unwrap(result), new PawCheckIssue(catserror, "string"));

    result = Schema.safeParse("mimi");
    assert(!result.ok);
    assert.deepEqual(PawError.unwrap(result), new PawCheckIssue(ninaerror, "string"));

    result = Schema.safeParse("nina");
    assert(result.ok);
    assert.equal(PawOk.unwrap(result), "nina");
  });

  test("optional default works", () => {
    const Schema = paw.string().nullable().optional().default("nina");

    let result = Schema.safeParse(null);
    assert(result.ok);
    assert.equal(PawOk.unwrap(result), "nina");

    result = Schema.safeParse(undefined);
    assert(result.ok);
    assert.equal(PawOk.unwrap(result), "nina");

    result = Schema.safeParse("marine");
    assert(result.ok);
    assert.equal(PawOk.unwrap(result), "marine");
  });
});

test("array immediate parser works", () => {
  const strarr = paw.array(paw.string()).immediate();

  assert.partialDeepStrictEqual(strarr.parse(["test"]), ["test"]);
  assert.partialDeepStrictEqual(strarr.parse([]), []);
  assert.partialDeepStrictEqual(strarr.parse(["nina", "cat", "pet"]), ["nina", "cat", "pet"]);
  assert(!strarr.safeParse([2]).ok, "arr includes non string value");
  assert(!strarr.safeParse({}).ok, "value is not an array");
});

test("array retained parser works", () => {
  const strarr = paw.array(paw.string());

  assert.partialDeepStrictEqual(strarr.parse(["test"]), ["test"]);
  assert.partialDeepStrictEqual(strarr.parse([]), []);
  assert.partialDeepStrictEqual(strarr.parse(["nina", "cat", "pet"]), ["nina", "cat", "pet"]);
  assert(!strarr.safeParse([2]).ok, "arr includes non string value");
  assert(!strarr.safeParse({}).ok, "value is not an array");
});

test("array immediate check works", () => {
  const checkmsg = "first should be nina";
  const arr = paw
    .array(paw.string())
    .check((ctx) => (ctx.output[0] === "nina" ? ctx.ok() : ctx.error(checkmsg)))
    .immediate();

  let result = arr.safeParse(["nina"]);
  assert(result.ok);

  result = arr.safeParse(["test", "nina"]);
  assert(!result.ok);
  const error = PawError.unwrap(result);
  assert.deepEqual(error, new PawCheckIssue(checkmsg, "array"));
});

test("array retained check works", () => {
  const checkmsg = "first should be nina";
  const arr = paw
    .array(paw.string())
    .check((ctx) => (ctx.output[0] === "nina" ? ctx.ok() : ctx.error(checkmsg)));

  let result = arr.safeParse(["nina"]);
  assert(result.ok);

  result = arr.safeParse(["test", "nina"]);
  assert(!result.ok);
  const error = PawError.unwrap(result);
  assert.deepEqual(error, new PawCheckIssue(checkmsg, "array"));
});

test("array immediate parse error returns array type error", () => {
  const strarr = paw.array(paw.string(), "expected array").immediate();
  const result = strarr.safeParse("test");
  assert(!result.ok, "test is not an array");

  const error = PawError.unwrap(result);
  assert.partialDeepStrictEqual(error, {
    kind: "array-type",
    message: "expected array",
  });
});

test("array retained parse error returns array type error", () => {
  const strarr = paw.array(paw.string(), "expected array");
  const result = strarr.safeParse("test");
  assert(!result.ok, "test is not an array");

  const error = PawError.unwrap(result);
  assert.partialDeepStrictEqual(error, {
    kind: "array-type",
    message: "expected array",
  });
});

test("array retained parse error returns array idx error", () => {
  const strarr = paw.array(paw.string("expected string"));
  let result = strarr.safeParse(["test", 2]);
  assert(!result.ok, "array includes a non string value");

  let error = PawError.unwrap(result);
  assert.partialDeepStrictEqual(error, {
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
  assert.partialDeepStrictEqual(error, {
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

  assert.partialDeepStrictEqual(strarr.parse(["test"]), ["test"]);
  assert(!strarr.safeParse([]).ok, "arr length less than min");
  assert(!strarr.safeParse([2]).ok, "arr includes non string value");
  assert(!strarr.safeParse({}).ok, "value is not an array");
});

test("array max works", () => {
  const strarr = paw.array(paw.string()).max(2);

  assert.partialDeepStrictEqual(strarr.parse(["test"]), ["test"]);
  assert(!strarr.safeParse(["a", "b", "c"]).ok, "arr length bigger than max");
  assert(!strarr.safeParse([2]).ok, "arr includes non string value");
  assert(!strarr.safeParse({}).ok, "value is not an array");
});

test("array optional works", () => {
  const strarr = paw.array(paw.string()).optional();

  assert.partialDeepStrictEqual(strarr.parse(["test"]), ["test"]);
  assert.equal(strarr.parse(undefined), undefined);
  assert(!strarr.safeParse(null).ok);
  assert(!strarr.safeParse([2]).ok, "arr includes non string value");
  assert(!strarr.safeParse({}).ok, "value is not an array");
});

test("array refine works", () => {
  const strarr = paw
    .array(paw.string())
    .refine((ctx) => (typeof ctx.input === "string" ? ctx.ok([ctx.input]) : ctx.ok(ctx.input)));

  assert.partialDeepStrictEqual(strarr.parse("test"), ["test"]);
  assert(!strarr.safeParse(2).ok, "value is not an array");
  assert(!strarr.safeParse([2]).ok, "arr includes non string value");
  assert(!strarr.safeParse({}).ok, "value is not an array");
});

test("array transform works", () => {
  const Schema = paw.array(paw.string()).transform((ctx) => ctx.ok(ctx.output[0]));
  const result = Schema.safeParse(["test"]);
  assert(result.ok);
  const value = PawOk.unwrap(result);
  assert.equal(value, "test");
});

test("array default works", () => {
  const errormsg = "not an array";
  const Schema = paw.array(paw.number(), errormsg).default([17]);
  let result = Schema.safeParse(null);
  assert(result.ok);
  assert.deepEqual(PawOk.unwrap(result), [17]);

  result = Schema.safeParse(undefined);
  assert(result.ok);
  assert.deepEqual(PawOk.unwrap(result), [17]);

  result = Schema.safeParse([4, 17]);
  assert(result.ok);
  assert.partialDeepStrictEqual(PawOk.unwrap(result), [4, 17]);

  result = Schema.safeParse("nina");
  assert(!result.ok);
  assert.partialDeepStrictEqual(PawError.unwrap(result), new PawArrayTypeIssue(errormsg));
});

test("retained object parse works", () => {
  const obj = paw.object({ name: paw.string() });

  assert.partialDeepStrictEqual(obj.parse({ name: "test" }), { name: "test" });
  assert(!obj.safeParse("test").ok, "value is not a valid object");
  assert(!obj.safeParse(null).ok, "null is not a valid object");
});

test("extended object parse works", () => {
  const message = "invalid extended schema object";
  const Schema = paw.object({ name: paw.string() });
  const ExtendedSchema = Schema.extend(
    { lastname: paw.string().required("missing lastname") },
    message,
  );

  let result = ExtendedSchema.safeParse({ name: "test" });
  assert(!result.ok, "value should not match extended schema");
  assert.partialDeepStrictEqual(
    PawError.unwrap(result),
    new PawObjectSchemaIssue(message, [
      {
        field: "lastname",
        issue: new PawRequiredIssue("missing lastname"),
      },
    ]),
  );

  result = ExtendedSchema.safeParse({ name: "firstname", lastname: "lastname" });
  assert(result.ok, "value should match extended schema");
  assert.deepEqual(PawOk.unwrap(result), {
    name: "firstname",
    lastname: "lastname",
  });
});

test("object extend allow overwriting field schema", () => {
  const Schema = paw.object({ age: paw.string() });
  const ExtendedSchema = Schema.extend({ age: paw.number() });
  const value = { age: 18 };
  const result = ExtendedSchema.safeParse(value);

  assert(result.ok, "value should be valid extended schema");
  assert.deepEqual(PawOk.unwrap(result), value);
});

test("immediate object parse error returns object type error", () => {
  const obj = paw.object({ name: paw.string() }).immediate();
  const result = obj.safeParse("test");
  assert(!result.ok, "test is not an object");

  const error = PawError.unwrap(result);
  assert.equal(error.kind, "object-type");
});

test("immediate object parse error returns object schema error", () => {
  const obj = paw.object({ name: paw.string("name error") }).immediate();
  const result = obj.safeParse({ name: 2 });
  assert(!result.ok, "name property is not a string");

  const error = PawError.unwrap(result);
  assert.equal(error.kind, "object-schema");
  const issues = error.kind === "object-schema" ? error.issues : undefined;
  assert.partialDeepStrictEqual(issues, [
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
  assert(result.ok);

  result = obj.safeParse({ name: 2 });
  assert(!result.ok);
  assert.partialDeepStrictEqual(PawError.unwrap(result), {
    kind: "object-schema",
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
  assert(!result.ok);
  assert.partialDeepStrictEqual(PawError.unwrap(result), {
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
  assert(!result.ok);
  assert.partialDeepStrictEqual(PawError.unwrap(result), {
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
  assert(!result.ok);
  assert.partialDeepStrictEqual(PawError.unwrap(result), {
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
  assert(result.ok);

  result = obj.safeParse({ name: "nina", lastname: "nina" });
  assert(!result.ok);
  const error = PawError.unwrap(result);
  assert.deepEqual(error, new PawCheckIssue(checkmsg, "object"));
});

test("retained object parse check works", () => {
  const checkmsg = "name and lastname should be different";
  const obj = paw
    .object({ name: paw.string(), lastname: paw.string() })
    .check((ctx) => (ctx.output.name !== ctx.output.lastname ? ctx.ok() : ctx.error(checkmsg)));

  let result = obj.safeParse({ name: "nina", lastname: "maria" });
  assert(result.ok);

  result = obj.safeParse({ name: "nina", lastname: "nina" });
  assert(!result.ok);
  const error = PawError.unwrap(result);
  assert.deepEqual(error, new PawCheckIssue(checkmsg, "object"));
});

test("object refine works", () => {
  const Schema = paw.object({ name: paw.string() }).refine((ctx) => {
    try {
      if (typeof ctx.input === "string") {
        return ctx.ok(JSON.parse(ctx.input));
      }
      return ctx.ok(ctx.input);
    } catch (_) {
      return ctx.error("Failed deserializing JSON");
    }
  });

  const input = { name: "test" };
  let result = Schema.safeParse(input);
  assert(result.ok);
  assert.deepEqual(PawOk.unwrap(result), input);

  result = Schema.safeParse(JSON.stringify(input));
  assert(result.ok);
  assert.deepEqual(PawOk.unwrap(result), input);

  result = Schema.safeParse("test");
  assert(!result.ok);
  assert.deepEqual(
    PawError.unwrap(result),
    new PawRefineIssue("Failed deserializing JSON", "object"),
  );
});

test("object transform works", () => {
  type Out = paw.PawInfer<typeof Schema>;
  const Schema = paw.object({ name: paw.string() }).transform((ctx) => ctx.ok(ctx.output.name));
  const result = Schema.safeParse({ name: "test" });
  assert(result.ok);
  const value = PawOk.unwrap<Out, PawIssue>(result);
  assert.equal(value, "test");
});

test("object strict works", () => {
  const nonstrict = paw.object({ name: paw.string() });
  const nonstrictResult = nonstrict.safeParse({ name: "string", age: 2 });
  assert(nonstrictResult.ok);
  assert.deepEqual(PawOk.unwrap(nonstrictResult), { name: "string", age: 2 });

  const strict = paw.object({ name: paw.string() }).strict();
  const strictResult = strict.safeParse({ name: "string", age: 2 });
  assert(strictResult.ok);
  assert.deepEqual(PawOk.unwrap(strictResult), { name: "string" });
});

test("object default works", () => {
  const errormsg = "not an object";
  const Schema = paw.object({ name: paw.string() }, errormsg).default(() => ({ name: "nina" }));
  let result = Schema.safeParse(null);
  assert(result.ok);
  assert.deepEqual(PawOk.unwrap(result), { name: "nina" });

  result = Schema.safeParse(undefined);
  assert(result.ok);
  assert.deepEqual(PawOk.unwrap(result), { name: "nina" });

  result = Schema.safeParse({ name: "marine" });
  assert(result.ok);
  assert.deepEqual(PawOk.unwrap(result), { name: "marine" });

  result = Schema.safeParse("nina");
  assert(!result.ok);
  assert.deepEqual(PawError.unwrap(result), new PawObjectTypeIssue(errormsg));
});

test("non strict parsing keeps reference to original object", () => {
  const src = { name: "Nina", age: 7 };
  const PetSchema = paw.object({ name: paw.string(), age: paw.number().int().min(0) });
  const result = PetSchema.safeParse(src);
  assert(result.ok);
  assert.deepEqual(PawOk.unwrap(result), src);
  assert(PawOk.unwrap(result) === src);
});

test("literal parser works", () => {
  const animals = paw.literal(["cat", "dog"]);
  assert.equal(animals.parse("cat"), "cat");
  assert.equal(animals.parse("dog"), "dog");
  assert(!animals.safeParse("beer").ok, "beer is not a valid animal");

  const nameOrAge = paw.literal(["maria", "carlito", 21]);
  assert.equal(nameOrAge.parse("maria"), "maria");
  assert.equal(nameOrAge.parse("carlito"), "carlito");
  assert.equal(nameOrAge.parse(21), 21);
  assert(!nameOrAge.safeParse("john").ok);
});

test("literal parse error returns a literal error ", () => {
  const animals = paw.literal(["cat", "dog"]);
  const result = animals.safeParse("beer");
  assert(!result.ok, "beer is not a valid animal");

  const error = PawError.unwrap(result);
  assert.equal(error.kind, "literal");
});

test("literal check works", () => {
  const checkmsg = "not a domestic animal";
  const domestic = ["cat"];
  const animals = paw
    .literal(["cat", "tiger"])
    .check((ctx) => (domestic.includes(ctx.output) ? ctx.ok() : ctx.error(checkmsg)));
  let result = animals.safeParse("cat");
  assert(result.ok);

  result = animals.safeParse("tiger");
  assert(!result.ok);
  const error = PawError.unwrap(result);
  assert.deepEqual(error, new PawCheckIssue(checkmsg, "literal"));
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
  assert(result.ok);
  assert.equal(PawOk.unwrap(result), 1);

  result = schema.safeParse("tiger");
  assert(!result.ok);
  assert.partialDeepStrictEqual(PawError.unwrap(result), {
    kind: "literal",
    message: "not a domestic animal",
  });
});

test("literal default works", () => {
  const errormsg = "not a valid name";
  const Schema = paw.literal(["nina", "marine"], errormsg).default("nina");
  let result = Schema.safeParse(null);
  assert(result.ok);
  assert.equal(PawOk.unwrap(result), "nina");

  result = Schema.safeParse(undefined);
  assert(result.ok);
  assert.equal(PawOk.unwrap(result), "nina");

  result = Schema.safeParse("marine");
  assert(result.ok);
  assert.equal(PawOk.unwrap(result), "marine");

  result = Schema.safeParse({ name: "nina" });
  assert(!result.ok);
  assert.deepEqual(PawError.unwrap(result), new PawLiteralIssue(errormsg));
});

describe("union", () => {
  test("union with primitive types works", () => {
    const union = paw.union([paw.string(), paw.number()]);
    const result = union.safeParse("test");
    assert(result.ok);
    assert(PawOk.unwrap(result) === "test");
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
    assert(result.ok);

    const nina = PawOk.unwrap(result);
    assert.equal(nina.name, "nina");
    assert.equal(nina.sound, "meow");
  });

  test("union with refine works", () => {
    const schema = paw
      .union([paw.boolean(), paw.literal(["true", "false"])])
      .refine((ctx) => (typeof ctx.input === "number" ? ctx.ok(ctx.input > 0) : ctx.ok(false)));

    const result = schema.safeParse(1);
    assert(result.ok);
    assert.equal(PawOk.unwrap(result), true);
  });

  test("union check works", () => {
    const checkmsg = "if string then should be nina";
    const union = paw.union([paw.string().optional(), paw.number()]).check((ctx) => {
      return typeof ctx.output === "string" && ctx.output === "nina"
        ? ctx.ok()
        : ctx.error(checkmsg);
    });
    let result = union.safeParse("nina");
    assert(result.ok, "nina should satisfy union and check constraint");

    result = union.safeParse("test");
    assert(!result.ok, "test should fail check constraint");
    const error = PawError.unwrap(result);
    assert.deepEqual(error, new PawCheckIssue(checkmsg, "union"));
  });

  test("union transform works", () => {
    const Schema = paw
      .union([paw.boolean(), paw.number()], "invalid value")
      .transform((ctx) => ctx.ok(ctx.output.toString()));

    let result = Schema.safeParse(true);
    assert(result.ok);
    assert.equal(PawOk.unwrap(result), "true");

    result = Schema.safeParse({});
    assert(!result.ok);
    assert.partialDeepStrictEqual(PawError.unwrap(result), {
      kind: "union",
      message: "invalid value",
    });
  });

  test("union default works", () => {
    const errormsg = "not a valid union";
    const Schema = paw.union([paw.number(), paw.string()], errormsg).default("nina");
    let result = Schema.safeParse(null);
    assert(result.ok);
    assert.equal(PawOk.unwrap(result), "nina");

    result = Schema.safeParse(undefined);
    assert(result.ok);
    assert.equal(PawOk.unwrap(result), "nina");

    result = Schema.safeParse(17);
    assert(result.ok);
    assert.equal(PawOk.unwrap(result), 17);

    result = Schema.safeParse({ name: "nina" });
    assert(!result.ok);
    assert.deepEqual(PawError.unwrap(result), new PawUnionIssue(errormsg));
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
  assert(result.ok);
  assert.equal(PawOk.unwrap(result), 2);

  result = Schema.safeParse("abc");
  assert(!result.ok);
  assert.deepEqual(PawError.unwrap(result), new PawTransformIssue(errmsg, "string"));
});

test("refine issue works", () => {
  const refinemsg = "Could not convert string into number";
  const Schema = paw.number().refine((ctx) => {
    if (typeof ctx.input === "number" && !Number.isNaN(ctx.input)) return ctx.ok(ctx.input);
    const n = Number(ctx.input);
    return Number.isNaN(n) ? ctx.error(refinemsg) : ctx.ok(n);
  });

  assert.equal(Schema.parse(2), 2);
  assert.equal(Schema.parse("2"), 2);
  assert.deepEqual(Schema.safeParse("nan"), new PawError(new PawRefineIssue(refinemsg, "number")));
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
  assert(result.ok);
  assert.equal(PawOk.unwrap(result), "johndoe@gmail.com");

  result = Schema.safeParse("johndoe");
  assert(!result.ok);
  assert.deepEqual(PawError.unwrap(result), new PawCheckIssue(emailErrorMessage, "string"));

  result = Schema.safeParse(testEmail);
  assert(!result.ok);
  assert.deepEqual(PawError.unwrap(result), new PawCheckIssue(testEmailErrorMessage, "string"));
});

describe("default", () => {
  test("default works", () => {
    const Schema = paw.string().default("nina");

    let result = Schema.safeParse(null);
    assert(result.ok);
    assert.equal(PawOk.unwrap(result), "nina");

    result = Schema.safeParse(undefined);
    assert(result.ok);
    assert.equal(PawOk.unwrap(result), "nina");

    result = Schema.safeParse("test");
    assert(result.ok);
    assert.equal(PawOk.unwrap(result), "test");
  });

  test("default check works", () => {
    const ninaerror = "default of nina not allowed";
    const holoerror = "holomem not allowed";
    const Schema = paw
      .string()
      .required("hello world")
      .check((ctx) => (ctx.output === "marine" ? ctx.error(holoerror) : ctx.ok()))
      .default("nina")
      .check((ctx) => (ctx.output === "nina" ? ctx.error(ninaerror) : ctx.ok()));

    let result = Schema.safeParse(null);
    assert(!result.ok);
    // note that the default parser sets the source issue as the inner schema kind
    assert.deepEqual(PawError.unwrap(result), new PawCheckIssue(ninaerror, "string"));

    result = Schema.safeParse(undefined);
    assert(!result.ok);
    assert.deepEqual(PawError.unwrap(result), new PawCheckIssue(ninaerror, "string"));

    result = Schema.safeParse("marine");
    assert(!result.ok);
    assert.deepEqual(PawError.unwrap(result), new PawCheckIssue(holoerror, "string"));

    result = Schema.safeParse("hello");
    assert(result.ok);
    assert.equal(PawOk.unwrap(result), "hello");
  });

  test("default transform works", () => {
    const numbererror = "Expected a string number";
    const stringerror = "Not a string";
    const Schema = paw
      .string(stringerror)
      .default("17")
      .transform((ctx) => {
        const v = Number(ctx.output);
        if (Number.isNaN(v)) {
          return ctx.error(numbererror);
        }
        return ctx.ok(v);
      });

    let result = Schema.safeParse(null);
    assert(result.ok);
    let value = PawOk.unwrap(result);
    assert.equal(value, 17);

    result = Schema.safeParse(undefined);
    assert(result.ok);
    value = PawOk.unwrap(result);
    assert.equal(value, 17);

    result = Schema.safeParse("13");
    assert(result.ok);
    value = PawOk.unwrap(result);
    assert.equal(value, 13);

    result = Schema.safeParse(17);
    assert(!result.ok);
    let error = PawError.unwrap(result);
    assert.deepEqual(error, new PawStringIssue(stringerror));

    result = Schema.safeParse("marine");
    assert(!result.ok);
    error = PawError.unwrap(result);
    assert.deepEqual(error, new PawTransformIssue(numbererror, "string"));
  });
});

describe("custom", () => {
  test("custom parser works", () => {
    const Schema = paw
      .custom("date", (ctx) => {
        if (ctx.input instanceof Date && !Number.isNaN(ctx.input.getTime())) {
          return ctx.ok(ctx.input);
        }
        return ctx.error(`Expected date but received ${ctx.input}`);
      })
      .check((ctx) => {
        if (ctx.output.getUTCFullYear() === 2000) {
          return ctx.error("Cannot be year 2000");
        }
        return ctx.ok();
      });

    const date = new Date("2026-06-01T00:00:00.000Z");
    let result = Schema.safeParse(date);
    assert(result.ok);
    assert.deepEqual(PawOk.unwrap(result), date);

    result = Schema.safeParse(2);
    assert(!result.ok);
    assert.deepEqual(
      PawError.unwrap(result),
      new PawCustomIssue("date", "Expected date but received 2"),
    );
  });
});
