// Regla de dependencias entre capas: domain ← shared ← state ← features ← app.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, normalize, relative, sep } from "node:path";
import { describe, expect, it } from "vitest";

const SRC = join(process.cwd(), "src");
const layerOf = (file) => relative(SRC, file).split(sep)[0];

function files(dir) {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    return statSync(full).isDirectory() ? files(full) : /\.(jsx?)$/.test(name) ? [full] : [];
  });
}

function imports(file) {
  const src = readFileSync(file, "utf8");
  return [...src.matchAll(/(?:from|import)\s*["']([^"']+)["']/g)].map(([, spec]) =>
    spec.startsWith(".") ? { layer: layerOf(normalize(join(dirname(file), spec))), spec } : { layer: null, spec });
}

const RULES = {
  domain: { layers: ["domain"], packages: [] },
  shared: { layers: ["domain", "shared"], packages: ["react", "react-router-dom", "lucide-react"] },
  state: { layers: ["domain", "state"], packages: ["react"] },
  features: { layers: ["domain", "shared", "state", "features"], packages: null },
};

describe("arquitectura del frontend", () => {
  for (const [layer, rule] of Object.entries(RULES)) {
    it(`${layer} solo depende de capas internas`, () => {
      const problems = [];
      for (const file of files(join(SRC, layer))) {
        for (const { layer: target, spec } of imports(file)) {
          const bad = target ? !rule.layers.includes(target) : rule.packages && !rule.packages.includes(spec) && !spec.endsWith(".css");
          if (bad) problems.push(`${relative(SRC, file)} → ${spec}`);
        }
      }
      expect(problems).toEqual([]);
    });
  }

  it("el dominio no usa React ni el navegador", () => {
    for (const file of files(join(SRC, "domain"))) {
      const src = readFileSync(file, "utf8");
      expect(src, file).not.toMatch(/from ["']react|sessionStorage|localStorage|fetch\(|window\./);
    }
  });
});
