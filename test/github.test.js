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
const { describe, it, before, after, beforeEach } = require("node:test");
const FakeGithubApi = require("./fake-github-api");

const fake = new FakeGithubApi();
// loaded in before() since lib/github.js reads GITHUB_API_URL and GITHUB_TOKEN at require time
let github;

describe("github", function() {

    before(async function() {
        await fake.start();
        github = require("../lib/github");
    });

    after(async function() {
        await fake.stop();
    });

    beforeEach(function() {
        fake.reset();
    });

    describe("getPullRequestForBranch", function() {

        it("returns the number of the first open pull request for a branch", async function() {
            fake.pulls = [{ number: 42 }, { number: 43 }];

            const number = await github.getPullRequestForBranch("adobe", "repo", "feature");

            assert.strictEqual(number, 42);
            assert.strictEqual(fake.requests.length, 1);
            const [req] = fake.requests;
            assert.strictEqual(req.method, "GET");
            assert.strictEqual(req.path, "/repos/adobe/repo/pulls");
            assert.deepStrictEqual(req.query, {
                head: "adobe:feature",
                state: "open",
                sort: "updated"
            });
            assert.strictEqual(req.headers.authorization, `token ${fake.token}`);
        });

        it("returns undefined if there is no pull request", async function() {
            fake.pulls = [];

            const number = await github.getPullRequestForBranch("adobe", "repo", "feature");

            assert.strictEqual(number, undefined);
            assert.strictEqual(fake.requests.length, 1);
        });
    });

    describe("issueComment", function() {

        it("creates a new comment without matcher", async function() {
            const comment = await github.issueComment("adobe", "repo", 7, "hello");

            assert.strictEqual(comment.html_url, "https://github.com/adobe/repo/pull/7#issuecomment-1000");
            assert.strictEqual(fake.requests.length, 1);
            const [req] = fake.requests;
            assert.strictEqual(req.method, "POST");
            assert.strictEqual(req.path, "/repos/adobe/repo/issues/7/comments");
            assert.deepStrictEqual(req.body, { body: "hello" });
            assert.strictEqual(req.headers.authorization, `token ${fake.token}`);
        });

        it("updates the first existing comment the matcher selects", async function() {
            fake.comments = [
                { id: 1, body: "other" },
                { id: 2, body: "match" },
                { id: 3, body: "match" }
            ];

            const comment = await github.issueComment("adobe", "repo", 7, "new body",
                c => c.body === "match" ? "update" : false);

            assert.strictEqual(comment.id, 2);
            assert.strictEqual(comment.body, "new body");
            assert.deepStrictEqual(fake.requests.map(r => `${r.method} ${r.path}`), [
                "GET /repos/adobe/repo/issues/7/comments",
                "PATCH /repos/adobe/repo/issues/comments/2"
            ]);
            assert.deepStrictEqual(fake.requests[0].query, { per_page: "100" });
            assert.deepStrictEqual(fake.requests[1].body, { body: "new body" });
        });

        it("keeps an existing comment the matcher selects", async function() {
            fake.comments = [
                { id: 1, body: "other" },
                { id: 2, body: "keep me" }
            ];

            const comment = await github.issueComment("adobe", "repo", 7, "new body",
                c => c.body === "keep me" ? "keep" : false);

            assert.strictEqual(comment.id, 2);
            assert.strictEqual(comment.body, "keep me");
            assert.deepStrictEqual(fake.requests.map(r => r.method), ["GET"]);
        });

        it("creates a new comment if the matcher selects none", async function() {
            fake.comments = [
                { id: 1, body: "other" },
                { id: 2, body: "another" }
            ];
            const seen = [];

            const comment = await github.issueComment("adobe", "repo", 7, "new body",
                c => { seen.push(c.id); return false; });

            assert.deepStrictEqual(seen, [1, 2]);
            assert.strictEqual(comment.id, 1000);
            assert.deepStrictEqual(fake.requests.map(r => r.method), ["GET", "POST"]);
        });

        it("creates a new comment if there are no comments yet", async function() {
            const comment = await github.issueComment("adobe", "repo", 7, "new body", () => "update");

            assert.strictEqual(comment.id, 1000);
            assert.deepStrictEqual(fake.requests.map(r => r.method), ["GET", "POST"]);
        });

        it("rejects with the api error", async function() {
            fake.failNext = { status: 403, message: "Resource not accessible by integration" };

            await assert.rejects(
                github.issueComment("adobe", "repo", 7, "hello"),
                err => {
                    assert.strictEqual(err.status, 403);
                    assert.match(err.message, /Resource not accessible by integration/);
                    return true;
                }
            );
        });
    });

    describe("setCommitStatus", function() {

        it("creates a commit status", async function() {
            const sha = "0123456789abcdef0123456789abcdef01234567";

            await github.setCommitStatus("adobe", "repo", sha, "failure", "Sizewatcher", "Too big", "https://example.com/comment");

            assert.strictEqual(fake.requests.length, 1);
            const [req] = fake.requests;
            assert.strictEqual(req.method, "POST");
            assert.strictEqual(req.path, `/repos/adobe/repo/statuses/${sha}`);
            assert.deepStrictEqual(req.body, {
                state: "failure",
                context: "Sizewatcher",
                description: "Too big",
                target_url: "https://example.com/comment"
            });
        });

        it("omits the target url if not set", async function() {
            const sha = "0123456789abcdef0123456789abcdef01234567";

            await github.setCommitStatus("adobe", "repo", sha, "success", "Sizewatcher", "All good");

            assert.deepStrictEqual(fake.requests[0].body, {
                state: "success",
                context: "Sizewatcher",
                description: "All good"
            });
        });
    });
});
