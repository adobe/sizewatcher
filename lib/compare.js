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

const COMPARATORS = require('require-dir')("./comparators");

async function compare(before, after) {
    const deltas = [];

    console.log("Calculating size changes for");

    for (const name of Object.keys(COMPARATORS)) {
        const comparator = COMPARATORS[name];

        if (await comparator.shouldRun(after.dir)) {
            console.log(`- ${name}`);
            const delta = await comparator.compare(before, after);
            deltas.push(delta);
        }
    }

    return process(deltas);
}

function process(deltas) {
    // TODO: make limits configurable
    const limits = {
        bad: 50,
        warn: 10,
        ok: -10
    };

    const summary = {
        great: 0,
        ok: 0,
        warn: 0,
        bad: 0
    };

    for (const d of deltas) {
        d.increase = ((d.afterSize - d.beforeSize) / d.beforeSize * 100).toFixed(1);

        if (d.increase >= limits.bad) {
            d.result = "bad";
            summary.bad++;

        } else if (d.increase >= limits.warn) {
            d.result = "warn";
            summary.warn++;

        } else if (d.increase >= limits.ok) {
            d.result = "ok";
            summary.ok++;

        } else {
            // decrease - yay
            d.result = "great";
            summary.great++;
        }
    }

    deltas.summary = "ok";
    if (summary.bad >= 1) {
        deltas.summary = "bad";
    } else if (summary.warn >= 1) {
        deltas.summary = "warn";
    } else if (summary.great >= 1) {
        deltas.summary = "great";
    }

    return deltas;
}

module.exports = compare;