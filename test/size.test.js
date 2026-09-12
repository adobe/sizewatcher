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
const { describe, it, before } = require("node:test");
const fs = require("fs");
const path = require("path");
const tmp = require("tmp");
tmp.setGracefulCleanup();

const { getFileSize, getFolderRegex } = require("../lib/size");

describe("size", function() {

    let dir;

    before(function() {
        dir = tmp.dirSync({ unsafeCleanup: true }).name;
        fs.writeFileSync(path.join(dir, "a.txt"), "a".repeat(100));
        fs.mkdirSync(path.join(dir, "sub"));
        fs.writeFileSync(path.join(dir, "sub", "b.txt"), "b".repeat(200));
        fs.mkdirSync(path.join(dir, "sub", "deeper"));
        fs.writeFileSync(path.join(dir, "sub", "deeper", "c.txt"), "c".repeat(300));
        // sibling with same prefix as "sub"
        fs.mkdirSync(path.join(dir, "subfolder"));
        fs.writeFileSync(path.join(dir, "subfolder", "d.txt"), "d".repeat(400));
    });

    describe("getFileSize", function() {

        it("returns the size of a single file", async function() {
            assert.strictEqual(await getFileSize(path.join(dir, "a.txt")), 100);
        });

        it("returns the total size of a folder including nested files", async function() {
            const total = await getFileSize(dir);
            // directories themselves have a platform dependent size, files are exact
            assert.ok(total >= 100 + 200 + 300 + 400, `total ${total} too small`);
        });

        it("ignores matching paths", async function() {
            const total = await getFileSize(dir);
            const withoutSub = await getFileSize(dir, { ignore: getFolderRegex(path.join(dir, "sub")) });
            const subSize = await getFileSize(path.join(dir, "sub"));
            assert.strictEqual(withoutSub, total - subSize);
            // sibling "subfolder" is not ignored
            assert.ok(withoutSub >= 100 + 400);
        });

        it("returns 0 for a nonexistent path", async function() {
            assert.strictEqual(await getFileSize(path.join(dir, "does-not-exist")), 0);
        });
    });

    describe("getFolderRegex", function() {

        it("matches the folder itself and all descendants", function() {
            const regex = getFolderRegex("/repo/.git");
            assert.ok(regex.test("/repo/.git"));
            assert.ok(regex.test("/repo/.git/HEAD"));
            assert.ok(regex.test("/repo/.git/objects/ab/cdef"));
        });

        it("does not match siblings with the same prefix or same name elsewhere", function() {
            const regex = getFolderRegex("/repo/.git");
            assert.ok(!regex.test("/repo/.github"));
            assert.ok(!regex.test("/repo/.gitignore"));
            assert.ok(!regex.test("/repo/.github/workflows/ci.yml"));
            assert.ok(!regex.test("/other/.git"));
            assert.ok(!regex.test("/repo/sub/.git"));
        });

        it("escapes regex special characters in the path", function() {
            const regex = getFolderRegex("/tmp/build (1)+v1.0/[out]");
            assert.ok(regex.test("/tmp/build (1)+v1.0/[out]"));
            assert.ok(regex.test("/tmp/build (1)+v1.0/[out]/file"));
            assert.ok(!regex.test("/tmp/build 1+v1x0/out"));
            assert.ok(!regex.test("/tmp/build (1)+v1.0/o"));
        });
    });
});
