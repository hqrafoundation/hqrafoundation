#!/usr/bin/env python3
# member_app.html থেকে site/index.html ও site/version.json বানায় (প্রতিবার নতুন সংস্করণ নম্বর)
import re,time,sys
v=time.strftime('%Y-%m-%d-%H%M')
s=open('member_app.html',encoding='utf-8').read()
s=re.sub(r'window.HQRA_APP_VER="[^"]*"','window.HQRA_APP_VER="%s"'%v,s)
old=open('site/index.html',encoding='utf-8').read()
head=re.findall(r'<(?:link|meta)[^>]*(?:manifest|icon|og:|twitter)[^>]*>',old)
t='<meta name="theme-color" content="#0d1730">'
s=s.replace(t,t+''.join(x for x in head if x not in s),1)
sw="<script>if('serviceWorker' in navigator){window.addEventListener('load',function(){navigator.serviceWorker.register('sw.js').catch(function(){})})}</script>"
if sw not in s:s=s[:s.rindex('</body>')]+sw+s[s.rindex('</body>'):]
open('site/index.html','w',encoding='utf-8').write(s);open('site/version.json','w').write('{"v":"%s"}'%v)
print('সংস্করণ',v)
