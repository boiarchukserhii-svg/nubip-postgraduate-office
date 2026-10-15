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
  $('service-list').innerHTML=data.services.map(([title,description,url,key])=>`<article class="service-card panel"><span class="feature-icon">${icon(key)}</span><h3>${esc(title)}</h3><p>${esc(description)}</p><a class="secondary service-open" href="${esc(url)}" target="_blank" rel="noopener noreferrer">Відкрити ${icon('external')}</a></article>`).join('');
  $('official-page').href=data.source;
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
    // Keep image-only information sheets; remove illustrations from text articles.
    if(doc.body.textContent.replace(/\s+/g,' ').trim().length>=25){
      for(const img of [...doc.body.querySelectorAll('img')]){
        const link=img.closest('a');img.remove();
        if(link&&!link.textContent.trim()&&!link.querySelector('img'))link.remove();
      }
      for(const node of [...doc.body.querySelectorAll('p,figure,div')].reverse()){
        if(!node.textContent.trim()&&!node.querySelector('img,table,hr'))node.remove();
      }
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
    const markers=[...text.matchAll(/(?:^|\n)\s*((?:20\d{2})\s*рік|(?:РСВР\s*№?\s*\d+|ДФ\s*\d+\.\d+\.\d+)[^\S\n]*)/g)];
    if(!markers.some(m=>m[1].startsWith('РСВР')))return false;
    const groups=new Map();let year='Інші роки';
    const clean=s=>s.replace(/\s+/g,' ').trim();
    for(let i=0;i<markers.length;i++){
      const marker=markers[i],label=clean(marker[1]);
      if(/^20\d{2}/.test(label)){year=label;if(!groups.has(year))groups.set(year,[]);continue;}
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
        const specialty=entry.full.match(/(?:зі\s+)?спеціальності\s+(.+?)(?=\s+(?:з\s+)?галузі знань|\s*\((?:рішення|Наказ)|$)/i);
        const area=entry.full.match(/галузі знань\s+(.+?)(?=\s+та спеціальності|\s*\((?:рішення|Наказ)|$)/i);
        const basis=entry.full.match(/\(?(?:рішення Вченої ради|Наказ МОН України)[\s\S]+$/i);
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

  function renderTeam(page){
    if(new URL(page.url).pathname!=='/komanda-3')return false;
    const source=document.createElement('div');source.append(...readableFragment(page.html,page.url));
    const members=[];
    for(const row of source.querySelectorAll('tr')){
      const paragraphs=[...row.querySelectorAll('p')];
      const nameIndex=paragraphs.findIndex(p=>p.querySelector('strong,b')&&p.textContent.trim());
      if(nameIndex<0)continue;
      const name=paragraphs[nameIndex].textContent.replace(/\s+/g,' ').trim();
      const roleParagraph=paragraphs.slice(nameIndex+1).find(p=>p.textContent.trim());
      if(!roleParagraph)continue;
      let role=roleParagraph.textContent.replace(/\s+/g,' ').trim()
        .replace(/\s+аспірантури,\s*докторантури[\s\S]*$/i,'').replace(/[,;.]\s*$/,'');
      role=role.charAt(0).toLocaleLowerCase('uk-UA')+role.slice(1);
      members.push({name,role});
    }
    if(!members.length)return false;
    const grid=document.createElement('div');grid.className='team-grid';
    for(const member of members){
      const card=document.createElement('section');card.className='team-card';
      const name=document.createElement('h3');name.textContent=member.name;
      const role=document.createElement('p');role.textContent=member.role;
      card.append(name,role);grid.append(card);
    }
    $('reader-content').append(grid);return true;
  }

  const certificateEndpoint='https://script.google.com/macros/s/AKfycbxQm-d75PsUmd5cRjWkJYoC2rLPqEAP8NbicW7lNP4kUeU0kZDqbZJ-YDnfjvmhgXB7/exec';
  function certificateStatus(requestId){
    return new Promise((resolve,reject)=>{
      const callback='officeAck_'+requestId,script=document.createElement('script');let timer;
      const cleanup=()=>{clearTimeout(timer);script.remove();delete window[callback];};
      window[callback]=result=>{cleanup();resolve(result);};
      script.onerror=()=>{cleanup();reject(Error('status'));};
      const url=new URL(certificateEndpoint);url.searchParams.set('requestId',requestId);url.searchParams.set('callback',callback);url.searchParams.set('_',Date.now());
      script.src=url.href;script.referrerPolicy='no-referrer';timer=setTimeout(()=>{cleanup();reject(Error('timeout'));},10000);document.head.append(script);
    });
  }
  function renderCertificate(url){
    if(url!=='https://nubip.edu.ua/zamovlennya-dovidok')return false;
    $('title-page').textContent='Замовлення довідки';
    const content=$('reader-content');
    content.innerHTML=`<p class="certificate-timing">Підготовка - від 1 до 5 робочих днів</p>
      <form class="certificate-native">
        <div class="certificate-fields">
          <label class="certificate-wide">Яка довідка потрібна?<select name="certificate" required><option value="current">Про те, що зараз навчаюся в аспірантурі</option><option value="past">Про навчання в аспірантурі в минулому</option></select></label>
          <label class="certificate-wide">Прізвище, ім’я та по батькові<input name="person" autocomplete="name" minlength="3" maxlength="200" required placeholder="Вкажіть повне ім’я"></label>
          <label>Електронна пошта<input name="email" type="email" autocomplete="email" maxlength="200" required placeholder="name@example.com"></label>
          <label>Телефон<input name="phone" type="tel" autocomplete="tel" maxlength="40" required placeholder="+380"></label>
          <label>Рік навчання<select name="year" required><option value="1">1 рік навчання</option><option value="2">2 рік навчання</option><option value="3">3 рік навчання</option><option value="4">4 рік навчання</option><option value="graduate">Випускник</option></select></label>
          <label>Форма навчання<select name="mode" required><option value="day">Денна</option><option value="evening">Вечірня</option><option value="parttime">Заочна</option><option value="external">Здобувач поза аспірантурою</option></select></label>
          <label class="certificate-wide certificate-years" hidden>Роки навчання<input name="years" maxlength="60" placeholder="Наприклад, 2021-2025" disabled></label>
          <label class="certificate-wide">Спеціальність<select name="specialty" required><option value="">Виберіть спеціальність</option></select></label>
          <label>Кількість примірників<input name="copies" type="number" min="1" max="100" step="1" value="1" required></label>
          <label class="certificate-wide">Примітки <span class="certificate-optional">За потреби</span><textarea name="notes" maxlength="2000" rows="2" placeholder="Додаткові побажання до довідки"></textarea></label>
        </div>
        <label class="certificate-trap" aria-hidden="true">Website<input name="website" tabindex="-1" autocomplete="off"></label>
        <p class="certificate-privacy">Заявка надійде до відділу аспірантури, докторантури та атестації наукових кадрів. Про готовність повідомимо електронною поштою або телефоном</p>
        <button class="primary certificate-submit" type="submit">Надіслати заявку</button>
        <p class="certificate-result" role="status" aria-live="polite"></p>
        <button class="secondary certificate-recheck" type="button" hidden>Перевірити стан заявки</button>
        <button class="secondary certificate-new" type="button" hidden>Нова заявка</button>
      </form>`;
    const specialties=[
      '011/A1 Освітні, педагогічні науки/Освітні науки','015/А5 Професійна освіта','032/В9 Історія та археологія','033/В10 Філософія',
      '051/С1 Економіка/Економіка та міжнародні економічні відносини (Економіка підприємств та галузей національного господарства)',
      '051/С1 Економіка/Економіка та міжнародні економічні відносини (Економіка природокористування та охорони навколишнього середовища)',
      '053/С4 Психологія','071/D1 Облік і оподаткування','072/D2 Фінанси, банківська справа, страхування та фондовий ринок','073/D3 Менеджмент','281/D4 Публічне управління та адміністрування','075/D5 Маркетинг','076/D7 Підприємництво та торгівля/Торгівля','081/D8 Право',
      '091/E1 Біологія та біохімія (Біологія)','091/E1 Біологія та біохімія (Біотехнології біологічних систем)','101/E2 Екологія','102/E3 Хімія','122/F3 Комп’ютерні науки','141/G3 Електроенергетика, електротехніка та електромеханіка/Електрична інженерія','174/G7 Автоматизація, комп’ютерно-інтегровані технології та робототехніка','131/G9 Прикладна механіка','133/G11 Галузеве машинобудування/Машинобудування','181/G13 Харчові технології','187/G14 Деревообробні та меблеві технології','192/G19 Будівництво та цивільна інженерія','162/G21 Біотехнології та біоінженерія','201/H1 Агрономія','202 Захист і карантин рослин','203 Садівництво, плодоовочівництво та виноградарство','204/H2 Технології виробництва і переробки продукції тваринництва/Тваринництво','206/H3 Садово-паркове господарство','205/H4 Лісове господарство','207/H5 Водні біоресурси та аквакультура','211/H6 Ветеринарна медицина (Незаразна патологія тварин)','211/H6 Ветеринарна медицина (Заразна патологія тварин)','274/J8 Автомобільний транспорт'
    ];
    const form=content.querySelector('form'),fields=form.elements,status=form.querySelector('.certificate-result'),submit=form.querySelector('.certificate-submit'),recheck=form.querySelector('.certificate-recheck'),newButton=form.querySelector('.certificate-new');
    for(const specialty of specialties){const option=document.createElement('option');option.value=specialty;option.textContent=specialty;fields.specialty.append(option);}
    function yearsVisibility(){const graduate=fields.year.value==='graduate';form.querySelector('.certificate-years').hidden=!graduate;fields.years.disabled=!graduate;fields.years.required=graduate;}
    fields.year.onchange=yearsVisibility;fields.certificate.onchange=()=>{if(fields.certificate.value==='past')fields.year.value='graduate';yearsVisibility();};
    let activeId=null,transport=null,frame=null,finished=false,busy=false;
    const setFieldsDisabled=disabled=>form.querySelectorAll('input,select,textarea').forEach(n=>n.disabled=disabled||n.name==='years'&&fields.year.value!=='graduate');
    function cleanup(){transport?.remove();frame?.remove();transport=frame=null;}
    function result(state){
      if(state?.state==='saved'){finished=true;status.textContent='Заявку збережено. Дякуємо! Відділ повідомить про готовність довідки';status.dataset.state='success';submit.hidden=true;recheck.hidden=true;newButton.hidden=false;cleanup();return true;}
      if(state?.state==='error'){status.textContent=state.message||'Не вдалося зберегти заявку. Перевірте поля або зверніться до відділу';status.dataset.state='error';activeId=null;setFieldsDisabled(false);yearsVisibility();submit.disabled=false;submit.textContent='Надіслати заявку';recheck.hidden=true;cleanup();return true;}
      return false;
    }
    async function waitForResult(){
      if(busy||!activeId||finished)return;busy=true;recheck.disabled=true;
      const started=Date.now();
      try{while(activeId&&!finished&&Date.now()-started<60000){if(!form.isConnected)return;try{if(result(await certificateStatus(activeId)))return;}catch{}await new Promise(resolve=>setTimeout(resolve,2500));}
        if(!finished&&activeId){status.textContent='Підтвердження ще не отримано. Заявка могла зберегтися. Натисніть «Перевірити стан заявки», не надсилаючи її повторно';status.dataset.state='pending';recheck.hidden=false;}
      }finally{busy=false;recheck.disabled=false;}
    }
    recheck.onclick=()=>{status.textContent='Перевіряємо стан заявки…';waitForResult();};
    form.onsubmit=event=>{
      event.preventDefault();if(activeId||finished||!form.reportValidity())return;
      if(!navigator.onLine){status.textContent='Для надсилання потрібен інтернет. Заповнені поля залишаються на екрані';return;}
      if(fields.phone.value.replace(/\D/g,'').length<9){fields.phone.setCustomValidity('Укажіть контактний номер телефону');fields.phone.reportValidity();return;}fields.phone.setCustomValidity('');
      const values=Object.fromEntries(new FormData(form));activeId=[...crypto.getRandomValues(new Uint8Array(16))].map(n=>n.toString(16).padStart(2,'0')).join('');values.requestId=activeId;
      frame=document.createElement('iframe');frame.name='officeSend_'+activeId;frame.hidden=true;frame.title='Надсилання заявки';document.body.append(frame);
      transport=document.createElement('form');transport.hidden=true;transport.method='POST';transport.action=certificateEndpoint;transport.target=frame.name;const payload=document.createElement('input');payload.type='hidden';payload.name='payload';payload.value=JSON.stringify(values);transport.append(payload);document.body.append(transport);
      setFieldsDisabled(true);submit.disabled=true;submit.textContent='Надсилаємо…';status.textContent='Очікуємо підтвердження збереження заявки…';status.dataset.state='pending';HTMLFormElement.prototype.submit.call(transport);waitForResult();
    };
    fields.phone.oninput=()=>fields.phone.setCustomValidity('');
    newButton.onclick=()=>{form.reset();activeId=null;finished=false;status.textContent='';submit.hidden=false;submit.disabled=false;submit.textContent='Надіслати заявку';newButton.hidden=true;setFieldsDisabled(false);yearsVisibility();};
    return true;
  }

  function renderReader(url){
    const page=savedPage(url);$('reader-source').href=url||data.source;
    // Snapshot refresh must not reset a form while a person is completing it.
    if(url==='https://nubip.edu.ua/zamovlennya-dovidok'&&$('reader-content').querySelector('.certificate-native'))return;
    $('reader-content').replaceChildren();$('reader-updated').textContent='';
    if(renderCertificate(url))return;
    if(page){
      $('title-page').textContent=page.title;
      if(!renderTeam(page)&&!renderCouncils(page))$('reader-content').append(...readableFragment(page.html,page.url));
      const failed=snapshot.errors?.some(item=>item.url===url||(page.aliases||[]).includes(item.url));
      if(failed)$('reader-updated').textContent='Показано збережений зміст: під час останньої перевірки джерело було недоступне.';
      else if(page.checkedAt)$('reader-updated').textContent='Перевірено: '+formatSyncDate(page.checkedAt)+' (київський час)';
    }else{
      $('title-page').textContent='Завантаження інформації';
      $('reader-content').textContent=loadingSnapshot?'Завантажую збережені дані…':'Цю сторінку ще не завантажено автоматично. Після першої успішної перевірки сайту вона з’явиться тут.';
    }
  }
  const formatSyncDate=value=>{try{return new Intl.DateTimeFormat('uk-UA',{dateStyle:'short',timeStyle:'short',timeZone:'Europe/Kyiv'}).format(new Date(value));}catch{return '';}};
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
      updateContacts();
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
    const link=event.target.closest('a[href]');if(!link||link.id==='reader-source'||link.id==='official-page')return;
    if(event.ctrlKey||event.metaKey||event.shiftKey||event.altKey)return;
    if(canRead(link.href)){event.preventDefault();openReader(link.href);}
  });
  $('reader-back').onclick=()=>{const previous=readerTrail.pop();restoreReaderScroll=previous?.scrollY??0;location.hash=previous?.hash||'#'+readerOrigin;};
  $('refresh-data').onclick=()=>loadSnapshot();
  let lastResumeCheck=Date.now();
  document.addEventListener('visibilitychange',()=>{if(!document.hidden&&Date.now()-lastResumeCheck>300000){lastResumeCheck=Date.now();loadSnapshot();}});
  setInterval(()=>{if(!document.hidden)loadSnapshot();},900000);

  const names=['home','study','documents','services','contacts','page','section'];
  function setView(name,moveFocus=true){
    if(name.startsWith('section/')){
      const key=name.slice(8),index={aspirantura:0,doctorantura:1,defense:2}[key];
      if(index===undefined){name='home';}else{
        const group=data.study[index],items=[...group.items];
        if(key==='defense')items.push(data.services[0]);
        $('title-section').textContent=key==='defense'?'Захист дисертації':group.title;
        $('section-links').innerHTML=items.map(card).join('');name='section';
      }
    }
    if(name.startsWith('page/')){let url;try{url=canonical(decodeURIComponent(name.slice(5)));}catch{}renderReader(url);name='page';}
    if(!names.includes(name))name='home';
    document.querySelectorAll('.view').forEach(node=>node.hidden=node.id!=='view-'+name);
    document.querySelectorAll('.bottom-nav button').forEach(button=>{const active=button.dataset.view===((name==='page'?readerOrigin:name)==='section'?'study':(name==='page'?readerOrigin:name));button.classList.toggle('current',active);button.setAttribute('aria-current',active?'page':'false');});
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
