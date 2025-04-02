#!/bin/sh

# checkout local branch but without remote branch

# setup new git repo
git init --initial-branch=main
# needed for git run in CI context where none of this is set
git config --local user.email "you@example.com"
git config --local user.name "Your Name"

echo "hello" > file
git add file
git commit -a -m "initial commit"

# need the commit hash in the js code, and it's different each run
git rev-parse HEAD > ../before.hash
git rev-parse HEAD > ../commit.hash

# new local branch
git checkout -b new
echo "hello2" > file
