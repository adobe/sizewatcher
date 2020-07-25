#!/usr/bin/env node

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

const gitCheckoutBeforeAndAfter = require("./lib/checkout");
const render = require("./lib/render");
const compare = require("./lib/compare");
const issueComment = require("./lib/issuecomment");

function printUsage() {
    console.log(`Usage: ${process.argv[1]} [<options>] [<before> [<after>]]`);
    console.log();
    console.log("Arguments:");
    console.log("  <before>   Before branch/commit for comparison. Defaults to default branch or main/master.");
    console.log("  <after>    After branch/commit for comparison. Defaults to current branch.");
    console.log();
    console.log("Options:");
    console.log("  -h     Show help");
}

async function main(argv) {
    try {
        // yes, this should probably use a framework like oclif or yargs.
        // but cli arguments are very limited now and so manual handling is enough
        if (argv[0] === "-h") {
            printUsage();
            process.exit(1);
        }

        console.log(`Cloning git repository...`);
        const { before, after } = await gitCheckoutBeforeAndAfter(process.cwd(), argv[0], argv[1]);

        console.log(`Comparing changes from '${before.branch}' to '${after.branch}'\n`);

        const deltas = await compare(before, after);

        console.log();
        console.log(render.asText(deltas));

        if (process.env.GITHUB_TOKEN) {
            // report as PR comment
            const markdown = render.asMarkdown(deltas);
            // console.log("Markdown:");
            // console.log(markdown);
            await issueComment(owner, repo, issue_number, markdown);

            // TODO: report as status check
        } else {
            console.error("Error: Missing GITHUB_TOKEN environment variable. Cannot comment on PR or update status checks in github.");
        }

        // TODO: detect main = main case

    } catch (e) {
        console.error(e);
        process.exit(1);
    } finally {
        console.log("Done. Cleaning up...");
    }
}


main(process.argv.slice(2));