#!/bin/sh

# create a repo where a package.json with a package-lock.json (but no dependencies) is added in a branch

# setup new git repo
git init --initial-branch=main
# needed for git run in CI context where none of this is set
git config --local user.email "you@example.com"
git config --local user.name "Your Name"

echo "hello" > file
git add file
git commit -a -m "initial commit"

# add package.json and lockfile in new branch
git checkout -b branch
echo '{ "name": "test-project", "version": "1.0.0", "private": true }' > package.json
cat > package-lock.json <<EOF
{
  "name": "test-project",
  "version": "1.0.0",
  "lockfileVersion": 3,
  "requires": true,
  "packages": {
    "": {
      "name": "test-project",
      "version": "1.0.0"
    }
  }
}
EOF
git add package.json package-lock.json
git commit -a -m "add package.json and package-lock.json"
