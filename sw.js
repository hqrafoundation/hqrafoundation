self.addEventListener('install',function(){self.skipWaiting()});
self.addEventListener('activate',function(e){e.waitUntil(self.clients.claim())});
self.addEventListener('fetch',function(e){});
// পুশ নোটিফিকেশন (অ্যাপ বন্ধ থাকলেও)
self.addEventListener('push',function(e){
 var j={};try{j=e.data?e.data.json():{}}catch(x){}
 var d=j.data||j.notification||j;
 var t=d.title||'HQRA ফাউন্ডেশন',b=d.body||'';
 e.waitUntil(self.registration.showNotification(t,{body:b,icon:'icon-192.png',badge:'badge-96.png',vibrate:[250,120,250],requireInteraction:true,renotify:true,tag:'hqra-'+Date.now(),timestamp:Date.now(),data:{url:d.url||'./'}}));
});
self.addEventListener('notificationclick',function(e){
 e.notification.close();
 e.waitUntil(self.clients.matchAll({type:'window',includeUncontrolled:true}).then(function(l){
  for(var i=0;i<l.length;i++){if('focus' in l[i])return l[i].focus()}
  return self.clients.openWindow('./');
 }));
});
