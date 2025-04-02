#!/bin/sh

# simulate a fork PR in github actions

mkdir remote
cd remote
REMOTE=$PWD

# setup new git repo
git init --initial-branch=main
# needed for git run in CI context where none of this is set
git config --local user.email "you@example.com"
git config --local user.name "Your Name"

echo "hello" > file
git add file
git commit -a -m "initial commit"
echo "hello" > file2
git add .
git commit -a -m "change 2"

git checkout -b branch
echo "hello2" > file
git add file
git commit -a -m "branch commit"

git checkout main
git rev-parse HEAD > ../before.hash

git checkout -b branch2
echo "another hello" > file3
git add file3
git commit -a -m "branch commit 2"

# need the commit hash in the js code, and it's different each run
git rev-parse HEAD > ../commit.hash

# checkout like github actions
# actions/checkout@v2 +

# GH creates another merge commit with the PR branch merged into main
git checkout main
git checkout -b pr-merge
git merge --no-ff branch2 -m "Merge $(git rev-parse branch2) into $(git rev-parse main)"
git show -1
SHA=$(git rev-parse HEAD)

cd ..
mkdir checkout
cd checkout

git init
git remote add origin $REMOTE
git config --local gc.auto 0
git -c protocol.version=2 fetch --no-tags --prune --progress --no-recurse-submodules --depth=1 \
  origin +$SHA:refs/remotes/pull/1/merge
git checkout --progress --force refs/remotes/pull/1/merge
git rev-parse HEAD
