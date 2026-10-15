(() => {
  'use strict';
  const data=window.OFFICE_DATA;
  const $=id=>document.getElementById(id);
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const paths={
    home:'<path d="m3 10 9-7 9 7v10h-6v-7H9v7H3Z"/>',
    graduation:'<path d="m2 9 10-5 10 5-10 5ZM6 11v6c4 3 8 3 12 0v-6M22 9v8"/>',
    book:'<path d="M12 5v16M3 4c3-1 6-1 9 1 3-2 6-2 9-1v15c-3-1-6-1-9 2-3-3-6-3-9-2Z"/>',
    files:'<path d="M8 3h9l4 4v13H8ZM17 3v5h4M4 7H3v14h1"/>',
    layers:'<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
    phone:'<path d="M7 3H4c-2 0-1 7 4 12s12 6 12 4v-3l-5-2-2 2c-3-2-5-4-6-6l2-2Z"/>',
    calendar:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4m10-4v4M3 11h18M7 15h3m4 0h3m-10 3h3"/>',
    check:'<path d="M14 3H5v18h14V8ZM14 3v5h5M8 14l3 3 5-6"/>',
    users:'<circle cx="9" cy="7" r="3"/><path d="M3 21v-3c0-6 12-6 12 0v3M16 4c5 0 5 6 0 6M18 14c3 0 3 3 3 7"/>',
    pin:'<path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/>',
    external:'<path d="M14 3h7v7M21 3l-11 11M10 3H3v18h18v-7"/>',
    arrow:'<path d="M4 12h16m-6-6 6 6-6 6"/>',
    download:'<path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5"/>'
  };
  const icon=name=>'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+(paths[name]||paths.book)+'</svg>';
  const card=([title,description,url,key])=>`<a class="link-card" href="${esc(url)}" target="_blank" rel="noopener noreferrer"><span class="feature-icon">${icon(key)}</span><div><h3>${esc(title)}</h3><p>${esc(description)}</p></div>${icon('external')}</a>`;
  const groups=items=>items.map(group=>`<section><h3 class="group-title">${esc(group.title)}</h3><div class="link-grid">${group.items.map(card).join('')}</div></section>`).join('');
  $('study-list').innerHTML=groups(data.study);
  $('document-list').innerHTML=groups(data.documents);
  $('service-list').innerHTML=data.services.map(([title,description,url,key])=>`<article class="service-card panel"><span class="feature-icon">${icon(key)}</span><h3>${esc(title)}</h3><p>${esc(description)}</p><a class="text-link" href="${esc(url)}" target="_blank" rel="noopener noreferrer">Відкрити ${icon('external')}</a></article>`).join('');
  const quick=[data.services[0],data.documents[0].items[0],data.services[1]];
  $('quick-links').innerHTML=quick.map(([title,,url,key])=>`<a class="quick-link" href="${esc(url)}" target="_blank" rel="noopener noreferrer">${icon(key)}<span>${esc(title)}</span>${icon('external')}</a>`).join('')+`<button type="button" class="quick-link quick-contact" data-view="contacts" style="border:0;background:transparent;width:100%;text-align:left;font:inherit">${icon('phone')}<span>Контакти відділу</span>${icon('arrow')}</button>`;
  $('news-list').innerHTML=data.news.map(item=>`<a class="news-card" href="${esc(item.url)}" target="_blank" rel="noopener noreferrer"><div class="news-meta"><span>${esc(item.category)}</span><time datetime="${esc(item.date)}">${esc(new Intl.DateTimeFormat('uk-UA',{day:'numeric',month:'long',year:'numeric'}).format(new Date(item.date+'T12:00:00')))}</time></div><h3>${esc(item.title)}</h3><span class="text-link">Читати ${icon('external')}</span></a>`).join('');
  $('official-page').href=data.source;$('source-news').href=data.source;
  document.querySelectorAll('[data-icon]').forEach(node=>node.innerHTML=icon(node.dataset.icon));
  // Website pages are read from a server-generated snapshot, not fetched from NUBiP in the browser.
  let snapshot=null,loadingSnapshot=false,readerOrigin='documents',restoreReaderScroll=null;
  const readerTrail=[];
  const sourceSeeds=new Set([...data.study.flatMap(g=>g.items.map(x=>x[2])),...data.documents.flatMap(g=>g.items.map(x=>x[2])),...data.services.map(x=>x[2])].filter(url=>url.startsWith('https://nubip.edu.ua/')).map(canonical));
  function canonical(value){try{const u=new URL(value,location.href);if(!['nubip.edu.ua','www.nubip.edu.ua'].includes(u.hostname))return null;return 'https://nubip.edu.ua'+(u.pathname.replace(/\/$/,'')||'/')+u.search;}catch{return null;}}
  function savedPage(url){return snapshot?.pages?.[url]||Object.values(snapshot?.pages||{}).find(p=>(p.aliases||[]).includes(url));}
  function canRead(url){const key=canonical(url);return key&&(sourceSeeds.has(key)||savedPage(key)||/^\/(?:news\/|shablony-|pamyat|osvitn|spetsialnosti|vstup-do-|normatyvno-|akredyt|vidomosti-|rekomendatsiyi-|zamovlennya-|komanda|akademichna-|antykoruptsiyni-|obhovorennya|anketuvannya|doktorski-spetsializovani|razovi-spetsializovani|reytynhovi-spysky-)/.test(new URL(key).pathname))&&!/\.(?:pdf|docx?|xlsx?|zip|png|jpe?g|webp)$/i.test(new URL(key).pathname);}
  function readableFragment(html,base){
    const doc=new DOMParser().parseFromString(html,'text/html');
    const allowed=new Set('p div section span h2 h3 h4 h5 h6 strong b em i u s br hr ul ol li blockquote pre code table thead tbody tfoot tr th td caption a img details summary figure figcaption dl dt dd sup sub'.split(' '));
    for(const node of [...doc.body.querySelectorAll('*')]){
      const tag=node.tagName.toLowerCase();
      if(['script','style','iframe','object','embed','form','input','button','svg'].includes(tag)){node.remove();continue;}
      if(!allowed.has(tag)){node.replaceWith(...node.childNodes);continue;}
      for(const attr of [...node.attributes])if(!['href','src','alt','id','colspan','rowspan','loading'].includes(attr.name))node.removeAttribute(attr.name);
      if(node.id)node.id='content-'+node.id;
      for(const attr of ['href','src'])if(node.hasAttribute(attr)){
        try{const url=new URL(node.getAttribute(attr),base);if(!['http:','https:','mailto:','tel:'].includes(url.protocol))node.removeAttribute(attr);else node.setAttribute(attr,url.href);}catch{node.removeAttribute(attr);}
      }
      if(tag==='a'){node.target='_blank';node.rel='noopener noreferrer';}
      if(tag==='img')node.loading='lazy';
    }
    for(const table of [...doc.body.querySelectorAll('table')]){const wrap=doc.createElement('div');wrap.className='reader-table-scroll';wrap.tabIndex=0;wrap.setAttribute('role','region');wrap.setAttribute('aria-label','Таблиця');table.before(wrap);wrap.append(table);}
    return [...doc.body.childNodes];
  }
  // App-specific presentation; the synchronized source remains unchanged.
  function renderCouncils(page){
    if(new URL(page.url).pathname!=='/razovi-spetsializovani-vcheni-rady')return false;
    const source=document.createElement('div');source.append(...readableFragment(page.html,page.url));
    const links=[...source.querySelectorAll('a[href]')].map(a=>({name:a.textContent.replace(/\s+/g,' ').trim(),url:a.href}));
    source.querySelectorAll('br').forEach(n=>n.replaceWith('\n'));
    source.querySelectorAll('p,div,h2,h3,li').forEach(n=>n.append('\n'));
    const text=source.textContent.replace(/\u00a0/g,' ');
    const markers=[...text.matchAll(/(?:^|\n)\s*((?:20\d{2})\s*рік|РСВР\s*№?\s*\d+[^\S\n]*)/g)];
    if(!markers.some(m=>m[1].startsWith('РСВР')))return false;
    const groups=new Map();let year='Інші роки';
    const clean=s=>s.replace(/\s+/g,' ').trim();
    for(let i=0;i<markers.length;i++){
      const marker=markers[i],label=clean(marker[1]);
      if(!label.startsWith('РСВР')){year=label;if(!groups.has(year))groups.set(year,[]);continue;}
      const raw=text.slice(marker.index+marker[0].length,markers[i+1]?.index??text.length).trim();
      const full=clean(raw),match=full.match(/Захист дисертації\s+(.+?)(?=\s+на тему\s*:|$)/i);
      const name=match?clean(match[1]):'';
      const link=links.find(a=>a.name===name)||links.find(a=>name&&a.name&&name.startsWith(a.name));
      const entry={label,raw,full,name,url:link?.url};
      if(!groups.has(year))groups.set(year,[]);groups.get(year).push(entry);
    }
    const root=document.createElement('div');root.className='council-years';
    const current=new Intl.DateTimeFormat('en',{year:'numeric',timeZone:'Europe/Kyiv'}).format(new Date());
    function field(parent,label,value){if(!value)return;const p=document.createElement('p'),b=document.createElement('strong');b.textContent=label+': ';p.append(b,value);parent.append(p);}
    for(const [label,entries] of groups){
      if(!entries.length)continue;
      const group=document.createElement('details');group.className='council-year';group.open=label.startsWith(current);
      const summary=document.createElement('summary');summary.append(label);const count=document.createElement('span');count.className='council-count';count.textContent=String(entries.length);count.setAttribute('aria-label','Кількість рад: '+entries.length);summary.append(count);group.append(summary);
      const list=document.createElement('div');list.className='council-list';group.append(list);
      for(const entry of entries){
        const card=document.createElement('details');card.className='council-card';const head=document.createElement('summary');
        const badge=document.createElement('span');badge.className='council-badge';badge.textContent=entry.label;head.append(badge);
        const candidate=document.createElement('span');candidate.className='council-candidate';candidate.append('Захист дисертації ');const strong=document.createElement('strong');strong.textContent=entry.name||'Інформація про здобувача';candidate.append(strong);head.append(candidate);card.append(head);
        const body=document.createElement('div');body.className='council-body';
        const topic=entry.full.match(/на тему\s*:\s*(.+?)(?=,?\s*поданої на здобуття|\s+зі спеціальності|$)/i);
        const specialty=entry.full.match(/(?:зі\s+)?спеціальності\s+(.+?)(?=\s+галузі знань|\s*\(рішення|$)/i);
        const area=entry.full.match(/галузі знань\s+(.+?)(?=\s*\(рішення|$)/i);
        const basis=entry.full.match(/\(?рішення Вченої ради[\s\S]+$/i);
        // Keep the source wording if its structure changes, rather than dropping information.
        if(topic&&specialty&&area&&basis&&entry.name){
          field(body,'Тема',topic[1].replace(/,\s*$/,''));field(body,'Спеціальність',specialty[1]);field(body,'Галузь знань',area[1]);
          const legal=document.createElement('details');legal.className='council-basis';const title=document.createElement('summary');title.textContent='Підстава створення ради';legal.append(title);const p=document.createElement('p');p.textContent=basis[0];legal.append(p);body.append(legal);
        }else{const p=document.createElement('p');p.className='council-original';p.textContent=entry.raw;body.append(p);}
        if(entry.url){const a=document.createElement('a');a.className='text-link';a.href=entry.url;a.target='_blank';a.rel='noopener noreferrer';a.textContent='Інформація про захист ↗';body.append(a);}
        card.append(body);list.append(card);
      }
      root.append(group);
    }
    const intro=text.slice(0,markers[0].index).trim();if(intro){const p=document.createElement('p');p.textContent=intro;root.prepend(p);}
    $('reader-content').append(root);return true;
  }

  function renderReader(url){
    const page=savedPage(url);$('reader-source').href=url||data.source;
    $('reader-content').replaceChildren();$('reader-updated').textContent='';
    if(page){
      $('title-page').textContent=page.title;
      if(!renderCouncils(page))$('reader-content').append(...readableFragment(page.html,page.url));
      const failed=snapshot.errors?.some(item=>item.url===url||(page.aliases||[]).includes(item.url));
      if(failed)$('reader-updated').textContent='Показано збережений зміст: під час останньої перевірки джерело було недоступне.';
      else if(page.checkedAt)$('reader-updated').textContent='Перевірено: '+formatSyncDate(page.checkedAt)+' (київський час)';
    }else{
      $('title-page').textContent='Завантаження інформації';
      $('reader-content').textContent=loadingSnapshot?'Завантажую збережені дані…':'Цю сторінку ще не завантажено автоматично. Після першої успішної перевірки сайту вона з’явиться тут.';
    }
  }
  const formatSyncDate=value=>{try{return new Intl.DateTimeFormat('uk-UA',{dateStyle:'short',timeStyle:'short',timeZone:'Europe/Kyiv'}).format(new Date(value));}catch{return '';}};
  function updateNews(){
    const news=snapshot?.news?.length?snapshot.news:data.news;
    $('news-list').innerHTML=news.map(item=>`<a class="news-card" href="${esc(item.url)}"><div class="news-meta"><span>${esc(item.category||'Новини відділу')}</span>${item.date?`<time datetime="${esc(item.date)}">${esc(new Intl.DateTimeFormat('uk-UA',{day:'numeric',month:'long',year:'numeric'}).format(new Date(item.date+'T12:00:00')))}</time>`:''}</div><h3>${esc(item.title)}</h3><span class="text-link">Читати ${icon('arrow')}</span></a>`).join('');
  }
  function updateContacts(){
    const contact=snapshot?.contact;if(!contact)return;
    if(contact.address)$('contact-address').textContent=contact.address;
    if(contact.phones?.length)$('contact-phones').innerHTML=contact.phones.map(p=>/^tel:\+?\d+$/.test(p.url)?`<a class="phone-link" href="${esc(p.url)}">${esc(p.label)}</a>`:'').join('');
    $('contact-emails').innerHTML=(contact.emails||[]).map(p=>/^mailto:[\w.+-]+@[\w.-]+$/.test(p.url)?`<a class="text-link contact-email" href="${esc(p.url)}">${esc(p.label)}</a>`:'').join('');
  }
  async function loadSnapshot(){
    if(loadingSnapshot)return;loadingSnapshot=true;$('refresh-data').disabled=true;
    const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),15000);
    try{
      const response=await fetch('./data.json?v=2',{cache:'no-store',signal:controller.signal});if(!response.ok)throw Error('snapshot');const next=await response.json();
      if(next.version!==1||!next.pages||typeof next.pages!=='object')throw Error('schema');snapshot=next;
      const note=next.pending?'Готується перше автоматичне завантаження.':next.errors?.length?' Не всі сторінки вдалося оновити.':next.stats?.remaining?' Перевірка вкладених сторінок продовжиться під час наступного оновлення.':'';
      $('sync-status').textContent=next.checkedAt?'Перевірено: '+formatSyncDate(next.checkedAt)+' (київський час).'+note:note;
      updateNews();updateContacts();
    }catch{$('sync-status').textContent=snapshot?'Не вдалося перевірити оновлення. Використовуємо збережені дані.':'Дані поки недоступні. Перевірте підключення або дочекайтеся першого автоматичного оновлення.';}
    finally{clearTimeout(timeout);loadingSnapshot=false;$('refresh-data').disabled=false;if(location.hash.startsWith('#page/'))setView(location.hash.slice(1),false);}
  }
  function openReader(url){
    const key=canonical(url);if(!key)return;
    if(location.hash.startsWith('#page/')){
      const current=decodeURIComponent(location.hash.slice(6));const anchor=new URL(url).hash.slice(1);
      if(canonical(current)===key&&anchor){const target=$('reader-content').querySelector('[id="content-'+CSS.escape(decodeURIComponent(anchor))+'"]');if(target)target.scrollIntoView({block:'start'});return;}
    }
    const current=document.querySelector('.view:not([hidden])');if(current&&current.id!=='view-page'){readerOrigin=current.id.replace('view-','');readerTrail.length=0;}
    readerTrail.push({hash:location.hash||'#home',scrollY:window.scrollY});
    location.hash='page/'+encodeURIComponent(key);
  }
  document.addEventListener('click',event=>{
    if(event.target.closest('button[data-view]')){readerTrail.length=0;return;}
    const link=event.target.closest('a[href]');if(!link||link.id==='reader-source'||link.id==='official-page'||link.id==='source-news')return;
    if(event.ctrlKey||event.metaKey||event.shiftKey||event.altKey)return;
    if(canRead(link.href)){event.preventDefault();openReader(link.href);}
  });
  $('reader-back').onclick=()=>{const previous=readerTrail.pop();restoreReaderScroll=previous?.scrollY??0;location.hash=previous?.hash||'#'+readerOrigin;};
  $('refresh-data').onclick=()=>loadSnapshot();
  let lastResumeCheck=Date.now();
  document.addEventListener('visibilitychange',()=>{if(!document.hidden&&Date.now()-lastResumeCheck>300000){lastResumeCheck=Date.now();loadSnapshot();}});
  setInterval(()=>{if(!document.hidden)loadSnapshot();},900000);

  const names=['home','study','documents','services','contacts','page'];
  function setView(name,moveFocus=true){
    if(name.startsWith('page/')){let url;try{url=canonical(decodeURIComponent(name.slice(5)));}catch{}renderReader(url);name='page';}
    if(!names.includes(name))name='home';
    document.querySelectorAll('.view').forEach(node=>node.hidden=node.id!=='view-'+name);
    document.querySelectorAll('.bottom-nav button').forEach(button=>{const active=button.dataset.view===(name==='page'?readerOrigin:name);button.classList.toggle('current',active);button.setAttribute('aria-current',active?'page':'false');});
    if(moveFocus){$('title-'+name).focus({preventScroll:true});if(name==='home')window.scrollTo({top:0,behavior:'instant'});else $('title-'+name).scrollIntoView({block:'start',behavior:'instant'});if(restoreReaderScroll!==null){window.scrollTo({top:restoreReaderScroll,behavior:'instant'});restoreReaderScroll=null;}}
  }
  document.addEventListener('click',event=>{const button=event.target.closest('button[data-view]');if(!button)return;const name=button.dataset.view;if(location.hash==='#'+name)setView(name);else location.hash=name;});
  window.addEventListener('hashchange',()=>setView(location.hash.slice(1)));
  setView(location.hash.slice(1),false);
  loadSnapshot();
  const updateOnline=()=>{$('offline-message').hidden=navigator.onLine;};
  window.addEventListener('online',updateOnline);window.addEventListener('offline',updateOnline);updateOnline();
  let installPrompt=null;
  window.addEventListener('beforeinstallprompt',event=>{event.preventDefault();installPrompt=event;});
  $('install-app').onclick=async()=>{if(installPrompt){await installPrompt.prompt();await installPrompt.userChoice;installPrompt=null;}else $('install-help').showModal();};
  const hideInstall=()=>{$('install-app').hidden=true;};
  window.addEventListener('appinstalled',hideInstall);if(matchMedia('(display-mode:standalone)').matches||navigator.standalone)hideInstall();
  if('serviceWorker' in navigator&&/^https?:$/.test(location.protocol)){
    const controlled=!!navigator.serviceWorker.controller;let reloading=false;
    navigator.serviceWorker.addEventListener('controllerchange',()=>{if(controlled&&!reloading){reloading=true;location.reload();}});
    window.addEventListener('load',()=>navigator.serviceWorker.register('./service-worker.js',{updateViaCache:'none'}).then(r=>r.update()).catch(()=>{}));
  }
})();
