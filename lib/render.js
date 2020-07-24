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

const pb = require('pretty-bytes');

const ICONS = {
    great: "🎉",
    ok: "✅",
    warn: "⚠️",
    bad: "❌"
};

function indentEachLine(string, indent="  ") {
    return string.replace(/^(?!\s*$)/gm, indent);
}

function renderAsText(deltas, beforeBranch, afterBranch) {
    let text = `Sizewatcher measured the following changes between '${beforeBranch}' and '${afterBranch}':\n\n`;

    for (const d of deltas) {
        text += `+ ${ICONS[d.result]} ${d.name}: ${d.increase}% (${pb(d.beforeSize)} => ${pb(d.afterSize)})\n\n`;

        if (d.details) {
            text += `  ${d.detailsLabel}:\n\n`;
            text += indentEachLine(d.details.trim()) + "\n";
        }
        text += `\n`;
    }

    return text;
}

function renderAsMarkdown(deltas) {
    let markdown = `📈 [Sizewatcher](https://github.com/adobe/sizewatcher) measured the following changes in this PR:\n\n`;

    for (const d of deltas) {
        let change;

        if (d.increase >= 0.1) {
            change = `increases by <b>+${d.increase}%</b> (${pb(d.beforeSize)} => ${pb(d.afterSize)})`;

        } else if (d.increase <= -0.1) {
            change = `decreases by <b>${d.increase}%</b> (${pb(d.beforeSize)} => ${pb(d.afterSize)})`;

        } else {
            change = `has no changes (${pb(d.afterSize)})`;

        }

        markdown += `<details>\n<summary>${ICONS[d.result]} <code>${d.name}</code> ${change}</summary>\n`;
        if (d.details) {
            markdown += `<br>\n\n${d.detailsLabel}:\n\`\`\`\n${d.details.trim()}\n\`\`\`\n`;
        }

        markdown += `</details>\n\n`;
    }

    return markdown;
}

module.exports = {
    asText: renderAsText,
    asMarkdown: renderAsMarkdown
};