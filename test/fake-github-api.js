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

'use strict';

// Minimal fake of the GitHub REST API endpoints used by lib/github.js.
//
// Usage: call start() BEFORE requiring lib/github.js (it reads GITHUB_API_URL and
// GITHUB_TOKEN at require time), then set `pulls`/`comments` per test and inspect
// `requests` afterwards. Any fetch() to another host throws, so tests can never
// hit the real api.github.com by accident.

const http = require("http");

const TOKEN = "fake-github-token";

function readBody(req) {
    return new Promise((resolve) => {
        let data = "";
        req.on("data", chunk => data += chunk);
        req.on("end", () => resolve(data));
    });
}

class FakeGithubApi {

    constructor() {
        this.reset();
    }

    reset() {
        // recorded requests: { method, path, query, headers, body }
        this.requests = [];
        // canned responses
        this.pulls = [];
        this.comments = [];
        this.nextCommentId = 1000;
        // if set, the next request fails with { status, message }
        this.failNext = null;
    }

    get token() {
        return TOKEN;
    }

    async start() {
        this.server = http.createServer((req, res) => this.handle(req, res));
        await new Promise(resolve => { this.server.listen(0, "127.0.0.1", resolve); });
        this.host = `127.0.0.1:${this.server.address().port}`;
        this.url = `http://${this.host}`;

        process.env.GITHUB_API_URL = this.url;
        process.env.GITHUB_TOKEN = TOKEN;

        // guard against real network requests
        this.originalFetch = globalThis.fetch;
        globalThis.fetch = (url, options) => {
            const { host } = new URL(url);
            if (host !== this.host) {
                throw new Error(`unexpected network request to ${url}`);
            }
            return this.originalFetch(url, options);
        };
    }

    async stop() {
        globalThis.fetch = this.originalFetch;
        if (this.server.closeAllConnections) {
            this.server.closeAllConnections();
        }
        await new Promise(resolve => { this.server.close(resolve); });
    }

    async handle(req, res) {
        const url = new URL(req.url, this.url);
        const body = await readBody(req);
        const request = {
            method: req.method,
            path: url.pathname,
            query: Object.fromEntries(url.searchParams),
            headers: req.headers,
            body: body ? JSON.parse(body) : undefined
        };
        this.requests.push(request);

        const send = (status, json) => {
            res.writeHead(status, { "content-type": "application/json; charset=utf-8" });
            res.end(JSON.stringify(json));
        };

        if (this.failNext) {
            const { status, message } = this.failNext;
            this.failNext = null;
            return send(status, { message });
        }

        const route = (method, regex) => req.method === method && url.pathname.match(regex);

        if (route("GET", /^\/repos\/[^/]+\/[^/]+\/pulls$/)) {
            return send(200, this.pulls);
        }
        if (route("GET", /^\/repos\/[^/]+\/[^/]+\/issues\/\d+\/comments$/)) {
            return send(200, this.comments);
        }
        let m;
        if ((m = route("PATCH", /^\/repos\/([^/]+)\/([^/]+)\/issues\/comments\/(\d+)$/))) {
            const id = Number(m[3]);
            return send(200, {
                id,
                html_url: `https://github.com/${m[1]}/${m[2]}/pull/0#issuecomment-${id}`,
                body: request.body.body
            });
        }
        if ((m = route("POST", /^\/repos\/([^/]+)\/([^/]+)\/issues\/(\d+)\/comments$/))) {
            const id = this.nextCommentId++;
            return send(201, {
                id,
                html_url: `https://github.com/${m[1]}/${m[2]}/pull/${m[3]}#issuecomment-${id}`,
                body: request.body.body
            });
        }
        if (route("POST", /^\/repos\/[^/]+\/[^/]+\/statuses\/[0-9a-f]+$/)) {
            return send(201, { id: 1, state: request.body.state });
        }

        return send(404, { message: "Not Found" });
    }
}

module.exports = FakeGithubApi;
