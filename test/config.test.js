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
const mockFs = require("mock-fs");
const config = require("../lib/config");

describe("config", function() {

    afterEach(function() {
        mockFs.restore();
    });

    it("loads default config if no config file exists", function() {
        const cfg = config.reload();
        assert.strictEqual(typeof cfg, "object");
        assert.deepStrictEqual(cfg.limits, {
            fail: "50%",
            warn: "10%",
            ok: "-10%"
        });
    });

    it("loads config file if exists", function() {
        mockFs({
            ".sizewatcher.yml":
`
limits:
    fail: 42%
`
        });
        const cfg = config.reload();
        assert.strictEqual(typeof cfg, "object");
        assert.deepStrictEqual(cfg.limits, {
            fail: "42%",
            warn: "10%",
            ok: "-10%"
        });
    });

    it("loads config file with integer limits", function() {
        mockFs({
            ".sizewatcher.yml":
`
limits:
    fail: 1000
    warn: 100
    ok: 50
`
        });
        const cfg = config.reload();
        assert.strictEqual(typeof cfg, "object");
        assert.deepStrictEqual(cfg.limits, {
            fail: 1000,
            warn: 100,
            ok: 50
        });
    });
});