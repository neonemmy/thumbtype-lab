const CACHE='thumbtype-lab-v6';
const ASSETS=['./','./index.html','./instructions.html','./styles.css','./app.js','./manifest.webmanifest','./icon.svg'];

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
    const response=await fetch(request);
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
