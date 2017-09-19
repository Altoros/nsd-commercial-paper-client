#!/usr/bin/env bash

STARTTIME=$(date +%s)

# defaults; export these variables before executing this script
: ${FOLDER_SAVE:="alameda"}
: ${USER="signUser"}


export FOLDER_SAVE
export USER

function startSignUp1 () {
  echo "Starting downloader app for nsd"
  docker-compose up -d download.nsd.nsd.ru
}

function startSignUp2 () {
  echo "Starting sign app for megafon"
  docker-compose up -d sign.megafon.nsd.ru
}

function startSignUp3 () {
  echo "Starting sign app for raiffeisen"
  docker-compose up -d sign.raiffeisen.nsd.ru
}

# find api cntainer and launch sign app for it
function startSignUp () {
  container=$(docker ps -f name=api.* --format "{{.Names}}" |head -n 1)   
  if [ "$container" == "api.nsd.nsd.ru" ]; then
    container=$(echo $container |sed -e s/api\./download./)
  else
    container=$(echo $container |sed -e s/api\./sign./)
  fi;
  echo "Starting app: $container"
  docker-compose up -d $container
}

function startSignUpDev () {
  echo "Starting sign app for megafon and raiffeisen"
  FOLDER_SAVE="alameda-megafon"
  docker-compose up -d sign.megafon.nsd.ru

  FOLDER_SAVE="alameda-raiffeisen"
  docker-compose up -d sign.raiffeisen.nsd.ru
}
function stopSignDev () {
  echo "Stopping sign/download apps"
  docker-compose down
}

function logDev () {
  docker-compose logs
}


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




# Print the usage message
function printHelp () {
  echo "Usage: "
  echo "  network.sh -m install|up|down|logs"
  echo "  network.sh -h|--help (print this message)"
  echo "    -m <mode> - one of 'install', 'up', 'down', 'logs'"
  echo
  echo "  network.sh -m install"
  echo "  network.sh -m up"
}

# Parse commandline args
while getopts "h?m:" opt; do
  case "$opt" in
    h|\?)
      printHelp
      exit 0
    ;;
    m)  MODE=$OPTARG
    ;;
    o)  ORG=$OPTARG
    ;;
  esac
done

if [ "${MODE}" == "install" ] || [ "${MODE}" == "generate" ]; then
  installNodeModules
elif [ "${MODE}" == "up-3" ]; then
  startSignUp3
elif [ "${MODE}" == "up-2" ]; then
  startSignUp2
elif [ "${MODE}" == "up-1" ]; then
  startSignUp1
elif [ "${MODE}" == "up" ]; then
  startSignUp
elif [ "${MODE}" == "devup" ]; then
  startSignUpDev
elif [ "${MODE}" == "down" ]; then
  stopSignDev
elif [ "${MODE}" == "logs" ]; then
  logDev
else
  printHelp
  exit 1
fi

# print spent time
ENDTIME=$(date +%s)
echo "Finished in $(($ENDTIME - $STARTTIME)) seconds"
