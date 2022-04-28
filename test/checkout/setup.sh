#!/bin/sh

# create a "remote" repo with main plus another branch

rm -rf build

mkdir -p build/remote
cd build/remote
# needed for git run in CI context where none of this is set
git init --initial-branch=main
git config --local user.email "you@example.com"
git config --local user.name "Your Name"

echo "hello" > file
git add file
git commit -a -m "initial commit"
git checkout -b branch 2> /dev/null
echo "hello world" > file
git commit -a -m "branch commit"

# need the commit hash in the js code, and it's different each run
git rev-parse HEAD > ../commit.hash

# back to main
git checkout main