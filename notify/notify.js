// HQRA — কার্ড ছাড়া নোটিফিকেশন (GitHub Actions + cron-job.org)
const admin=require('firebase-admin');
const sa=JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT||'{}');
if(!sa.project_id){console.log('FIREBASE_SERVICE_ACCOUNT সেট করা নেই');process.exit(0)}
admin.initializeApp({credential:admin.credential.cert(sa)});
const db=admin.firestore();
const TG_T=process.env.TELEGRAM_TOKEN,TG_C=process.env.TELEGRAM_CHAT;
const since=new Date(Date.now()-3*864e5).toISOString();

async function tg(text){
  if(!TG_T||!TG_C)return;
  try{const r=await fetch('https://api.telegram.org/bot'+TG_T+'/sendMessage',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({chat_id:TG_C,text})});if(!r.ok)console.log('telegram',r.status)}catch(e){console.log('telegram',e.message)}
}
async function push(key,title,body){
  const r=await push0(key,title,body);
  const w=String(global.__why||'');
  global.__noTok=/টোকেন নেই|কী নেই/.test(w);
  if(!r&&!global.__noTok)await tg('⚠️ পুশ যায়নি\nসদস্য: '+(key||'(কী নেই)')+'\n'+title+'\nকারণ: '+w);
  return r;
}
async function push0(key,title,body){
  global.__why='';
  if(!key){global.__why='সদস্য কী নেই';console.log('push: সদস্য কী নেই');return false}
  const d=await db.collection('hqra_fcmTokens').doc(String(key)).get();
  const toks=d.exists?(d.data().tokens||[]):[];
  if(!toks.length){global.__why='টোকেন নেই (নোটিফিকেশন চালু করেনি)';console.log('push: '+key+' — এই সদস্যের ফোনের টোকেন নেই (নোটিফিকেশন চালু করেনি)');return false}
  const res=await admin.messaging().sendEachForMulticast({tokens:toks,data:{title:String(title),body:String(body||'').slice(0,140),url:'/'},webpush:{headers:{Urgency:'high',TTL:'86400'}}});
  console.log('push: '+key+' — '+title+' — সফল '+res.successCount+', ব্যর্থ '+res.failureCount);global.__why='সফল '+res.successCount+', ব্যর্থ '+res.failureCount;
  const dead=[];res.responses.forEach((r,i)=>{if(!r.success){console.log('  ব্যর্থ কারণ: '+((r.error&&r.error.code)||'')+' | '+((r.error&&r.error.message)||'').slice(0,160));global.__why+=' | '+((r.error&&r.error.code)||'');if(/not-registered|invalid-registration/.test((r.error&&r.error.code)||''))dead.push(toks[i])}});
  if(dead.length)await d.ref.update({tokens:toks.filter(t=>!dead.includes(t))});
  return res.successCount>0;
}
const money=n=>'৳ '+Number(n||0).toLocaleString('en-US');

(async()=>{
  const tk=await db.collection('hqra_fcmTokens').get();console.log('টোকেন জমা আছে: '+tk.size+' জন সদস্যের (কী: '+tk.docs.map(x=>x.id).join(', ')+')');
  if(process.env.TEST_KEY){await push(process.env.TEST_KEY.trim(),'🔔 পরীক্ষা','HQRA নোটিফিকেশন ঠিকমতো কাজ করছে।')}
  // ১) পেমেন্ট: নতুন জমা → অ্যাডমিন টেলিগ্রাম; অবস্থা বদলালে → সদস্যকে পুশ
  const ps=await db.collection('hqra_payments').where('createdAt','>',since).get();
  for(const doc of ps.docs){
    const p=doc.data(),upd={};
    if(p.status==='pending'&&!p.tgNew){
      await tg('💰 নতুন পেমেন্ট\n'+(p.name||'')+' ('+(p.memberNo||'')+')\n'+money(p.amount)+' • '+(p.kind==='share'?'শেয়ার কিস্তি':'মাসিক জমা')+'\nTrxID: '+(p.trxId||'')+'\nনম্বর: '+(p.senderNumber||''));
      upd.tgNew=true;
    }
    if((p.status==='approved'||p.status==='rejected')&&p.notifiedStatus!==p.status){
      if(p.status==='approved'){await push(p.memberKey,'✅ পেমেন্ট নিশ্চিত হয়েছে',money(p.amount)+' আপনার হিসাবে যুক্ত হয়েছে।');await tg('✅ নিশ্চিত'+(p.auto?' (অটো)':'')+'\n'+(p.name||'')+' • '+money(p.amount)+' • '+(p.trxId||''))}
      else await push(p.memberKey,'❌ পেমেন্ট গ্রহণ হয়নি',money(p.amount)+' — অ্যাডমিনের সাথে যোগাযোগ করুন।');
      upd.notifiedStatus=p.status;
    }
    if(Object.keys(upd).length)await doc.ref.update(upd);
  }
  // ২) বার্তা: অ্যাডমিনের বার্তা → সদস্যকে পুশ; সদস্যের বার্তা → অ্যাডমিন টেলিগ্রাম
  const ms=await db.collection('hqra_messages').where('createdAt','>',since).get();
  for(const doc of ms.docs){
    const m=doc.data();if(m.pushed)continue;
    if(m.from==='admin')await push(m.memberKey,'অ্যাডমিনের বার্তা',m.text);
    else if(m.from==='member')await tg('💬 সদস্যের বার্তা\n'+(m.name||'')+' ('+(m.memberNo||'')+')\n'+String(m.text||'').slice(0,300));
    await doc.ref.update({pushed:true});
  }
  // ৩) নতুন নোটিশ → সংশ্লিষ্ট সদস্যকে পুশ
  const stRef=db.collection('hqra_pushState').doc('main'),stDoc=await stRef.get(),state=stDoc.exists?stDoc.data():{},seen=state.notices||{},first=!stDoc.exists;
  const next={};const sts=await db.collection('hqra_statements').get();let nOk=0,nNo=0,nTitle='';
  for(const d of sts.docs){
    const s=d.data(),ids=(Array.isArray(s.notices)?s.notices:[]).map(n=>String(n.title||'')+'|'+String(n.date||''));
    next[d.id]=ids;
    if(first)continue;
    const old=new Set(seen[d.id]||[]);const fresh=(Array.isArray(s.notices)?s.notices:[]).filter(n=>!old.has(String(n.title||'')+'|'+String(n.date||'')));
    if(fresh.length){nTitle=String(fresh[fresh.length-1].title||'');const ok=await push(d.id,'নতুন নোটিশ',nTitle);if(ok)nOk++;else if(global.__noTok)nNo++}
  }
  if(nOk+nNo>0)await tg('📢 নতুন নোটিশ: '+nTitle+'\nফোনে পাঠানো হয়েছে: '+nOk+' জন\nনোটিফিকেশন চালু নেই: '+nNo+' জন');
  await stRef.set({notices:next,updatedAt:new Date().toISOString()});
  console.log('ok');
})().catch(e=>{console.error(e);process.exit(1)});
