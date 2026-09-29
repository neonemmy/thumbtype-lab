const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
// Run from any directory: node /path/to/thumbtype-lab/tests/verify.cjs
process.chdir(require('node:path').join(__dirname,'..'));
const nodes=[];
function param(){return {value:0,setValueAtTime(v){this.value=v},linearRampToValueAtTime(v){this.value=v},exponentialRampToValueAtTime(v){this.value=v},setTargetAtTime(v){this.value=v},cancelScheduledValues(){}}}
class AudioContext{constructor(){this.currentTime=0;this.state='running';this.destination={}}createOscillator(){const o={frequency:param(),detune:param(),connect(){},disconnect(){},start(){this.started=true},stop(){this.stopped=true}};nodes.push(o);return o}createGain(){return {gain:param(),connect(){},disconnect(){}}}resume(){return Promise.resolve()}}
const elements=new Map();function element(id){if(!elements.has(id))elements.set(id,{value:'',dataset:{},classList:{add(){},remove(){},toggle(){}},style:{},listeners:{},addEventListener(t,f){this.listeners[t]=f},append(){},appendChild(){},replaceChildren(){},remove(){},click(){},getBoundingClientRect(){return {left:0,top:0,width:20,height:20,right:20,bottom:20}}});return elements.get(id)}
const keys=[...'abcdefghijklmnopqrstuvwxyz '].map((ch,i)=>Object.assign(element(ch),{dataset:{key:ch},getBoundingClientRect:()=>({left:i*30,top:0,width:20,height:20,right:i*30+20,bottom:20})}));
let payload,now=100;
const document={hidden:false,listeners:{},querySelector:element,querySelectorAll:s=>s==='.key'?keys:[],createElement:()=>element(Symbol()),createTextNode:s=>s,addEventListener(t,f){this.listeners[t]=f}};
const c={window:null,document,AudioContext,navigator:{userAgent:''},screen:{width:390,height:844},innerWidth:390,innerHeight:844,devicePixelRatio:3,localStorage:{getItem:()=>true},performance:{now:()=>now+=100},requestAnimationFrame:f=>f(),setTimeout:()=>1,clearTimeout(){},location:{},URL:{createObjectURL:b=>{payload=b;return 'blob:test'},revokeObjectURL(){}},Blob,File,console};c.window=c;c.addEventListener=()=>{};vm.createContext(c);
vm.runInContext(fs.readFileSync('accuracy-audio.js','utf8'),c);
const a=c.ThumbTypeAudio,ctx=new AudioContext();a.start(ctx);assert.equal(nodes.length,2);assert(nodes.every(o=>o.started&&o.frequency.value===900));
for(const scale of a.scales){assert.equal(a.update(keys[0],10,10,scale).detuneCents,0);assert.equal(a.update(keys[0],20,10,scale).detuneCents,scale);assert.equal(a.update(keys[0],100,10,scale).detuneCents,scale*2)}
assert.equal(a.update(keys[0],20,20,150).normalizedDistance,Math.SQRT2);assert.equal(a.update(null,0,0,150).normalizedDistance,null);assert.equal(a.update({getBoundingClientRect:()=>({width:0,height:0})},0,0,150).detuneCents,0);a.stop();assert(nodes.every(o=>o.stopped));a.stop();
vm.runInContext(fs.readFileSync('app.js','utf8'),c);
for(let mode=0;mode<3;mode++)for(let rep=1;rep<=3;rep++){
 element('#goButton').listeners.click();assert(a.active);assert.equal(nodes.at(-1).detune.value,0);
 const scale=a.scaleFor(mode,rep);assert(element('#audioScale').textContent.includes(String(scale)));
 for(const ch of 'the quick brown fox'){const r=keys.find(k=>k.dataset.key===ch).getBoundingClientRect();element('#keyboard').listeners.pointerdown({pointerType:'touch',clientX:r.left+10,clientY:10})}
 assert(!a.active);
}
element('#downloadRaw').listeners.click();
(async()=>{const data=JSON.parse(await payload.text());assert.equal(data.version,17);assert.equal(data.samples.length,171);assert(data.samples.every(s=>s.durationMs>0&&s.wpm>0));for(const [i,mode] of ['left','right','both'].entries())for(const r of data.summary[mode].repetitions){assert.equal(r.audioScaleCents,a.scaleFor(i,r.repetition))}assert(data.samples.every(s=>s.audioFeedback.detuneCents===0&&s.audioFeedback.intendedKey===s.expected));
// Failed native sharing falls back to a download, but cancellation does not.
c.navigator.canShare=()=>true;
c.navigator.share=async()=>{throw Object.assign(new Error('Unavailable'),{name:'NotAllowedError'})};
payload=null;await element('#resultsRaw').listeners.click();assert(payload instanceof Blob);assert.equal(JSON.parse(await payload.text()).samples.length,171);
c.navigator.share=async()=>{throw Object.assign(new Error('Cancelled'),{name:'AbortError'})};
payload=null;await element('#resultsRaw').listeners.click();assert.equal(payload,null);
// Wrong key and gap keep the pre-tap target while alignment may change it.
element('#restart').listeners.click();element('#goButton').listeners.click();
for(const ch of 'zthe quick brown fox') {const r=keys.find(k=>k.dataset.key===ch).getBoundingClientRect();element('#keyboard').listeners.pointerdown({pointerType:'touch',clientX:r.left+10,clientY:10});if(ch==='z')element('#keyboard').listeners.pointerdown({pointerType:'touch',clientX:-10,clientY:10});}
element('#downloadRaw').listeners.click();const wrong=JSON.parse(await payload.text());assert.equal(wrong.samples.length,21);assert(wrong.samples.every(s=>s.audioScaleCents===50));assert.equal(wrong.samples[0].audioFeedback.intendedKey,'t');assert.equal(wrong.samples[1].hit,null);assert.equal(wrong.samples[1].audioFeedback.intendedKey,'t');assert(wrong.samples.some(s=>s.type==='extra'));
element('#restart').listeners.click();element('#goButton').listeners.click();document.hidden=true;document.listeners.visibilitychange();assert(!a.active);document.hidden=false;element('#keyboard').listeners.pointerdown({pointerType:'touch',clientX:580,clientY:10});assert(a.active);element('#restart').listeners.click();assert(!a.active);
// Repeated starts stop the previous voices; unavailable Web Audio still permits typing.
for(let i=0;i<10;i++){a.start(ctx);a.start(ctx);a.stop()}
assert(nodes.every(o=>o.stopped));
c.AudioContext=class{constructor(){throw new Error('Audio unavailable')}};
vm.runInContext(fs.readFileSync('app.js','utf8'),c);
element('#goButton').listeners.click();assert(!a.active);
for(const ch of 'the quick brown fox'){const r=keys.find(k=>k.dataset.key===ch).getBoundingClientRect();element('#keyboard').listeners.pointerdown({pointerType:'touch',clientX:r.left+10,clientY:10})}
element('#downloadRaw').listeners.click();const silent=JSON.parse(await payload.text());assert.equal(silent.samples.length,19);assert(silent.samples.every(s=>s.audioFeedback.audioState==='unavailable'));
const html=fs.readFileSync('index.html','utf8'),sw=fs.readFileSync('sw.js','utf8');for(const [,url] of html.matchAll(/<script src="([^"]+)"/g))assert(sw.includes(url),url);assert(html.indexOf('accuracy-audio.js')<html.indexOf('app.js'));assert(fs.readFileSync('instructions.html','utf8').includes('thumbtype-lab-v18'));for(const file of fs.readdirSync('.').filter(f=>f.endsWith('.js')))new vm.Script(fs.readFileSync(file,'utf8'),{filename:file});console.log('PASS: audio mapping, lifecycle, all nine runs, exported scales and samples, wrong keys/gaps, share fallback/cancellation, reset/background resume, cache URLs and diagnostics');})();
