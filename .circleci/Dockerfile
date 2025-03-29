# Copyright 2020 Adobe. All rights reserved.
# This file is licensed to you under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License. You may obtain a copy
# of the License at http://www.apache.org/licenses/LICENSE-2.0

# Unless required by applicable law or agreed to in writing, software distributed under
# the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
# OF ANY KIND, either express or implied. See the License for the specific language
# governing permissions and limitations under the License.

# custom docker image with newer git (> 2.18) required for github actions test

FROM circleci/node:16

WORKDIR /home/circleci

RUN sudo apt install build-essential make libssl-dev libghc-zlib-dev libcurl4-gnutls-dev libexpat1-dev gettext unzip

# download git sources
RUN wget https://github.com/git/git/archive/v2.25.0.zip -O git.zip && \
    unzip git.zip

# compile git
RUN cd git-2.25.0 && \
    make prefix=/usr/local all && \
    sudo make prefix=/usr/local install

###################################################
FROM circleci/node:16

COPY --from=0 /usr/local/bin/git /usr/local/bin/git
