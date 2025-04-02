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
echo "hello" > file2
git add .
git commit -a -m "change 2"

git checkout -b branch
echo "hello2" > file
git add file
git commit -a -m "branch commit"

git checkout main

git checkout -b branch2
echo "another hello" > file3
git add file3
git commit -a -m "branch commit 2"
