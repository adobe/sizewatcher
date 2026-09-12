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
const { describe, it, before, after, beforeEach, afterEach } = require("node:test");
const fs = require("fs");
const path = require("path");
const tmp = require("tmp");
tmp.setGracefulCleanup();
const { captured } = require("./capture-console");
const FakeGithubApi = require("./fake-github-api");
const config = require("../lib/config");

const fake = new FakeGithubApi();
// lib/report.js is loaded lazily (after fake.start()) since lib/github.js reads
// GITHUB_API_URL and GITHUB_TOKEN at require time
function report(deltas) {
    return require("../lib/report")(deltas);
}

const BEFORE_SHA = "0123456789abcdef0123456789abcdef01234567";
const AFTER_SHA = "89abcdef0123456789abcdef0123456789abcdef";
const OTHER_SHA = "ffffffffffffffffffffffffffffffffffffffff";

const MARKER = `<!-- sizewatcher @ ${AFTER_SHA} -->`;

function deltas(summary = "ok") {
    const result = [{
        name: "git",
        result: summary === "error" ? "ok" : summary,
        increase: "0.0",
        beforeSize: 1000,
        afterSize: 1000,
        config: {}
    }];
    if (summary === "error") {
        result.push({ name: "custom", error: new Error("boom") });
    }
    result.before = { branch: "main", sha: BEFORE_SHA };
    result.after = { branch: "feature", sha: AFTER_SHA };
    result.summary = summary;
    return result;
}

// switch into a clean new temporary directory, optionally with a config file
function mockConfig(content) {
    const tmpDir = tmp.dirSync({ unsafeCleanup: true }).name;
    process.chdir(tmpDir);
    if (content !== undefined) {
        fs.writeFileSync(path.join(tmpDir, ".sizewatcher.yml"), content);
    }
    config.reload();
}

function cleanEnvVars() {
    delete process.env.GITHUB_REPOSITORY;
    delete process.env.TRAVIS_REPO_SLUG;
    delete process.env.CIRCLE_PROJECT_USERNAME;
    delete process.env.CIRCLE_PROJECT_REPONAME;
    delete process.env.TRAVIS_PULL_REQUEST;
    delete process.env.CIRCLE_PULL_REQUEST;
}

function requestLog() {
    return fake.requests.map(r => `${r.method} ${r.path}`);
}

