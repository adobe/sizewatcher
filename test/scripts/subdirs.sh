#!/bin/sh

# create a repo with two npm packages in sub directories, one of them growing in a branch

# setup new git repo
git init --initial-branch=main
# needed for git run in CI context where none of this is set
git config --local user.email "you@example.com"
git config --local user.name "Your Name"

mkdir sub1 sub2
echo '{ "name": "sub1", "version": "1.0.0" }' > sub1/package.json
echo 'console.log("sub1");' > sub1/index.js
echo '{ "name": "sub2", "version": "1.0.0" }' > sub2/package.json
echo 'console.log("sub2");' > sub2/index.js
git add .
git commit -a -m "initial commit"

# grow sub1 in new branch
git checkout -b branch
echo 'console.log("some more code in sub1 to make the package bigger");' > sub1/extra.js
git add .
git commit -a -m "add extra.js to sub1"
