## Paw

An incomplete implementation of JSON schema parsing inspired by `zod` made to investigate how powerful Typescript type system is and what are it's edge cases. This implementation is meant to be used as a learning resource and not as a production ready library. It's key advantages over `zod` is it's simplicity and performance for safe parsing, since all the safe parse errors are stackless.

Paw supports many utility methods to help parsing the values, such as `refine`, `transform` and `check`. The order of execution is: `refine` -> `parsing` -> `check` -> `transform`.
