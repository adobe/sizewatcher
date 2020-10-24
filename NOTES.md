# Development Notes

### Branch detection

#### A) Manual

1. specify before and after branch
2. specify only before (base), using current branch/revision

#### B) PR

1. Travis PR
   - merges with master first, (TRAVIS_PULL_REQUEST_BRANCH)
   - has PR info => can retrieve PR base branch
   - if `TRAVIS_PULL_REQUEST!=false` then
     - `base = TRAVIS_BRANCH`
       `pr = TRAVIS_PULL_REQUEST_BRANCH`
2. Travis Branch
   - builds current branch (TRAVIS_BRANCH)
   - has no PR info => can only guess PR base branch
   - if `TRAVIS_PULL_REQUEST==false` then
     - `base = guess`
       `pr = TRAVIS_BRANCH`
3. CircleCI
   - builds current branch (CIRCLE_BRANCH)
   - has PR info if PR => can retrieve PR base branch
   - guess base branch OR
   - use github API to retrieve pr branch
     - `CIRCLE_PROJECT_REPONAME=sizewatcher`
       `CIRCLE_PROJECT_USERNAME=adobe`
       `CI_PULL_REQUEST=https://github.com/adobe/sizewatcher/pull/7` (take # after last /)
       `pr = CIRCLE_BRANCH`
4. Github Actions
   - merges with master first (GITHUB_HEAD_REF)
   - has PR info if PR => can retrieve PR base branch
   - `base = GITHUB_BASE_REF`
     `pr = GITHUB_HEAD_REF`

### Links

- [Travis Environment Variables](https://docs.travis-ci.com/user/environment-variables/#default-environment-variables)
- [CircleCI Environment Variables](https://circleci.com/docs/2.0/env-vars/#built-in-environment-variables)
- [Github Actions Environment Variables](https://help.github.com/en/actions/configuring-and-managing-workflows/using-environment-variables#default-environment-variables)
- [npm du](https://www.npmjs.com/package/du)
- [npm get-folder-size](https://www.npmjs.com/package/get-folder-size)
- [octokit/rest](https://github.com/octokit/rest.js/)
    - [api docs](https://octokit.github.io/rest.js/v17)

