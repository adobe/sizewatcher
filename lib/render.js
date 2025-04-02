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

// render.js - formats comparison result text

const config = require("./config");
const pb = require('pretty-bytes');

const ICONS = {
    cheers: "🎉",
    ok: "✅",
    warn: "⚠️",
    fail: "❌",
    error: "🚨"
};

const SUMMARY = {
    cheers: "congratulates on the size improvement 📉:",
    ok: "found no problematic size increases.",
    warn: "detected a size increase 📈:",
    fail: "detected a problematic size increase 📈:",
    error: "had a measurement error:"
};

const EXPANDED_CASES = ["cheers", "warn", "fail", "error"];

function indentEachLine(string, indent="  ") {
    return string.replace(/^(?!\s*$)/gm, indent);
}

function renderAsText(deltas) {
    let text = `Sizewatcher measured the following changes:\n\n`;

    text += `  '${deltas.before.branch}' (sha ${deltas.before.sha}) => '${deltas.after.branch}' (sha ${deltas.after.sha})\n\n`;

    for (const d of deltas) {
        if (d.error) {
            text += `+ ${ICONS.error} ${d.name}: measurement error: ${d.error.message || d.error}\n`;
        } else {
            text += `+ ${ICONS[d.result]}  ${d.name}: ${d.increase}% (${pb(d.beforeSize)} => ${pb(d.afterSize)})\n\n`;

            if (d.details) {
                text += `  ${d.detailsLabel}:\n\n`;
                text += indentEachLine(d.details.trim()) + "\n";
            }
        }
        text += `\n`;
    }

    return text;
}

function renderAsMarkdown(deltas) {
    const summaryState = deltas.summary || "ok";
    const detailState = EXPANDED_CASES.includes(summaryState) ? "open" : "";

    let markdown = `<details ${detailState}><summary>${ICONS[summaryState]} <a href="https://github.com/adobe/sizewatcher">Sizewatcher</a> ${SUMMARY[summaryState]}</summary>\n`;
    markdown += `<p><blockquote>\n\n`;

    for (const d of deltas) {
        let change;

        if (d.error) {
            d.result = "error";
            change = `measurement error: ${d.error.message || d.error}`;

        } else if (d.increase >= 0.1) {
            change = `<b>+${d.increase}%</b> (${pb(d.beforeSize)} => ${pb(d.afterSize)})`;

        } else if (d.increase <= -0.1) {
            change = `<b>${d.increase}%</b> (${pb(d.beforeSize)} => ${pb(d.afterSize)})`;

        } else {
            change = `has no changes (${pb(d.afterSize)})`;

        }

        if (d.details) {
            markdown += `<details><summary>`;
        } else {
            markdown += "&nbsp;&nbsp;&nbsp;";
        }
        markdown += `${ICONS[d.result]} <code>${d.name}</code> ${change}`;
        if (d.details) {
            markdown += `</summary><br>${d.detailsLabel}:<pre>${d.details.trim().replace(/\n/g, "<br>")}</pre></details>`;
        }

        markdown += `\n\n`;
    }

    markdown += `<details><summary>Notes</summary><br>\n\n`;
    markdown += `- PR branch: \`${deltas.after.branch}\` @ ${deltas.after.sha}\n`;
    markdown += `- Base branch: \`${deltas.before.branch}\` @ ${deltas.before.sha}\n`;
    markdown += `- Sizewatcher v${require('../package.json').version}\n`;
    markdown += `- Effective Configuration:\n`;
    markdown += `\n\`\`\`yaml\n${config.asYaml()}\`\`\`\n`;
    markdown += `</details>\n\n`;

    markdown += `</blockquote></p>\n`;
    markdown += `</details>\n`;

    return markdown;
}

module.exports = {
    asText: renderAsText,
    asMarkdown: renderAsMarkdown
};