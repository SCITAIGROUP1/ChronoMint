import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const declarationPath = join(
  dirname(fileURLToPath(import.meta.url)),
  "../../../packages/config-typescript/css-modules.d.ts"
);

describe("plain CSS side-effect imports", () => {
  it("declares *.css so react-grid-layout styles typecheck", () => {
    const dts = readFileSync(declarationPath, "utf8");
    expect(dts).toContain('declare module "*.css"');
  });
});
