## Paw

A simple implementation of JSON schema parsing inspired by `zod`. This implementation is meant to be minimal, so only primitive types and some sum types are supported. For more specific validations, such as email or uuid, for example, Paw offers an extension to it's parsing schema through `refine`, `check` and `transform` methods.

The key advantage of Paw over zod is the customization of how nestable schemas, i.e. objects and arrays, are parsed. Nestable schemas have two parsing modes: `immediate` and `retained`. Immediate mode stops parsing the schema when it encounters the first issue, and retained mode parses the whole object and return all issues encountered. Parsing can also be strict or non-strict; the difference is that strict mode guarantees that the output contains only data defined in the schema, meanwhile the advantage of non-strict parsing is avoiding unnecessary copies or clones when possible (making it faster).

This library is minimal on purpose, having no third party dependencies and being basically a single file because it's meant to facilitate copy/paste into projects.

```ts
import * as paw "paw";

const PersonSchema = paw.object({
  name: paw.string().min(1).max(256),
  age: paw.number().int().min(0),
});

const result = PersonSchema.safeParse({
  name: "John Doe",
  age: 18
});

expect(result).toMatchObject({
  ok: true,
  value: {
    name: "John Doe",
    age: 18
  }
});
```

### Validation

Paw supports many utility methods to help parsing the values, such as `refine`, `transform` and `check`. The order of execution is: `refine` -> `parsing` -> `check` -> `transform`.

- `refine` is meant to transform some value before parsing the schema. If the `refine` function returns an issue, then the schema stops parsing and forwards the issue as result.
- `parsing` is done either through `parse` or `safeParse` and validates the value based on the schema.
- `check` is just a simple validation meant to be used when validating the schema is not enough. Supports returning issues with custom messages.
- `transform` transform the value after validating the schema and all `check`s. Primarily used for type driven design.

#### 1. Refine

`refine` is used to transform some value before parsing the schema. If the `refine` function returns an issue, then the schema stops parsing and fowards the issue as the parsing result. A schema can have multiple `refine`, but their validation have immediate behaviour, meaning that it stops at the first `refine` that returns an issue.

```ts
import * as paw from "paw";

const AgeFromStringSchema = paw
  .number()
  .int()
  .min(0)
  .refine((ctx) => {
    const n = Number(ctx.input);
    return Number.isNaN(n) ? ctx.error("Value not parsable to number") : ctx.ok(n);
  });

expect(AgeFromStringSchema.safeParse(1).ok).toBeTruthy();
expect(AgeFromStringSchema.safeParse("1").ok).toBeTruthy();
```

#### 2. Parsing

Parsing refers to the process of schema validation. All built-in schemas have two parsing methods: `parse` and `safeParse`

- The `parse` method throws a `PawParseError`, a stackful error class that extends the `Error` class and contains a reference to the issue.
- The `safeParse` method uses a discriminated union as the parsing result to indicate whether the parsing was successful or not.

```ts
import * as paw from "paw";

const Schema = paw.object({ name: paw.string() });

const parsed = Schema.parse({ name: "John Doe" });
expect(parsed).toStrictEqual({ name: "John Doe" });

const result = Schema.safeParse({ name: "John Doe" });
expect(result.ok).toBeTruthy();
if (result.ok) {
  expect(result.value).toStrictEqual({ name: "John Doe" });
}
```

#### 3. Checks

Checks are a way to validate parsed data when parsing alone isn't sufficient. For example, when validating an email address, you know it's a string, but validating the format is quite complicated. Therefore, you might decide that only checking for an "@" within the string is enough for your needs.

```ts
import * as paw from "paw";

const EmailSchema = paw
  .string()
  .check((ctx) => (ctx.output.includes("@") ? ctx.ok() : ctx.error("Invalid email address")));

let result = EmailSchema.safeParse("johndoe@gmail.com");
expect(result.ok).toBeTruthy();
if (result.ok) {
  expect(result.value).toStrictEqual("johndoe@gmail.com");
}

result = EmailSchema.safeParse("johndoe");
expect(result.ok).toBeFalsy();
if (!result.ok) {
  expect(result.error).toMatchObject({
    kind: "check",
    message: "Invalid email address",
  });
}
```

#### 4. Transforms

A transformation is used to transform the output of a schema parsing into another value. This is useful to transform from a primitive into a class instance for example.

```ts
import * as paw from "paw";

class Name {
  constructor(public readonly value: string) {}
}

const NameSchema = paw
  .string()
  .min(1)
  .transform((ctx) => ctx.ok(new Name(ctx.output)));

const result = NameSchema.safeParse("John Doe");
expect(result.ok).toBeTruthy();
if (resut.ok) {
  expect(result.value).beInstanceOf(NameSchema);
  expect(result.value.value).toStrictEqual("John Doe");
}
```

### Standard Schema

Paw is also [standard schema](https://github.com/standard-schema/standard-schema) compatible. This is useful to integrate with the Typescript ecosystem, such as the [Elysia](https://elysiajs.com/) backend framework.
