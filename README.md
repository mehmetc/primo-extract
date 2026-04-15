# Primo Extract #
Extract code and templates from Primo.

Use version <0.14 for Primo Classic, Use version <0.19 for PrimoVE and >=0.19 for NDE.
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
primoExtract --primo=https://your.primo.instance --outDir=/directory/to/exported/source
```

Example: Getting the code from the Primo QA environment
```
primoExtract --primo=https://primo-qa.hosted.exlibrisgroup.com --outDir=./primoSourceCode
```

## For NDE
Not the default yet.
```
primoExtract --primo=https://your.primo.instance --outDir=/directory/to/exported/source --nde
```