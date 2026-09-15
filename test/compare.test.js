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

const config = require("../lib/config");
const { exceeds, processDeltas } = require("../lib/compare");

function delta(beforeSize, afterSize, overrides) {
    return {
        name: "test",
        config: {},
        beforeSize,
        afterSize,
        ...overrides
    };
}

describe("compare", function() {

    let originalCwd;

    before(function() {
        // no .sizewatcher.yml => default config (fail: 100%, warn: 30%, ok: -10%)
        originalCwd = process.cwd();
        process.chdir(tmp.dirSync({ unsafeCleanup: true }).name);
        config.reload();
    });

    after(function() {
        process.chdir(originalCwd);
        config.reload();
    });

    describe("exceeds", function() {

        it("compares percentage limits against the increase", function() {
            assert.strictEqual(exceeds(0, 50, "50%"), true);
            assert.strictEqual(exceeds(0, 50.1, "50%"), true);
            assert.strictEqual(exceeds(0, 49.9, "50%"), false);
            assert.strictEqual(exceeds(0, -10, "-10%"), true);
            assert.strictEqual(exceeds(0, -10.1, "-10%"), false);
        });

        it("ignores whitespace around percentage limits", function() {
            assert.strictEqual(exceeds(0, 50, " 50% "), true);
            assert.strictEqual(exceeds(0, 49, " 50% "), false);
        });

        it("supports fractional percentage limits", function() {
            assert.strictEqual(exceeds(0, 0.5, "0.5%"), true);
            assert.strictEqual(exceeds(0, 0.4, "0.5%"), false);
        });

        it("compares byte string limits against the after size", function() {
            // decimal units
            assert.strictEqual(exceeds(10000, 0, "10 KB"), true);
            assert.strictEqual(exceeds(9999, 0, "10 KB"), false);
            // binary units
            assert.strictEqual(exceeds(10240, 0, "10 KiB"), true);
            assert.strictEqual(exceeds(10239, 0, "10 KiB"), false);
            assert.strictEqual(exceeds(1024 * 1024, -99, "1 MiB"), true);
            assert.strictEqual(exceeds(1000 * 1000, 0, "1 MB"), true);
        });

        it("never exceeds an unparseable string limit", function() {
            assert.strictEqual(exceeds(Number.MAX_SAFE_INTEGER, 1000, "lots"), false);
            assert.strictEqual(exceeds(Number.MAX_SAFE_INTEGER, 1000, ""), false);
        });

        it("compares absolute number limits against the after size", function() {
            assert.strictEqual(exceeds(1000, 0, 1000), true);
            assert.strictEqual(exceeds(1001, -50, 1000), true);
            assert.strictEqual(exceeds(999, 500, 1000), false);
        });
    });

    describe("processDeltas", function() {

        it("calculates the increase percentage", function() {
            const deltas = processDeltas([
                delta(1000, 1500),
                delta(1000, 500),
                delta(1000, 1000),
                delta(300, 400)
            ]);
            assert.strictEqual(deltas[0].increase, "50.0");
            assert.strictEqual(deltas[1].increase, "-50.0");
            assert.strictEqual(deltas[2].increase, "0.0");
            assert.strictEqual(deltas[3].increase, "33.3");
        });

        it("handles zero sizes", function() {
            const deltas = processDeltas([
                delta(0, 0),
                delta(1000, 0),
                delta(0, 1000)
            ]);
            // nothing before, nothing after
            assert.strictEqual(deltas[0].increase, "0.0");
            assert.strictEqual(deltas[0].result, "ok");
            // everything removed
            assert.strictEqual(deltas[1].increase, "-100.0");
            assert.strictEqual(deltas[1].result, "cheers");
            // newly added: counts as 100% increase, which fails with the default 100% limit
            assert.strictEqual(deltas[2].increase, "100.0");
            assert.strictEqual(deltas[2].result, "fail");
        });

        it("classifies results using the default limits", function() {
            const deltas = processDeltas([
                delta(1000, 2000),   // +100.0% => fail
                delta(1000, 1999),   // +99.9%  => warn
                delta(1000, 1300),   // +30.0%  => warn
                delta(1000, 1299),   // +29.9%  => ok
                delta(1000, 1000),   //  0.0%   => ok
                delta(1000, 900),    // -10.0%  => ok
                delta(1000, 899)     // -10.1%  => cheers
            ]);
            assert.deepStrictEqual(deltas.map(d => d.result), ["fail", "warn", "warn", "ok", "ok", "ok", "cheers"]);
            assert.strictEqual(deltas.summary, "fail");
        });

        it("lets comparator specific limits override the global limits", function() {
            const deltas = processDeltas([
                delta(1000, 1500, { config: { limits: { fail: "40%" } } }),
                delta(1000, 1500, { config: { limits: { warn: "60%" } } }),
                delta(1000, 1500, { config: { limits: { fail: 1400 } } }),
                delta(1000, 1500)
            ]);
            assert.strictEqual(deltas[0].result, "fail");
            assert.strictEqual(deltas[1].result, "ok");
            assert.strictEqual(deltas[2].result, "fail");
            assert.strictEqual(deltas[3].result, "warn");
        });

        it("counts errors and does not touch the error delta", function() {
            const error = new Error("boom");
            const deltas = processDeltas([
                { name: "broken", error },
                delta(1000, 1000)
            ]);
            assert.strictEqual(deltas[0].error, error);
            assert.strictEqual(deltas[0].increase, undefined);
            assert.strictEqual(deltas[0].result, undefined);
            assert.strictEqual(deltas[1].result, "ok");
            assert.strictEqual(deltas.summary, "error");
        });

        it("summarizes with precedence error > fail > warn > cheers > ok", function() {
            assert.strictEqual(processDeltas([]).summary, "ok");
            assert.strictEqual(processDeltas([ delta(1000, 1000) ]).summary, "ok");
            assert.strictEqual(processDeltas([ delta(1000, 1000), delta(1000, 500) ]).summary, "cheers");
            assert.strictEqual(processDeltas([ delta(1000, 500), delta(1000, 1400) ]).summary, "warn");
            assert.strictEqual(processDeltas([ delta(1000, 1400), delta(1000, 3000) ]).summary, "fail");
            assert.strictEqual(processDeltas([ delta(1000, 3000), { name: "x", error: "boom" } ]).summary, "error");
        });

        it("keeps before and after information on the deltas", function() {
            const deltas = [ delta(1, 1) ];
            deltas.before = { branch: "main" };
            deltas.after = { branch: "feature" };
            const result = processDeltas(deltas);
            assert.strictEqual(result, deltas);
            assert.strictEqual(result.before.branch, "main");
            assert.strictEqual(result.after.branch, "feature");
        });
    });
});
