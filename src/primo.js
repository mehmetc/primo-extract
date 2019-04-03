import sourceMap from 'source-map'
import fs from 'fs'
import path from 'path'
import mkdirp from 'mkdirp'
import axios from 'axios'
import os from 'os'
import glob from 'glob'
import {html as beautifyHtml} from 'js-beautify'

const Parts = [
    "app.js.map",
    "bundle.js.map",
    "account_chunk.js.map",
    "angular.js.map",
    "atoz_chunk.js.map",
    "bootstrap_bundle.js.map",
    "collectionDiscovery_chunk.js.map",
    "favorites_chunk.js.map",
    "fullView_chunk.js.map",
    "vendor.js.map"
];

async function extract(uri, outDir) {
    outDir = path.resolve(outDir.replace(/^\~/, os.homedir()));
    const mapsDir = `${outDir}/tmp/maps`;

    const filepaths = await downloadMaps(mapsDir, uri);
    await dumpSource(filepaths, outDir);
    await copyFiles(outDir);
}

async function downloadMaps(mapsDir, uri) {
    mkdirp.sync(mapsDir);
    let filepaths = []

    await Promise.all(Parts.map(async (part) => {
        console.log(`Fetching part ${part}`);
        const file = await getMap(`${uri}/primo-explore/lib/${part}`);
        if (file.status == 200) {
            const filename = file.request.path.split('/').pop();
            const filepath = `${mapsDir}/${filename}`;
            filepaths.push(filepath);
            console.log(`Writing ${filename} to ${filepath}`);
            fs.writeFileSync(filepath, JSON.stringify(file.data));

        }
    }));
    return filepaths;
}

async function getMap(uri) {
    return axios.get(uri);
}


async function dumpSource(filepaths, outDir) {
    console.log('\tParsing maps');

    for (const filename of filepaths) {
        const subDir = path.basename(filename, '.js.map');
        const map = await readMapFile(filename)
        await mapConsumerToSource(map, outDir, subDir);
    }
}

async function readMapFile(filename) {
    return new Promise((resolve, reject) => {
        fs.readFile(filename, (err, data) => {
            if (err) {
                console.log(`\n\n\n${filename}\n\n\n`);
                reject(err);
            } else {
                let map = JSON.parse(data);
                resolve(map);
            }
        })
    });
}

async function writeSourceFile(sourceWritePath, source) {
    return new Promise((resolve, reject) => {
        mkdirp.sync(path.dirname(sourceWritePath));        
        fs.writeFile(sourceWritePath, source, (err) => {
            if (err) {
                console.log(`\n\n\n${path.dirname(sourceWritePath)}\n\n\n`);
                reject(err)
            };
            resolve(true)
        });
    })
}

async function mapConsumerToSource(map, outDir, subDir) {
    let consumer = new sourceMap.SourceMapConsumer(map);
    if (consumer) {
        try {
            const c = await consumer;
            for (const sourceFile of c.sources) {
                const source = c.sourceContentFor(sourceFile);
                const sourceWritePath = `${outDir}/tmp/source/${subDir}/${sourceFile.replace(/^webpack:\/+/,'')}`;
                await writeSourceFile(sourceWritePath, source);
                if (/templates.js/.test(sourceWritePath)) {
                    dumpTemplates(sourceWritePath, outDir);
                }
            }
        } catch (e) {
            console.log(e)
        }
    } else {
        console.log('nothing to extract');
    }
}

function dumpTemplates(templatePath, outDir) {
    let $templateCache = {
        put: function (k, v) {
            let s = {}
            s[k] = v;
            t.push(s);
        }
    }; //$templateCache replacement

    /* Angular shim */
    let angular = {
        module: function (moduleName) {
            return {
                run: function (templateArray) {
                    templateArray[1]($templateCache);
                }
            }
        }
    }

    global.angular = angular;
    global.$templateCache = $templateCache;
    global.t = [];

    require(templatePath);
    console.log(`\tFound ${t.length} templates`);
    console.log("\t\tExtracting Templates");
    t.forEach(function (d) {
        Object.keys(d).forEach(function (k) {
            let sourceWritePath = `${outDir}/source/html/${k}`;

            mkdirp(path.dirname(sourceWritePath), function (err) {
                fs.writeFileSync(sourceWritePath, beautifyHtml(d[k]));
            });
        });
    });
}

async function copyFiles(outDir) {    
    glob(`${outDir}/tmp/**/webapp/components/**`, (er, files) => {        
        files.forEach((f) => {
            let copyFile = `${outDir}/source/www/components${f.split('webapp/components').pop()}`;
            mkdirp.sync(path.dirname(copyFile));
            fs.copyFileSync(f, copyFile);
        })
    })
}

export default extract;