# Primo Extract #
Extract code and templates from the Primo NUI.


```
For Primo local install use a version < 0.14
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

primo: Your Primo instance URL   
outDir: Location of the extracted files   
ve: Is this a PrimoVE installation. default: true


Example: Getting the code from the Primo QA environment
```
primoExtract --primo=https://primo-qa.hosted.exlibrisgroup.com --outDir=./primoSourceCode --ve=false
```
