# Primo Extract #
Extract code and templates from the Primo NUI.


```
!!!You need a node.js(7.6 or better) that support async/await!!!
```

__Install:__
```
yarn global add primo-extract
```
or
```
npm install primo-extract -g
```

__Usage:__
```
primoExtract --primo=https://your.primo.instance --outDir=/directory/to/exported/source --ve=false
```

Example: Getting the code from the Primo QA environment
```
primoExtract --primo=https://primo-qa.hosted.exlibrisgroup.com --outDir=./primoSourceCode --ve=false
```