describe("report", function() {

    let originalCwd;

    before(async function() {
        originalCwd = process.cwd();
        await fake.start();
    });

    after(async function() {
        await fake.stop();
        process.chdir(originalCwd);
        config.reload();
    });

    beforeEach(function() {
        cleanEnvVars();
        fake.reset();
        mockConfig();
    });

    afterEach(function() {
        cleanEnvVars();
        process.env.GITHUB_TOKEN = fake.token;
    });

    it("prints the text report", captured(async (t, output) => {
        process.env.GITHUB_REPOSITORY = "adobe/repo";
        process.env.TRAVIS_PULL_REQUEST = "7";

        await report(deltas());

        assert.ok(output.stdout.includes("Sizewatcher measured the following changes:"));
        assert.ok(output.stdout.includes(`'main' (sha ${BEFORE_SHA}) => 'feature' (sha ${AFTER_SHA})`));
        assert.ok(output.stdout.includes("+ ✅  git: 0.0% (1 kB => 1 kB)"));
    }));

    it("does nothing else if github comment and status are disabled", captured(async (t, output) => {
        mockConfig(`
report:
  githubComment: false
  githubStatus: false
`);
        process.env.GITHUB_REPOSITORY = "adobe/repo";
        process.env.TRAVIS_PULL_REQUEST = "7";

        await report(deltas());

        assert.ok(output.stdout.includes("Sizewatcher measured the following changes:"));
        assert.ok(!output.any.includes("Error"));
        assert.deepStrictEqual(requestLog(), []);
    }));

    it("fails gracefully if the github repository cannot be identified", captured(async (t, output) => {
        process.env.TRAVIS_PULL_REQUEST = "7";

        await report(deltas());

        assert.ok(output.stderr.includes("Error: Cannot identify github repository. Cannot comment on PR or update status checks in github."));
        assert.deepStrictEqual(requestLog(), []);
    }));

    it("fails gracefully if GITHUB_TOKEN is missing", captured(async (t, output) => {
        process.env.GITHUB_REPOSITORY = "adobe/repo";
        process.env.TRAVIS_PULL_REQUEST = "7";
        delete process.env.GITHUB_TOKEN;

        await report(deltas());

        assert.ok(output.stderr.includes("Error: Missing GITHUB_TOKEN environment variable. Cannot comment on PR or update status checks in github."));
        assert.deepStrictEqual(requestLog(), []);
    }));

    describe("github comment", function() {

        it("comments on the PR identified by github actions env vars", captured(async () => {
            process.env.GITHUB_REPOSITORY = "adobe/repo";
            process.env.TRAVIS_PULL_REQUEST = "7";

            await report(deltas());

            assert.deepStrictEqual(requestLog(), [
                "GET /repos/adobe/repo/issues/7/comments",
                "POST /repos/adobe/repo/issues/7/comments"
            ]);
            const { body } = fake.requests[1].body;
            assert.ok(body.startsWith(`${MARKER}\n\n`), body);
            assert.ok(body.includes("<details"), body);
            assert.ok(body.includes("<code>git</code>"), body);
            assert.ok(body.includes(`- PR branch: \`feature\` @ ${AFTER_SHA}`), body);
        }));

        it("uses travis repo slug and ignores TRAVIS_PULL_REQUEST=false", captured(async () => {
            process.env.TRAVIS_REPO_SLUG = "travis/slug";
            process.env.TRAVIS_PULL_REQUEST = "false";
            process.env.CIRCLE_PULL_REQUEST = "https://github.com/travis/slug/pull/9";

            await report(deltas());

            assert.deepStrictEqual(requestLog(), [
                "GET /repos/travis/slug/issues/9/comments",
                "POST /repos/travis/slug/issues/9/comments"
            ]);
        }));

        it("uses circleci project env vars and looks up the PR via the api", captured(async () => {
            process.env.CIRCLE_PROJECT_USERNAME = "circle";
            process.env.CIRCLE_PROJECT_REPONAME = "project";
            fake.pulls = [{ number: 5 }];

            await report(deltas());

            assert.deepStrictEqual(requestLog(), [
                "GET /repos/circle/project/pulls",
                "GET /repos/circle/project/issues/5/comments",
                "POST /repos/circle/project/issues/5/comments"
            ]);
            assert.deepStrictEqual(fake.requests[0].query, {
                head: "circle:feature",
                state: "open",
                sort: "updated"
            });
        }));

        it("fails gracefully if no PR can be found via the api", captured(async (t, output) => {
            process.env.GITHUB_REPOSITORY = "adobe/repo";
            fake.pulls = [];

            await report(deltas());

            assert.ok(output.stdout.includes("Cannot identify pull request. Cannot comment on PR."));
            assert.deepStrictEqual(requestLog(), [
                "GET /repos/adobe/repo/pulls"
            ]);
        }));

        it("keeps an existing comment for the same sha", captured(async () => {
            process.env.GITHUB_REPOSITORY = "adobe/repo";
            process.env.TRAVIS_PULL_REQUEST = "7";
            fake.comments = [
                { id: 10, body: "some other comment" },
                { id: 11, body: `${MARKER}\n\nprevious report` }
            ];

            await report(deltas());

            assert.deepStrictEqual(requestLog(), [
                "GET /repos/adobe/repo/issues/7/comments"
            ]);
        }));

        it("updates an existing comment for a different sha", captured(async () => {
            process.env.GITHUB_REPOSITORY = "adobe/repo";
            process.env.TRAVIS_PULL_REQUEST = "7";
            fake.comments = [
                { id: 10, body: "some other comment" },
                { id: 11, body: `<!-- sizewatcher @ ${OTHER_SHA} -->\n\nprevious report` },
                { id: 12, body: `<!-- sizewatcher @ ${OTHER_SHA} -->\n\nduplicate report` }
            ];

            await report(deltas());

            assert.deepStrictEqual(requestLog(), [
                "GET /repos/adobe/repo/issues/7/comments",
                "PATCH /repos/adobe/repo/issues/comments/11"
            ]);
            assert.ok(fake.requests[1].body.body.startsWith(MARKER));
        }));

        it("creates a new comment if existing comments are unrelated", captured(async () => {
            process.env.GITHUB_REPOSITORY = "adobe/repo";
            process.env.TRAVIS_PULL_REQUEST = "7";
            fake.comments = [
                { id: 10, body: "some other comment" },
                { id: 11, body: "<!-- another tool @ abcdef -->" }
            ];

            await report(deltas());

            assert.deepStrictEqual(requestLog(), [
                "GET /repos/adobe/repo/issues/7/comments",
                "POST /repos/adobe/repo/issues/7/comments"
            ]);
        }));
    });

    describe("github status", function() {

        const STATUS_CONFIG = `
report:
  githubStatus: true
`;

        const EXPECTED = {
            cheers: ["success", "Size is decreasing, perfect!"],
            ok: ["success", "Size changes are ok."],
            warn: ["success", "Size is increasing, but still ok."],
            fail: ["failure", "Size increase is too high!"],
            error: ["error", "Measurement error, see PR comment."]
        };

        for (const [summary, [state, description]] of Object.entries(EXPECTED)) {
            it(`sets commit status '${state}' for summary '${summary}' linking to the comment`, captured(async () => {
                mockConfig(STATUS_CONFIG);
                process.env.GITHUB_REPOSITORY = "adobe/repo";
                process.env.TRAVIS_PULL_REQUEST = "7";

                await report(deltas(summary));

                assert.deepStrictEqual(requestLog(), [
                    "GET /repos/adobe/repo/issues/7/comments",
                    "POST /repos/adobe/repo/issues/7/comments",
                    `POST /repos/adobe/repo/statuses/${AFTER_SHA}`
                ]);
                assert.deepStrictEqual(fake.requests[2].body, {
                    state,
                    context: "Sizewatcher",
                    description,
                    target_url: "https://github.com/adobe/repo/pull/7#issuecomment-1000"
                });
            }));
        }

        it("sets commit status without comment if comments are disabled", captured(async () => {
            mockConfig(`
report:
  githubComment: false
  githubStatus: true
`);
            process.env.GITHUB_REPOSITORY = "adobe/repo";

            await report(deltas("warn"));

            assert.deepStrictEqual(requestLog(), [
                `POST /repos/adobe/repo/statuses/${AFTER_SHA}`
            ]);
            assert.deepStrictEqual(fake.requests[0].body, {
                state: "success",
                context: "Sizewatcher",
                description: "Size is increasing, but still ok."
            });
        }));
    });
});
