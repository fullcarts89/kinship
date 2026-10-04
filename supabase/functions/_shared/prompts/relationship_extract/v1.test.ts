// The structured-output schema must fit the API's published limits, or every
// request is refused with a 400 before the model runs (found by the first
// live smoke run: 21 nullable parameters against a limit of 16).
// Run: deno test supabase/functions
import { SCHEMA } from "./v1.ts";

type Node = Record<string, unknown>;

function count(node: Node, acc = { optional: 0, unions: 0 }) {
  const props = node.properties as Record<string, Node> | undefined;
  if (props) {
    const required = new Set((node.required as string[] | undefined) ?? []);
    for (const [name, child] of Object.entries(props)) {
      if (!required.has(name)) acc.optional++;
      if (Array.isArray(child.anyOf) || Array.isArray(child.type)) acc.unions++;
    }
  }
  for (const v of Object.values(node)) {
    if (Array.isArray(v)) for (const x of v) if (x && typeof x === "object") count(x as Node, acc);
    if (v && typeof v === "object" && !Array.isArray(v)) count(v as Node, acc);
  }
  return acc;
}

Deno.test("relationship_extract schema fits the structured-output limits", () => {
  const { optional, unions } = count(SCHEMA as unknown as Node);
  if (optional > 24) throw new Error(`${optional} optional parameters (limit 24)`);
  if (unions > 16) throw new Error(`${unions} parameters with union types (limit 16)`);
});

Deno.test("every object in the schema closes additionalProperties", () => {
  const open: string[] = [];
  const walk = (n: Node, path: string) => {
    if (n.type === "object" && n.additionalProperties !== false) open.push(path);
    for (const [k, v] of Object.entries(n)) {
      if (Array.isArray(v)) v.forEach((x, i) => x && typeof x === "object" && walk(x as Node, `${path}.${k}[${i}]`));
      else if (v && typeof v === "object") walk(v as Node, `${path}.${k}`);
    }
  };
  walk(SCHEMA as unknown as Node, "$");
  if (open.length) throw new Error(`open objects: ${open.join(", ")}`);
});
