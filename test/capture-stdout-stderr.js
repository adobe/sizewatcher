/*
 * Copyright 2022 Adobe. All rights reserved.
 * This file is licensed to you under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License. You may obtain a copy
 * of the License at http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software distributed under
 * the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
 * OF ANY KIND, either express or implied. See the License for the specific language
 * governing permissions and limitations under the License.
 */

"use strict";

const supportsColor = require("supports-color");

function stderrColor(str) {
    if (supportsColor.stderr && !process.env.TEST_LOG_DISABLE_COLOR) {
        return `\u001b[33m${str}\u001b[0m`;
    } else {
        return str;
    }
}

function chunkToString(chunk) {
    if (typeof chunk === 'string') {
        return chunk;
    }
    return chunk.toString('utf8');
}

const _global = global;
if (!_global['capture-stdout-stderr']) {
    _global['capture-stdout-stderr'] = {
        stdout: process.stdout.write,
        stderr: process.stderr.write,
    };
}

const lines = [];

function overwrite(std) {
    process[std].write = (chunk) => {
        const str = chunkToString(chunk);
        lines.push({
            [std]: str
        });
        if (this.print) {
            _global['capture-stdout-stderr'][std].call(process[std], std === "stderr" ? stderrColor(str) : str );
        }
        return true;
    };
}

module.exports = {
    print: false,

    start() {
        lines.length = 0;
        overwrite.call(this, "stdout");
        overwrite.call(this, "stderr");
    },

    stop() {
        process.stdout.write = _global['capture-stdout-stderr'].stdout;
        process.stderr.write = _global['capture-stdout-stderr'].stderr;
    },

    get output() {
        return {
            get stdout() {
                return lines.map((l) => l.stdout || "").join("");
            },
            get stderr() {
                return lines.map((l) => l.stderr || "").join("");
            },
            get any() {
                return lines.map((l) => l.stdout || l.stderr).join("");
            }
        };
    },

    replay() {
        for (const line of lines) {
            if (line.stdout) {
                process.stdout.write(line.stdout);
            } else if (line.stderr) {
                process.stderr.write(stderrColor(line.stderr));
            }
        }
    }
};
