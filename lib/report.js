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

const debug = require("debug")("sizewatcher");
const render = require("./render");
const github = require("./github");

const STATUS_TEXTS = {
    great: "decreasing, perfect!",
    ok: "ok.",
    warn: "increasing, but still ok.",
    bad: "too high!"
};


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

async function getPullRequestNumber(repo, branch) {
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

    const prNumber = await getPullRequestNumber(repo, after.branch);
    debug("pull request nr:", prNumber);

    if (!prNumber) {
        console.log("Cannot identify pull request. Cannot comment on PR.");
        return;
    }

    const markdown = render.asMarkdown(deltas);
    const body = `<!-- sizewatcher @ ${after.sha} -->\n\n${markdown}`;

    debug("adding/updating issue comment on PR:", prNumber);

    const comment = await github.issueComment(repo.owner, repo.repo, prNumber, body, comment => {
        const match = comment.body.match(/<!--\s+sizewatcher @ (\b[0-9a-f]{5,40}\b).*-->/);
        if (match) {
            if (match[1] === after.sha) {
                debug("latest issue comment already exists:", comment.id);
                return "keep";
            } else {
                debug("updating existing issue comment:", comment.id);
                return "update";
            }
        } else {
            return false;
        }
    });
    return comment.html_url;
}

async function reportAsGithubStatus(repo, deltas, commentUrl) {
    const status = deltas.summary === "bad" ? "failure" : "success";
    debug("setting commit status in github:", status, "url:", commentUrl);

    await github.setCommitStatus(
        repo.owner,
        repo.repo,
        deltas.after.sha,
        status,
        "Sizewatcher",
        `Size differences are ${STATUS_TEXTS[deltas.summary]}`,
        commentUrl
    );
}

async function report(deltas) {
    console.log();
    console.log(render.asText(deltas));

    const repo = await getGithubRepo();

    if (!repo) {
        console.error("Error: Cannot identify github repository. Cannot comment on PR or update status checks in github.");
        return;
    }

    debug(`repo: ${repo.owner}/${repo.repo}`);

    if (!process.env.GITHUB_TOKEN) {
        console.error("Error: Missing GITHUB_TOKEN environment variable. Cannot comment on PR or update status checks in github.");
        return;
    }

    const commentUrl = await reportAsGithubComment(repo, deltas);

    // TODO: make status configurable (enable on/off)
    await reportAsGithubStatus(repo, deltas, commentUrl);
}

module.exports = report;