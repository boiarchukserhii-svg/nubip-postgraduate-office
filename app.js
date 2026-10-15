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
  $('news-list').innerHTML=data.news.map(item=>`<a class="news-card" href="${esc(item.url)}" target="_blank" rel="noopener noreferrer"><div class="news-meta"><span>${esc(item.category)}</span><time datetime="${esc(item.date)}">${esc(new Intl.DateTimeFormat('uk-UA',{day:'numeric',month:'long',year:'numeric'}).format(new Date(item.date+'T12:00:00')))}</time></div><h3>${esc(item.title)}</h3><span class="text-link">Читати на сайті Університету ${icon('external')}</span></a>`).join('');
  $('official-page').href=data.source;$('source-news').href=data.source;
  document.querySelectorAll('[data-icon]').forEach(node=>node.innerHTML=icon(node.dataset.icon));
  const names=['home','study','documents','services','contacts'];
  function setView(name,moveFocus=true){
    if(!names.includes(name))name='home';
    document.querySelectorAll('.view').forEach(node=>node.hidden=node.id!=='view-'+name);
    document.querySelectorAll('.bottom-nav button').forEach(button=>{const active=button.dataset.view===name;button.classList.toggle('current',active);button.setAttribute('aria-current',active?'page':'false');});
    if(moveFocus){$('title-'+name).focus({preventScroll:true});if(name==='home')window.scrollTo({top:0,behavior:'instant'});else $('title-'+name).scrollIntoView({block:'start',behavior:'instant'});}
  }
  document.addEventListener('click',event=>{const button=event.target.closest('button[data-view]');if(!button)return;const name=button.dataset.view;if(location.hash==='#'+name)setView(name);else location.hash=name;});
  window.addEventListener('hashchange',()=>setView(location.hash.slice(1)));
  setView(location.hash.slice(1),false);
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
