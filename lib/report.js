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

const render = require("./render");
const github = require("./github");

function parseRepoSlug(slug) {
    const repo = slug.split("/", 2);
    return {
        owner: repo[0],
        repo: repo[1]
    };
}

async function getGithubRepo() {
    if (process.env.GITHUB_REPOSITORY) {
        return parseRepoSlug(process.env.GITHUB_REPOSITORY);
    }
    if (process.env.TRAVIS_REPO_SLUG) {
        return parseRepoSlug(process.env.TRAVIS_REPO_SLUG);
    }
    if (process.env.CIRCLE_PROJECT_REPONAME) {
        return {
            owner: process.env.CIRCLE_PROJECT_USERNAME,
            repo: process.env.CIRCLE_PROJECT_REPONAME
        };
    }
}

function substringAfter(str, delim) {
    const pos = str.lastIndexOf(delim);
    if (pos >= 0) {
        return str.substring(pos + 1);
    }
}

async function getPullRequestId(repo, branch) {
    if (process.env.TRAVIS_PULL_REQUEST && process.env.TRAVIS_PULL_REQUEST !== "false") {
        return process.env.TRAVIS_PULL_REQUEST;
    }
    if (process.env.CIRCLE_PULL_REQUEST) {
        return substringAfter(process.env.CIRCLE_PULL_REQUEST, "/");
    }

    return github.getPullRequestForBranch(repo.owner, repo.repo, branch);
}

async function reportAsGithubComment(repo, deltas) {
    const after = deltas.after;

    const prNumber = await getPullRequestId(repo, after.branch);
    console.log("pr number: ", prNumber);

    if (!prNumber) {
        console.log("Cannot identify pull request. Cannot comment on PR.");
        return;
    }

    const markdown = render.asMarkdown(deltas);
    // console.log("Markdown:");
    // console.log(markdown);

    const body = `<!-- sizewatcher @ ${after.sha} -->\n\n${markdown}`;

    await github.issueComment(repo.owner, repo.repo, prNumber, body, comment => {
        const match = comment.body.match(/<!--\s+sizewatcher @ (\b[0-9a-f]{5,40}\b).*-->/);
        if (match) {
            return match[1] === after.sha ? "keep" : "update";
        } else {
            return false;
        }
    });

}

async function report(deltas) {
    console.log();
    console.log(render.asText(deltas));

    const repo = await getGithubRepo();

    if (!repo) {
        console.error("Error: Cannot identify github repository. Cannot comment on PR or update status checks in github.");
        return;
    }

    if (!process.env.GITHUB_TOKEN) {
        console.error("Error: Missing GITHUB_TOKEN environment variable. Cannot comment on PR or update status checks in github.");
        return;
    }

    await reportAsGithubComment(repo, deltas);

    // TODO: report as status check
}

module.exports = report;