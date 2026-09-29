const CACHE='thumbtype-lab-v3';
const STATE='thumbtype-lab-state';
const ASSETS=['./','./index.html','./instructions.html','./manifest.webmanifest','./icon.svg'];
const ONBOARDED=new URL('./__onboarded__',self.registration.scope).href;

self.addEventListener('install',e=>e.waitUntil(
  caches.open(CACHE).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting())
));

self.addEventListener('activate',e=>e.waitUntil((async()=>{
  const keys=await caches.keys();
  await Promise.all(keys.filter(k=>k!==CACHE&&k!==STATE).map(k=>caches.delete(k)));
  await self.clients.claim();
  const state=await caches.open(STATE);
  const seen=await state.match(ONBOARDED);
  if(!seen){
    await state.put(ONBOARDED,new Response('1'));
    const clients=await self.clients.matchAll({type:'window',includeUncontrolled:true});
    const target=new URL('./instructions.html',self.registration.scope).href;
    for(const client of clients){
      if(client.url.startsWith(self.registration.scope)&&!client.url.includes('instructions.html')){
        try{await client.navigate(target)}catch{}
      }
    }
  }
})()));

async function cached(request){
  const hit=await caches.match(request);
  if(hit)return hit;
  try{
    const r=await fetch(request);
    if(r&&r.ok){const copy=r.clone();caches.open(CACHE).then(c=>c.put(request,copy));}
    return r;
  }catch{
    return caches.match('./index.html');
  }
}

function decorateIndex(html){
  if(html.includes('id="instructionsLink"'))return html;
  const inject=`\n<style>#instructionsLink{position:fixed;right:12px;bottom:calc(12px + env(safe-area-inset-bottom));z-index:80;min-height:42px;border:1px solid var(--border,#d8dce2);border-radius:999px;background:var(--card,#fff);color:var(--text,#15171a);padding:0 14px;font:650 14px -apple-system,BlinkMacSystemFont,"SF Pro Text",sans-serif;box-shadow:0 4px 18px #0003}</style>\n<button id="instructionsLink" type="button" onclick="location.href='./instructions.html'">Instructions</button>\n<script>(()=>{const w=Math.min(screen.width,screen.height),h=Math.max(screen.width,screen.height),dpr=devicePixelRatio||1,key=w+'x'+h+'@'+dpr;const guesses={'320x568@2':'iPhone SE (1st gen) / iPhone 5-series','375x667@2':'iPhone SE (2nd/3rd gen) / iPhone 6/7/8','414x736@3':'iPhone 6/7/8 Plus','375x812@3':'iPhone X / XS / 11 Pro','414x896@2':'iPhone XR / 11','414x896@3':'iPhone XS Max / 11 Pro Max','360x780@3':'iPhone 12 mini / 13 mini','390x844@3':'iPhone 12 / 12 Pro / 13 / 13 Pro / 14','428x926@3':'iPhone 12 Pro Max / 13 Pro Max / 14 Plus','393x852@3':'iPhone 14 Pro / 15 / 15 Pro / 16','430x932@3':'iPhone 14 Pro Max / 15 Plus / 15 Pro Max / 16 Plus','402x874@3':'Recent 6.3-inch iPhone class','440x956@3':'Recent 6.9-inch iPhone class'};const guess=guesses[key];const model=document.querySelector('#hardwareModel');const note=document.querySelector('#deviceNote');if(model&&guess&&(!model.value||model.value.includes('enter exact model')||model.value==='Unknown'))model.value=guess;if(note){const vv=visualViewport?Math.round(visualViewport.width)+'x'+Math.round(visualViewport.height)+' @'+visualViewport.scale:'unavailable';note.textContent=(guess?'Likely model inferred from screen metrics; verify if possible. ':'Exact iPhone model is not exposed to web apps. ')+ 'Screen '+w+'×'+h+' CSS px, DPR '+dpr+', viewport '+innerWidth+'×'+innerHeight+', visual viewport '+vv+'.';}})();<\/script>\n`;
  return html.replace('</body>',inject+'</body>');
}

self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET')return;
  e.respondWith((async()=>{
    const url=new URL(e.request.url);
    const isIndex=url.origin===self.location.origin&&(url.pathname===new URL('./',self.registration.scope).pathname||url.pathname.endsWith('/index.html'));
    const r=await cached(e.request);
    if(!isIndex||!r)return r;
    const html=await r.text();
    const headers=new Headers(r.headers);headers.set('content-type','text/html; charset=utf-8');
    return new Response(decorateIndex(html),{status:r.status,statusText:r.statusText,headers});
  })());
});
