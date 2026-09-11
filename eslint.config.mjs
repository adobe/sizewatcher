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

import path from "node:path";
import globals from "globals";
import problems from "eslint-config-problems";
import stylistic from "@stylistic/eslint-plugin";
import { fixupPluginRules } from "@eslint/compat";
import notice from "eslint-plugin-notice";

// principles (inherited from the former @adobe/eslint-config-asset-compute):
// - only problems, no syntax/stylistic related rules (eslint-config-problems), except
//   for semicolons and indentation
// - do not force new EcmaScript features when they depend on the situation or can
//   make readability harder like "prefer-arrow-callback" or "object-shorthand"
export default [
    {
        ignores: [
            "coverage/",
            "test/checkout/*/build/",
            "templates/",
            ".claude/"
        ]
    },
    problems,
    {
        files: ["**/*.js"],
        languageOptions: {
            sourceType: "commonjs",
            globals: globals.node
        },
        plugins: {
            "@stylistic": stylistic,
            // eslint-plugin-notice still uses context.getSourceCode() etc., removed in eslint 10
            notice: fixupPluginRules(notice)
        },
        rules: {
            // formatting
            "@stylistic/semi": ["error", "always"],
            "@stylistic/indent": ["error", 4],
            "@stylistic/template-curly-spacing": ["warn", "never"],

            // adjustments
            "prefer-arrow-callback": "off",
            "prefer-template": "off",
            "object-shorthand": "off",
            "prefer-object-spread": "off",
            "no-else-return": "off",

            // console.* is how the cli reports
            "no-console": "off",

            // verify copyright headers are present
            "notice/notice": ["warn", {
                templateFile: path.join(import.meta.dirname, "templates/copyright-header.js")
            }]
        }
    }
];
