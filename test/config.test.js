/*
 * Copyright 2020 Adobe. All rights reserved.
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
const fs = require("fs");
const path = require("path");
const tmp = require("tmp");
tmp.setGracefulCleanup();

const config = require("../lib/config");

const CONFIG_FILE = ".sizewatcher.yml";

// switch into a clean new temporary directory, optionally with a config file
function mockConfig(content) {
    const tmpDir = tmp.dirSync({unsafeCleanup: true}).name;
    process.chdir(tmpDir);
    if (content !== undefined) {
        fs.writeFileSync(path.join(tmpDir, CONFIG_FILE), content);
    }
}

describe("config", function() {

    let originalCwd;

    beforeEach(function() {
        originalCwd = process.cwd();
    });

    afterEach(function() {
        process.chdir(originalCwd);
    });

    it("loads default config if no config file exists", function() {
        mockConfig();
        const cfg = config.reload();
        assert.strictEqual(typeof cfg, "object");
        assert.deepStrictEqual(cfg.limits, {
            fail: "100%",
            warn: "30%",
            ok: "-10%"
        });
        assert.ok(cfg.report.githubComment);
        assert.ok(!cfg.report.githubStatus);
        assert.strictEqual(typeof cfg.comparators, "object");
    });

    it("loads config file that is empty", function() {
        mockConfig("");
        const cfg = config.reload();
        assert.strictEqual(typeof cfg, "object");
        assert.deepStrictEqual(cfg.limits, {
            fail: "100%",
            warn: "30%",
            ok: "-10%"
        });
        assert.ok(cfg.report.githubComment);
        assert.ok(!cfg.report.githubStatus);
        assert.strictEqual(typeof cfg.comparators, "object");
    });

    it("loads config file with percentage limits", function() {
        mockConfig(`
limits:
    fail: 42%
`);
        const cfg = config.reload();
        assert.strictEqual(typeof cfg, "object");
        assert.deepStrictEqual(cfg.limits, {
            fail: "42%",
            warn: "30%",
            ok: "-10%"
        });
    });

    it("loads config file with integer limits", function() {
        mockConfig(`
limits:
    fail: 1000
    warn: 100
    ok: 50
`);
        const cfg = config.reload();
        assert.strictEqual(typeof cfg, "object");
        assert.deepStrictEqual(cfg.limits, {
            fail: 1000,
            warn: 100,
            ok: 50
        });
    });

    it("loads config file with reportStatus", function() {
        mockConfig(`
report:
    githubComment: false
    githubStatus: true
`);
        const cfg = config.reload();
        assert.strictEqual(typeof cfg, "object");
        assert.strictEqual(cfg.report.githubComment, false);
        assert.strictEqual(cfg.report.githubStatus, true);
    });

    it("returns default config in asYaml() if no config file exists", function() {
        mockConfig();
        config.reload();
        const yaml = config.asYaml();
        assert.strictEqual(yaml, `limits:
  fail: 100%
  warn: 30%
  ok: '-10%'
report:
  githubComment: true
  githubStatus: false
comparators: {}
`);
    });

    it("handles a single custom comparators", function() {
        mockConfig(`
comparators:
  custom:
    name: mine
    path: build/file
`);
        const cfg = config.reload();
        assert.strictEqual(typeof cfg, "object");
        assert.strictEqual(typeof cfg.comparators.custom, "object");
        assert.strictEqual(cfg.comparators.custom.name, "mine");
        assert.strictEqual(cfg.comparators.custom.path, "build/file");
    });

    it("handles a multiple custom comparators", function() {
        mockConfig(`
comparators:
  custom:
    - name: mine
      path: build/file
    - path: build/file2
`);
        const cfg = config.reload();
        assert.strictEqual(typeof cfg, "object");
        assert.ok(Array.isArray(cfg.comparators.custom));
        assert.strictEqual(cfg.comparators.custom[0].name, "mine");
        assert.strictEqual(cfg.comparators.custom[0].path, "build/file");
        assert.strictEqual(cfg.comparators.custom[1].path, "build/file2");
    });
});
