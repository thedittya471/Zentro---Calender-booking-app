import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  mkdir,
  mkdtemp,
  readFile,
  writeFile,
  copyFile,
  rm,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

const root = fileURLToPath(new URL("../", import.meta.url));

test(
  "installed hooks format staged files, reject invalid code and preserve unstaged edits",
  { timeout: 60_000 },
  async (t) => {
    const directory = await mkdtemp(join(tmpdir(), "zentro-hooks-"));
    t.after(() => rm(directory, { recursive: true, force: true }));
    const env = {
      ...process.env,
      HUSKY: "1",
      PATH: `${join(root, "node_modules/.bin")}:${process.env.PATH}`,
      XDG_CONFIG_HOME: directory,
      GIT_CONFIG_GLOBAL: "/dev/null",
      GIT_CONFIG_NOSYSTEM: "1",
    };
    for (const key of [
      "GIT_DIR",
      "GIT_WORK_TREE",
      "GIT_INDEX_FILE",
      "GIT_COMMON_DIR",
    ])
      delete env[key];
    function run(command, args, expected = 0) {
      const result = spawnSync(command, args, {
        cwd: directory,
        env,
        encoding: "utf8",
        timeout: 15_000,
      });
      assert.ifError(result.error);
      if (expected === 0)
        assert.equal(result.status, 0, result.stdout + result.stderr);
      else
        assert.notEqual(
          result.status,
          0,
          "Hook unexpectedly accepted invalid staged content",
        );
      return result.stdout + result.stderr;
    }
    const manifest = JSON.parse(
      await readFile(join(root, "package.json"), "utf8"),
    );
    await writeFile(
      join(directory, "package.json"),
      JSON.stringify(
        {
          private: true,
          type: "module",
          packageManager: manifest.packageManager,
          scripts: {
            prepare: manifest.scripts.prepare,
            "check:staged": manifest.scripts["check:staged"],
          },
          "lint-staged": manifest["lint-staged"],
        },
        null,
        2,
      ) + "\n",
    );
    // Resolve tooling from the project without sharing a mutable dependency directory.
    await writeFile(
      join(directory, "pnpm-workspace.yaml"),
      "verifyDepsBeforeRun: false\n",
    );
    await writeFile(
      join(directory, "eslint.config.mjs"),
      `export { default } from ${JSON.stringify(new URL("../eslint.config.mjs", import.meta.url).href)};\n`,
    );
    await copyFile(
      join(root, ".prettierrc.json"),
      join(directory, ".prettierrc.json"),
    );
    await writeFile(join(directory, ".gitignore"), "node_modules/\n");
    run("git", ["init", "--quiet"]);
    // A disposable initial commit exercises lint-staged's normal stash/restore path.
    run("git", [
      "-c",
      "user.name=Hook fixture",
      "-c",
      "user.email=fixture@example.invalid",
      "-c",
      "commit.gpgSign=false",
      "commit",
      "--quiet",
      "--allow-empty",
      "-m",
      "fixture",
    ]);
    await copyFile(
      join(root, ".prettierignore"),
      join(directory, ".prettierignore"),
    );
    await mkdir(join(directory, ".husky"));
    await copyFile(
      join(root, ".husky/pre-commit"),
      join(directory, ".husky/pre-commit"),
    );
    run("pnpm", ["prepare"]);
    assert.equal(
      run("git", ["config", "--get", "core.hooksPath"]).trim(),
      ".husky/_",
    );

    const file = "example [draft].mjs";
    const valid = "const value = 1;\nconsole.log(value);\n";
    const badFormat = "const value=1;console.log(value)\n";
    const partial = `const value=1;\n${"// Stable context\n".repeat(8)}console.log(value);\n`;
    for (const [label, staged, suffix, formatted, failure] of [
      ["valid", valid, "", valid],
      ["automatic formatting", badFormat, "", valid],
      [
        "lint failure rolls formatting back",
        "missingHookValue( )\n",
        "",
        "",
        /no-undef/,
      ],
      ["invalid syntax", "const = ;\n", "", "", /SyntaxError/],
      [
        "partial staging",
        partial,
        "// Keep this note unstaged.\n",
        partial.replace("value=1", "value = 1"),
      ],
      ["recovered", valid, "", valid],
    ]) {
      await t.test(label, async () => {
        await writeFile(join(directory, file), staged);
        run("git", ["add", "--", file]);
        await writeFile(join(directory, file), staged + suffix);
        const indexBefore = run("git", ["diff", "--cached", "--binary"]);
        const output = run(
          "git",
          ["hook", "run", "pre-commit"],
          failure ? 1 : 0,
        );
        if (failure) assert.match(output, failure);
        assert.equal(
          await readFile(join(directory, file), "utf8"),
          (failure ? staged : formatted) + suffix,
        );
        assert.equal(
          run("git", ["show", `:${file}`]),
          failure ? staged : formatted,
        );
        if (failure)
          assert.equal(
            run("git", ["diff", "--cached", "--binary"]),
            indexBefore,
          );
        assert.equal(
          run("git", ["diff", "--cached", "--name-only"]).trim(),
          file,
        );
        assert.equal(run("git", ["stash", "list"]), "");
      });
    }
  },
);
