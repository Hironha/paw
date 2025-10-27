## Paw

An incomplete implementation of JSON schema parsing inspired by `zod` made to investigate how powerful Typescript type system is and what are it's edge cases. This implementation is meant to be used as a learning resource and not as a production ready library. It's key advantages over `zod` is it's simplicity and performance for safe parsing, since all the safe parse errors are stackless. Also, `Paw` supports immediate parsing, which does not check all the object/array schema and returns an error after encountering the first one.

Paw supports many utility methods to help parsing the values, such as `refine`, `transform` and `check`. The order of execution is: `refine` -> `parsing` -> `check` -> `transform`.

- `refine` is meant to transform some value before validating the schema. It does not support issues.
- `parsing` is done either through `parse` or `safeParse` and validates the value based on the schema.
- `check` is just a simple validation meant to be used when validating the schema is not enough. Supports returning issues with custom messages.
- `transform` transform the value after validating the schema and all `check`s. Primarily used for type driven design.

### Standard Schema

Paw is also [standard schema](https://github.com/standard-schema/standard-schema) compatible. This is useful to integrate with the Typescript ecosystem, such as the [Elysia](https://elysiajs.com/) backend framework.
