/**
 * Primo Extract
 * 
 * Extract source code and templates from NUI
 * 
 * KULeuven/LIBIS
 * Mehmet Celik (c) 2018
 */
import {version} from '../package.json';
import minimist from 'minimist'
import extract from './primo'
"use strict";

function usage(){
    console.log("usage: primoExtract --primo=https://your.primo.instance --outDir=/directory/to/exported/source\n\n");
}

console.log(`\nPrimo Extract NUI source code.\nversion ${version}\n\tWhen code is the manual ...\n\nKULeuven/LIBIS (c)2023\n\n`);


var argv = minimist(process.argv.slice(2),{
    string: 'primo',
    boolean: ['help'],
    alias: { h: 'help'}
});

if (argv.h || argv.help) {
    usage();
    process.exit(1);
}

if (Object.keys(argv).includes("primo")) {
    let primoUri = argv.primo;
    let outDir = Object.keys(argv).includes('outDir') ? argv.outDir : process.cwd()    
    extract(primoUri, outDir);
} else {
    usage();
}
