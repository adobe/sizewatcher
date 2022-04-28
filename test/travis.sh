#!/bin/bash

# run travis locally

BUILDID="build-$RANDOM"
INSTANCE="travisci/ci-garnet:packer-1512502276-986baf0"

docker run --name $BUILDID -dit $INSTANCE /sbin/init
docker exec -it $BUILDID bash -c '
su - travis -c "git clone --depth=50 https://github.com/adobe/sizewatcher.git adobe/sizewatcher ;
cd adobe/sizewatcher ;
git fetch origin +refs/pull/63/merge: ;
git checkout -qf FETCH_HEAD ;
nvm install 14 ;
node --version ;
npm install ;
npm run sizewatcher"'

docker rm -f $BUILDID
