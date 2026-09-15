#!/bin/sh

# create a repo for custom comparator tests:
# - size.txt grows from 100 to 250 bytes in the branch (used by a custom build script)
# - dist/app.js is identical in both branches (used by a custom path without script)

# setup new git repo
git init --initial-branch=main
# needed for git run in CI context where none of this is set
git config --local user.email "you@example.com"
git config --local user.name "Your Name"

awk 'BEGIN { for (i = 0; i < 100; i++) printf "a" }' > size.txt
mkdir dist
echo 'console.log("app");' > dist/app.js
git add .
git commit -a -m "initial commit"

git checkout -b branch
awk 'BEGIN { for (i = 0; i < 250; i++) printf "b" }' > size.txt
git commit -a -m "grow size.txt"
