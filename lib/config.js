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

// config.js - loads configuration options and provides defaults

const yaml = require("js-yaml");
const deepmerge = require("deepmerge");
const fs = require("fs");

const CONFIG_FILE = ".sizewatcher.yml";

const DEFAULT_CONFIG = {
    limits: {
        fail: "100%",
        warn: "30%",
        ok: "-10%"
    },
    report: {
        githubComment: true,
        githubStatus: false
    },
    comparators: {
    }
};

function load() {
    let config;

    if (fs.existsSync(CONFIG_FILE)) {
        const data = fs.readFileSync(CONFIG_FILE, "utf8");
        const loadedConfig = yaml.load(data) || {};

        config = deepmerge(DEFAULT_CONFIG, loadedConfig);

    } else {
        config = DEFAULT_CONFIG;
    }
    return Object.freeze(config);
}

let config;

module.exports = {
    get() {
        if (!config) {
            config = load();
        }
        return config;
    },

    reload() {
        config = null;
        return this.get();
    },

    asYaml() {
        return yaml.dump(this.get());
    }
};