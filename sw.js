const CACHE='thumbtype-lab-v14';
const ASSETS=['./','./index.html','./instructions.html','./styles.css?v=5','./app.js?v=7','./device-detect.js?v=4','./preferences.js?v=2','./results-reopen.js?v=1','./accuracy-audio.js?v=1','./manifest.webmanifest','./icon.svg'];

self.addEventListener('install',event=>{
  event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS)).then(()=>self.skipWaiting()));
});

self.addEventListener('activate',event=>{
  event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim()));
});

async function networkFirst(request){
  try{
    const response=await fetch(request,{cache:'no-store'});
    if(response&&response.ok){const copy=response.clone();caches.open(CACHE).then(cache=>cache.put(request,copy));}
    return response;
  }catch{
    return (await caches.match(request)) || caches.match('./index.html');
  }
}

async function cacheFirst(request){
  const hit=await caches.match(request);
  if(hit)return hit;
  try{
    const response=await fetch(request,{cache:'no-store'});
    if(response&&response.ok){const copy=response.clone();caches.open(CACHE).then(cache=>cache.put(request,copy));}
    return response;
  }catch{
    return caches.match('./index.html');
  }
}

self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET')return;
  event.respondWith(event.request.mode==='navigate'?networkFirst(event.request):cacheFirst(event.request));
});