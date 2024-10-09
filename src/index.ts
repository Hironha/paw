import { paw } from "./paw";

const PersonSchema = paw.object({
  age: paw.number(),
  name: paw.string(),
  traits: paw.object({
    bald: paw.boolean(),
    height: paw.string(),
  }),
});

function main(): void {
  const result = PersonSchema.safeParse({
    age: 13,
    name: "hironha",
    traits: {
      height: "short",
    },
  });

  if (result.kind === "err") {
    console.error(result.err);
  } else {
    console.debug(result.value);
  }
}

main();
