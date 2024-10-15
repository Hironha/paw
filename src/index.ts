import { paw, type PawInfer } from "./paw.ts";

type Person = PawInfer<typeof PersonSchema>;

const PersonSchema = paw.object({
  age: paw.number().int().min(0),
  name: paw.string().optional(),
  traits: paw.object({
    bald: paw.boolean().optional(),
    height: paw.string().optional(),
  }),
  pets: paw
    .array(
      paw.object({
        name: paw.string(),
        kind: paw.literal("cat", "dog"),
      }),
    )
    .min(1),
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
