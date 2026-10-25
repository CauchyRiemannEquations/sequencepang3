import {createWorkerSource} from './coconut-worker.mjs';
// Precache the actual production filenames after Vite has finished hashing them.
import {createHash} from 'node:crypto';
import {readdir,readFile,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const dist=fileURLToPath(new URL('../dist/',import.meta.url));
async function files(directory){
 const entries=await readdir(path.join(dist,directory),{withFileTypes:true});
 return (await Promise.all(entries.map(entry=>entry.isDirectory()?files(`${directory}/${entry.name}`):`${directory}/${entry.name}`))).flat();
}
const manifest=JSON.parse(await readFile(path.join(dist,'.vite/manifest.json'),'utf8'));
const assets=[...new Set(Object.values(manifest).flatMap(entry=>[entry.file,...(entry.css||[])]))].sort();
const icons=(await files('coconut/icons')).filter(file=>file.endsWith('.png'));
// Social share artwork stays deployed, but is not needed to play offline.
const logos=['coconut/logos/home-logo.png','coconut/logos/game-logo.png'];
const paths=['index.html','coconut/index.html','manifest.webmanifest','fonts/Jua-Regular.ttf','coconut/mascot.webp',...assets,...icons,...logos].sort();
const hash=createHash('sha256');
let shellBytes=0;
for(const file of paths){const data=await readFile(path.join(dist,file));shellBytes+=data.byteLength;hash.update(file);hash.update(data);}
// Guard against accidentally adding large social/optional artwork to installation.
const SHELL_BYTE_BUDGET=7_000_000;
if(shellBytes>SHELL_BYTE_BUDGET)throw new Error(`Offline shell exceeds ${SHELL_BYTE_BUDGET} bytes: ${shellBytes}`);
const version=hash.digest('hex').slice(0,16);
// Music is optional: cache only requested audio, independently from the app shell.
const audioPaths=(await files('audio')).filter(file=>/\.(ogg|wav)$/.test(file)).sort();
const audioHash=createHash('sha256');
for(const file of audioPaths){audioHash.update(file);audioHash.update(await readFile(path.join(dist,file)));}
const audioVersion=audioHash.digest('hex').slice(0,16);
const urls=paths.map(file=>`/${file}`);
const source=createWorkerSource({version,audioVersion,audioPaths,urls});
await writeFile(path.join(dist,'sw.js'),source);
console.log(`Coconut PWA: ${urls.length} precached files, ${shellBytes} bytes (budget ${SHELL_BYTE_BUDGET}), version ${version}`);
