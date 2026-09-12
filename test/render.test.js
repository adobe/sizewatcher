/*
 * Copyright 2026 Adobe. All rights reserved.
 * This file is licensed to you under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License. You may obtain a copy
 * of the License at http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software distributed under
 * the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
 * OF ANY KIND, either express or implied. See the License for the specific language
 * governing permissions and limitations under the License.
 */

'use strict';

const assert = require("assert");
const { describe, it, before, after } = require("node:test");
const tmp = require("tmp");
tmp.setGracefulCleanup();

const render = require("../lib/render");
const config = require("../lib/config");
const { version } = require("../package.json");

const BEFORE_SHA = "0123456789abcdef0123456789abcdef01234567";
const AFTER_SHA = "89abcdef0123456789abcdef0123456789abcdef";

// build a deltas array like compare() returns it
function deltas(list, summary) {
    const result = [...list];
    result.before = { branch: "main", sha: BEFORE_SHA };
    result.after = { branch: "feature", sha: AFTER_SHA };
    if (summary !== undefined) {
        result.summary = summary;
    }
    return result;
}

function delta(overrides) {
    return {
        name: "git",
        result: "ok",
        increase: "0.0",
        beforeSize: 1000,
        afterSize: 1000,
        config: {},
        ...overrides
    };
}

