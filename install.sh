#!/bin/bash

function installNodeModules() {
	echo
	if [ -d node_modules ]; then
		echo "============== node modules installed already ============="
	else
		echo "============== Installing node modules ============="
		docker run --rm -w /usr/src -v $PWD:/usr/src node:6-alpine npm install
	fi
	echo
}

installNodeModules

# docker run -d --name download.nsd.nsd.ru -w /usr/src -v $PWD:/usr/src -e API=http://api.nsd.nsd.ru:4000 --network ledger_default  node:6-alpine npm run download
