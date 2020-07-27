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

const { Octokit } = require("@octokit/rest");
const github = new Octokit({
    auth: process.env.GITHUB_TOKEN,
    baseUrl: process.env.GITHUB_API_URL
});

async function getPullRequestForBranch(owner, repo, branch) {
    const { data: pulls } = await github.pulls.list({
        owner,
        repo,
        head: `${owner}:${branch}`,
        state: "open",
        sort: "updated"
    });

    if (pulls && pulls.length >= 1) {
        return pulls[0].number;
    }
}

async function issueComment(owner, repo, issue_number, body, matchExisting) {
    if (typeof matchExisting === "function") {

        const {data: comments } = await github.issues.listComments({
            owner,
            repo,
            issue_number,
            per_page: 100
        });

        for (const comment of comments) {
            const action = matchExisting(comment);
            if (action === "update") {
                // 1. update existing comment
                const { data: updatedComment } = await github.issues.updateComment({
                    owner,
                    repo,
                    comment_id: comment.id,
                    body
                });
                return updatedComment;
            } else if (action === "keep") {
                // 2. leave existing comment as is
                return comment;
            }
        }
    }

    // 3. add comment
    const { data: comment} = await github.issues.createComment({
        owner,
        repo,
        issue_number,
        body,
    });
    return comment;
}

async function setCommitStatus(owner, repo, sha, state, label, description, url) {
    await github.repos.createCommitStatus({
        owner: owner,
        repo: repo,
        sha: sha,
        state: state,
        context: label,
        description: description,
        target_url: url
    });
}

module.exports = {
    issueComment,
    getPullRequestForBranch,
    setCommitStatus
};