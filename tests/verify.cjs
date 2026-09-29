const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
// Run from any directory: node /path/to/thumbtype-lab/tests/verify.cjs
process.chdir(require('node:path').join(__dirname,'..'));
const nodes=[];
function param(){return {value:0,setValueAtTime(v){this.value=v},linearRampToValueAtTime(v){this.value=v},exponentialRampToValueAtTime(v){this.value=v},setTargetAtTime(v){this.value=v},cancelScheduledValues(){}}}
class AudioContext{constructor(){this.currentTime=0;this.state='running';this.destination={}}createOscillator(){const o={frequency:param(),detune:param(),connect(){},disconnect(){},start(){this.started=true},stop(at){this.stopped=true;this.stopAt=at}};nodes.push(o);return o}createGain(){return {gain:param(),connect(){},disconnect(){}}}resume(){return Promise.resolve()}}
const elements=new Map();function element(id){if(!elements.has(id))elements.set(id,{value:'',dataset:{},classList:{add(){},remove(){},toggle(){}},style:{},listeners:{},addEventListener(t,f){this.listeners[t]=f},append(){},appendChild(){},replaceChildren(){},remove(){},click(){},getBoundingClientRect(){return {left:0,top:0,width:20,height:20,right:20,bottom:20}}});return elements.get(id)}
const keys=[...'abcdefghijklmnopqrstuvwxyz '].map((ch,i)=>Object.assign(element(ch),{dataset:{key:ch},getBoundingClientRect:()=>({left:i*30,top:0,width:20,height:20,right:i*30+20,bottom:20})}));
let payload,now=100;
const document={hidden:false,listeners:{},querySelector:element,querySelectorAll:s=>s==='.key'?keys:[],createElement:()=>element(Symbol()),createTextNode:s=>s,addEventListener(t,f){this.listeners[t]=f}};
const c={window:null,document,AudioContext,navigator:{userAgent:''},screen:{width:390,height:844},innerWidth:390,innerHeight:844,devicePixelRatio:3,localStorage:{getItem:()=>true},performance:{now:()=>now+=100},requestAnimationFrame:f=>f(),setTimeout:()=>1,clearTimeout(){},location:{},URL:{createObjectURL:b=>{payload=b;return 'blob:test'},revokeObjectURL(){}},Blob,File,console};c.window=c;c.addEventListener=()=>{};vm.createContext(c);
vm.runInContext(fs.readFileSync('accuracy-audio.js','utf8'),c);
const a=c.ThumbTypeAudio,ctx=new AudioContext();
// Cues are finite, ordered in opposite directions, and release their nodes.
for(const good of [true,false]){
 const result=a.play(ctx,good),cue=a.cues[result.outcome],node=nodes.at(-1);
 assert.equal(result.outcome,good?'good':'bad');assert(node.started&&node.stopped);
 assert(node.stopAt<=.3);assert.equal(node.type,'triangle');
 assert(cue.frequencies.every((f,i)=>!i||(good?f>cue.frequencies[i-1]:f<cue.frequencies[i-1])));
 node.onended();assert(!a.active);
}
a.play(ctx,true);const old=nodes.at(-1);a.play(ctx,false);old.onended();assert(a.active);
a.stop();assert(!a.active);a.stop();assert.equal(a.play(null,true).audioState,'unavailable');
vm.runInContext(fs.readFileSync('app.js','utf8'),c);
for(let mode=0;mode<3;mode++)for(let rep=1;rep<=3;rep++){
 const count=nodes.length;element('#goButton').listeners.click();assert.equal(nodes.length,count,'Go must be silent');
 for(const ch of 'the quick brown fox'){const r=keys.find(k=>k.dataset.key===ch).getBoundingClientRect();element('#keyboard').listeners.pointerdown({pointerType:'touch',clientX:r.left+10,clientY:10})}
 // Completion must not cut off the final chirp or cover it with another chime.
 assert(a.active);assert.equal(nodes.at(-1).stopAt,.125);nodes.at(-1).onended();assert(!a.active);
}
element('#downloadRaw').listeners.click();
(async()=>{
 const data=JSON.parse(await payload.text());assert.equal(data.version,18);assert.equal(data.samples.length,171);
 assert(data.samples.every(s=>s.durationMs>0&&s.wpm>0));
 assert(data.samples.every(s=>s.audioFeedback.outcome==='good'&&s.audioFeedback.intendedKey===s.expected));
 assert.equal(data.audioFeedback.type,'binary key feedback');assert(!JSON.stringify(data).includes('audioScaleCents'));
// Failed native sharing falls back to a download, but cancellation does not.
c.navigator.canShare=()=>true;
c.navigator.share=async()=>{throw Object.assign(new Error('Unavailable'),{name:'NotAllowedError'})};
payload=null;await element('#resultsRaw').listeners.click();assert(payload instanceof Blob);assert.equal(JSON.parse(await payload.text()).samples.length,171);
c.navigator.share=async()=>{throw Object.assign(new Error('Cancelled'),{name:'AbortError'})};
payload=null;await element('#resultsRaw').listeners.click();assert.equal(payload,null);
// Wrong key and gap keep the pre-tap target while alignment may change it.
element('#restart').listeners.click();element('#goButton').listeners.click();
for(const ch of 'zthe quick brown fox') {const r=keys.find(k=>k.dataset.key===ch).getBoundingClientRect();element('#keyboard').listeners.pointerdown({pointerType:'touch',clientX:r.left+10,clientY:10});if(ch==='z')element('#keyboard').listeners.pointerdown({pointerType:'touch',clientX:-10,clientY:10});}
element('#downloadRaw').listeners.click();const wrong=JSON.parse(await payload.text());assert.equal(wrong.samples.length,21);assert.equal(wrong.samples[0].audioFeedback.outcome,'bad');assert.equal(wrong.samples[1].audioFeedback.outcome,'bad');assert(wrong.samples.slice(2).every(s=>s.audioFeedback.outcome==='good'));assert.equal(wrong.samples[0].audioFeedback.intendedKey,'t');assert.equal(wrong.samples[1].hit,null);assert.equal(wrong.samples[1].audioFeedback.intendedKey,'t');assert(wrong.samples.some(s=>s.type==='extra'));
element('#restart').listeners.click();element('#goButton').listeners.click();document.hidden=true;document.listeners.visibilitychange();assert(!a.active);document.hidden=false;element('#keyboard').listeners.pointerdown({pointerType:'touch',clientX:580,clientY:10});assert(a.active);element('#restart').listeners.click();assert(!a.active);
// Repeated starts stop the previous voices; unavailable Web Audio still permits typing.
for(let i=0;i<10;i++){a.play(ctx,true);a.play(ctx,false);a.stop()}
assert(nodes.every(o=>o.stopped));
c.AudioContext=class{constructor(){throw new Error('Audio unavailable')}};
vm.runInContext(fs.readFileSync('app.js','utf8'),c);
element('#goButton').listeners.click();assert(!a.active);
for(const ch of 'the quick brown fox'){const r=keys.find(k=>k.dataset.key===ch).getBoundingClientRect();element('#keyboard').listeners.pointerdown({pointerType:'touch',clientX:r.left+10,clientY:10})}
element('#downloadRaw').listeners.click();const silent=JSON.parse(await payload.text());assert.equal(silent.samples.length,19);assert(silent.samples.every(s=>s.audioFeedback.audioState==='unavailable'));
const html=fs.readFileSync('index.html','utf8'),sw=fs.readFileSync('sw.js','utf8');for(const [,url] of html.matchAll(/<script src="([^"]+)"/g))assert(sw.includes(url),url);assert(html.indexOf('accuracy-audio.js')<html.indexOf('app.js'));assert(fs.readFileSync('instructions.html','utf8').includes('thumbtype-lab-v19'));for(const file of fs.readdirSync('.').filter(f=>f.endsWith('.js')))new vm.Script(fs.readFileSync(file,'utf8'),{filename:file});console.log('PASS: finite good/bad cues, lifecycle, silent Go, complete final chirp, all nine runs and exports, wrong keys/gaps, share fallback/cancellation, reset/background resume, cache URLs and diagnostics');})();
