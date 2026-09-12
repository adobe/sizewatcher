#!/bin/sh

# repo with a custom default branch name (given as first argument, e.g. master or trunk)
# and a feature branch checked out, no remote

# setup new git repo
git init --initial-branch=$1
# needed for git run in CI context where none of this is set
git config --local user.email "you@example.com"
git config --local user.name "Your Name"

echo "hello" > file
git add file
git commit -a -m "initial commit"

git rev-parse HEAD > ../before.hash

git checkout -b branch
echo "hello2" > file
git commit -a -m "branch commit"

# need the commit hash in the js code, and it's different each run
git rev-parse HEAD > ../commit.hash