describe("render", function() {

    let originalCwd;

    before(function() {
        // no .sizewatcher.yml => default config
        originalCwd = process.cwd();
        process.chdir(tmp.dirSync({ unsafeCleanup: true }).name);
        config.reload();
    });

    after(function() {
        process.chdir(originalCwd);
        config.reload();
    });

    describe("asText", function() {

        it("renders header with branches and shas", function() {
            const text = render.asText(deltas([]));
            assert.ok(text.startsWith("Sizewatcher measured the following changes:\n\n"));
            assert.ok(text.includes(`'main' (sha ${BEFORE_SHA}) => 'feature' (sha ${AFTER_SHA})`));
        });

        it("renders each result with icon, percentage and sizes", function() {
            const text = render.asText(deltas([
                delta({ name: "git", result: "ok", increase: "5.0", beforeSize: 1000, afterSize: 1050 }),
                delta({ name: "node_modules", result: "cheers", increase: "-50.0", beforeSize: 2000, afterSize: 1000 }),
                delta({ name: "npm_package", result: "warn", increase: "40.0", beforeSize: 1000, afterSize: 1400 }),
                delta({ name: "custom", result: "fail", increase: "200.0", beforeSize: 1000, afterSize: 3000 })
            ]));
            assert.ok(text.includes("+ ✅  git: 5.0% (1 kB => 1.05 kB)\n"));
            assert.ok(text.includes("+ 🎉  node_modules: -50.0% (2 kB => 1 kB)\n"));
            assert.ok(text.includes("+ ⚠️  npm_package: 40.0% (1 kB => 1.4 kB)\n"));
            assert.ok(text.includes("+ ❌  custom: 200.0% (1 kB => 3 kB)\n"));
        });

        it("renders details indented under their label", function() {
            const text = render.asText(deltas([
                delta({ detailsLabel: "Largest files", details: "\n10B file1\n 5B file2\n\n" })
            ]));
            assert.ok(text.includes("  Largest files:\n\n  10B file1\n   5B file2\n"), text);
        });

        it("does not render details section if there are no details", function() {
            const text = render.asText(deltas([ delta({ detailsLabel: "Largest files", details: "" }) ]));
            assert.ok(!text.includes("Largest files:"));
        });

        it("renders measurement error from Error object", function() {
            const text = render.asText(deltas([ { name: "git", error: new Error("kaboom") } ]));
            assert.ok(text.includes("+ 🚨 git: measurement error: kaboom\n"));
        });

        it("renders measurement error from plain string", function() {
            const text = render.asText(deltas([ { name: "git", error: "kaboom" } ]));
            assert.ok(text.includes("+ 🚨 git: measurement error: kaboom\n"));
        });
    });

    describe("asMarkdown", function() {

        const SUMMARIES = {
            cheers: ["🎉", "congratulates on the size improvement 📉:", true],
            ok: ["✅", "found no problematic size increases.", false],
            warn: ["⚠️", "detected a size increase 📈:", true],
            fail: ["❌", "detected a problematic size increase 📈:", true],
            error: ["🚨", "had a measurement error:", true]
        };

        for (const [summary, [icon, text, open]] of Object.entries(SUMMARIES)) {
            it(`renders summary '${summary}' ${open ? "expanded" : "collapsed"}`, function() {
                const md = render.asMarkdown(deltas([], summary));
                const firstLine = md.split("\n")[0];
                if (open) {
                    assert.ok(firstLine.startsWith("<details open>"), firstLine);
                } else {
                    assert.match(firstLine, /^<details ?>/);
                }
                assert.ok(firstLine.includes(`<summary>${icon} <a href="https://github.com/adobe/sizewatcher">Sizewatcher</a> ${text}</summary>`), firstLine);
            });
        }

        it("defaults to summary 'ok' if none is set", function() {
            const md = render.asMarkdown(deltas([]));
            assert.match(md.split("\n")[0], /^<details ?><summary>✅ /);
        });

        it("renders increase with plus sign", function() {
            const md = render.asMarkdown(deltas([
                delta({ name: "git", result: "ok", increase: "0.5", beforeSize: 200, afterSize: 201 })
            ]));
            assert.ok(md.includes("&nbsp;&nbsp;&nbsp;✅ <code>git</code> <b>+0.5%</b> (200 B => 201 B)\n\n"), md);
        });

        it("renders decrease", function() {
            const md = render.asMarkdown(deltas([
                delta({ name: "git", result: "cheers", increase: "-50.0", beforeSize: 2000, afterSize: 1000 })
            ]));
            assert.ok(md.includes("🎉 <code>git</code> <b>-50.0%</b> (2 kB => 1 kB)"), md);
        });

        it("renders no changes for zero and near-zero increase", function() {
            const md = render.asMarkdown(deltas([
                delta({ name: "a", increase: "0.0", afterSize: 1000 }),
                delta({ name: "b", increase: (-0.04).toFixed(1), afterSize: 500 }),
                delta({ name: "c", increase: "0.09", afterSize: 200 })
            ]));
            assert.ok(md.includes("<code>a</code> has no changes (1 kB)"), md);
            assert.ok(md.includes("<code>b</code> has no changes (500 B)"), md);
            assert.ok(md.includes("<code>c</code> has no changes (200 B)"), md);
        });

        it("renders details as collapsible with newlines as <br>", function() {
            const md = render.asMarkdown(deltas([
                delta({ name: "git", detailsLabel: "Largest files", details: "\n10B file1\n5B file2\n" })
            ]));
            assert.ok(md.includes("<details><summary>✅ <code>git</code> has no changes (1 kB)</summary><br>Largest files:<pre>10B file1<br>5B file2</pre></details>\n\n"), md);
            assert.ok(!md.includes("&nbsp;&nbsp;&nbsp;✅"));
        });

        it("renders empty details like no details", function() {
            const md = render.asMarkdown(deltas([
                delta({ name: "git", detailsLabel: "Largest files", details: "" })
            ]));
            assert.ok(md.includes("&nbsp;&nbsp;&nbsp;✅ <code>git</code>"), md);
            assert.ok(!md.includes("Largest files"));
        });

        it("renders measurement errors", function() {
            const md = render.asMarkdown(deltas([
                { name: "git", error: new Error("kaboom") },
                { name: "custom", error: "plain failure" }
            ], "error"));
            assert.ok(md.includes("&nbsp;&nbsp;&nbsp;🚨 <code>git</code> measurement error: kaboom\n\n"), md);
            assert.ok(md.includes("&nbsp;&nbsp;&nbsp;🚨 <code>custom</code> measurement error: plain failure\n\n"), md);
        });

        it("renders notes with branches, version and effective configuration", function() {
            const md = render.asMarkdown(deltas([]));
            assert.ok(md.includes("<details><summary>Notes</summary><br>\n\n"));
            assert.ok(md.includes(`- PR branch: \`feature\` @ ${AFTER_SHA}\n`));
            assert.ok(md.includes(`- Base branch: \`main\` @ ${BEFORE_SHA}\n`));
            assert.ok(md.includes(`- Sizewatcher v${version}\n`));
            assert.ok(md.includes(`- Effective Configuration:\n\n\`\`\`yaml\n${config.asYaml()}\`\`\`\n`));
            assert.ok(md.endsWith("</details>\n\n</blockquote></p>\n</details>\n"));
        });
    });
});
