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
  const conciseDefenseUrls=new Set(['https://nubip.edu.ua/razovi-spetsializovani-vcheni-rady','https://nubip.edu.ua/doktorski-spetsializovani-vcheni-rady','https://boiarchukserhii-svg.github.io/nubip-defenses/']);
  const descriptionMarkup=(description,url)=>conciseDefenseUrls.has(url)?'':`<p>${esc(description)}</p>`;
  const card=([title,description,url,key])=>`<a class="link-card" href="${esc(url)}" target="_blank" rel="noopener noreferrer"><span class="feature-icon">${icon(key)}</span><div><h3>${esc(title)}</h3>${descriptionMarkup(description,url)}</div>${icon('external')}</a>`;
  const groups=items=>items.map(group=>`<section><h3 class="group-title">${esc(group.title)}</h3><div class="link-grid">${group.items.map(card).join('')}</div></section>`).join('');
  $('study-list').innerHTML=groups(data.study);
  $('document-list').innerHTML=groups(data.documents);
  $('service-list').innerHTML=data.services.map(([title,description,url,key])=>`<article class="service-card panel"><span class="feature-icon">${icon(key)}</span><h3>${esc(title)}</h3>${descriptionMarkup(description,url)}<a class="secondary service-open" href="${esc(url)}" target="_blank" rel="noopener noreferrer">Відкрити ${icon('external')}</a></article>`).join('');
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
  function councilListName(fullName){
    const parts=fullName.trim().split(/\s+/);
    // Shorten only a recognizable patronymic, not arbitrary three-part names.
    if(parts.length>=3&&/(?:ович|йович|евич|євич|Ілліч|Лукич|Савич|Кузьмич)(?:а|у|ем|і)?$|(?:івн|ївн|овн|евн|євн)(?:а|и|і|у|ою)$/iu.test(parts[parts.length-1]))parts.pop();
    return parts.join(' ');
  }
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
        const candidate=document.createElement('span');candidate.className='council-candidate';candidate.append('Захист дисертації ');const strong=document.createElement('strong');candidate.dataset.fullName=entry.name;strong.textContent=councilListName(entry.name)||'Інформація про здобувача';candidate.append(strong);head.append(candidate);card.append(head);
        const body=document.createElement('div');body.className='council-body';
        const topic=entry.full.match(/на тему\s*:\s*(.+?)(?=,?\s*поданої на здобуття|\s+зі спеціальності|$)/i);
        const specialty=entry.full.match(/(?:зі\s+)?спеціальності\s+(.+?)(?=\s+(?:з\s+)?галузі знань|\s*\((?:рішення|Наказ)|$)/i);
        const area=entry.full.match(/галузі знань\s+(.+?)(?=\s+та спеціальності|\s*\((?:рішення|Наказ)|$)/i);
        const basis=entry.full.match(/\(?(?:рішення Вченої ради|Наказ МОН України)[\s\S]+$/i);
        // Keep the source wording if its structure changes, rather than dropping information.
        if(topic&&specialty&&area&&basis&&entry.name){
          field(body,'Тема',topic[1].replace(/,\s*$/,''));field(body,'Спеціальність',specialty[1]);field(body,'Галузь знань',area[1]);
          const legal=document.createElement('details');legal.className='council-basis';const title=document.createElement('summary');title.textContent='Підстава створення ради';legal.append(title);const p=document.createElement('p');p.textContent=basis[0].trim().replace(/^\(([\s\S]*)\)$/,'$1').replace(/^рішення/,'Рішення');legal.append(p);body.append(legal);
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

  const doctoralMembership={"Д 26.004.01":{"source":"https://nubip.edu.ua/sklad-spetsializovanoyi-vchenoyi-rady-d-2600401","persons":[{"name":"Кваша Сергій Миколайович","role":"Голова ради","specialty":"08.00.03"},{"name":"Діброва Анатолій Дмитрович","role":"Заступник голови","specialty":"08.00.03"},{"name":"Негода Юлія Володимирівна","role":"Заступник голови","specialty":"08.00.08"},{"name":"Гогуля Ольга Петрівна","role":"Вчений секретар","specialty":"08.00.03"},{"name":"Багацька Катерина Володимирівна","role":"Член ради","specialty":"08.00.08"},{"name":"Байдала Вікторія Володимирівна","role":"Член ради","specialty":"08.00.03"},{"name":"Бутенко Віра Михайлівна","role":"Член ради","specialty":"08.00.03"},{"name":"Дейнеко Людмила Вікторівна","role":"Член ради","specialty":"08.00.03"},{"name":"Дєліні Марина Миколаївна","role":"Член ради","specialty":"08.00.08"},{"name":"Забаштанський Максим Миколайович","role":"Член ради","specialty":"08.00.08"},{"name":"Косова Тетяна Дмитрівна","role":"Член ради","specialty":"08.00.08"},{"name":"Лабенко Олександр Миколайович","role":"Член ради","specialty":"08.00.08"},{"name":"Лемішко Олена Олександрівна","role":"Член ради","specialty":"08.00.08"},{"name":"Мірзоєва Тетяна Володимирівна","role":"Член ради","specialty":"08.00.03"},{"name":"Нечипоренко Олександр Миколайович","role":"Член ради","specialty":"08.00.03"},{"name":"Талавиря Микола Петрович","role":"Член ради","specialty":"08.00.03"},{"name":"Тітенко Зоя Миколаївна","role":"Член ради","specialty":"08.00.08"},{"name":"Ходжаян Аліна Олександрівна","role":"Член ради","specialty":"08.00.03"},{"name":"Швець Наталія Романівна","role":"Член ради","specialty":"08.00.08"}]},"Д 26.004.03":{"source":"https://nubip.edu.ua/sklad-spetsializovanoyi-vchenoyi-rady-d-2600403","persons":[{"name":"Грушанська Наталія Геннадіївна","role":"Голова ради","specialty":"16.00.01"},{"name":"Томчук Віктор Анатолійович","role":"Заступник голови","specialty":"03.00.04"},{"name":"Карповський Валентин Іванович","role":"Заступник голови","specialty":"03.00.13"},{"name":"Криворучко Дмитро Іванович","role":"Вчений секретар","specialty":"03.00.13"},{"name":"Бобрицька Ольга Миколаївна","role":"Член ради","specialty":"03.00.13"},{"name":"Віщур Олег Іванович","role":"Член ради","specialty":"03.00.04"},{"name":"Голопура Сергій Іванович","role":"Член ради","specialty":"16.00.01"},{"name":"Грищенко Вікторія Анатоліївна","role":"Член ради","specialty":"03.00.04"},{"name":"Данчук Вячеслав Володимирович","role":"Член ради","specialty":"03.00.04"},{"name":"Долецький Станіслав Павлович","role":"Член ради","specialty":"16.00.01"},{"name":"Духницький Володимир Богданович","role":"Член ради","specialty":"03.00.04"},{"name":"Журенко Олена Василівна","role":"Член ради","specialty":"03.00.13"},{"name":"Камбур Марія Дмитрівна","role":"Член ради","specialty":"03.00.13"},{"name":"Кібкало Дмитро Вікторович","role":"Член ради","specialty":"16.00.01"},{"name":"Куртяк Богдан Михайлович","role":"Член ради","specialty":"03.00.04"},{"name":"Постой Руслана Вікторівна","role":"Член ради","specialty":"03.00.13"},{"name":"Трокоз Віктор Олександрович","role":"Член ради","specialty":"03.00.13"},{"name":"Цвіліховський Микола Іванович","role":"Член ради","specialty":"16.00.01"},{"name":"Шарандак Павло Васильович","role":"Член ради","specialty":"16.00.01"}]},"Д 26.004.06":{"source":"https://nubip.edu.ua/sklad-spetsializovanoyi-vchenoyi-rady-d-2600406","persons":[{"name":"Ловейкін Вячеслав Сергійович","role":"Голова ради","specialty":"05.05.05"},{"name":"Братішко Вячеслав Вячеславович","role":"Заступник голови","specialty":"05.05.11"},{"name":"Роговський Іван Леонідович","role":"Вчений секретар","specialty":"05.05.11"},{"name":"Афтанділянц Євгеній Григорович","role":"Член ради","specialty":"05.05.05"},{"name":"Борак Костянтин Вікторович","role":"Член ради","specialty":"05.05.11"},{"name":"Вольченко Олександр Іванович","role":"Член ради","specialty":"05.05.05"},{"name":"Голуб Геннадій Анатолійович","role":"Член ради","specialty":"05.05.11"},{"name":"Погорілий Сергій Петрович","role":"Член ради","specialty":"05.05.11"},{"name":"Ромасевич Юрій Олександрович","role":"Член ради","specialty":"05.05.05"},{"name":"Фідровська Наталія Миколаївна","role":"Член ради","specialty":"05.05.05"},{"name":"Хмельовський Василь Степанович","role":"Член ради","specialty":"05.05.11"},{"name":"Шворов Сергій Андрійович","role":"Член ради","specialty":"05.05.05"}]},"Д 26.004.08":{"source":"https://nubip.edu.ua/sklad-spetsializovanoyi-vchenoyi-rady-d-2600408","persons":[{"name":"Калачнюк Лілія Григорівна","role":"Голова ради","specialty":"03.00.04"},{"name":"Клепко Алла Володимирівна","role":"Заступник голови","specialty":"03.00.01"},{"name":"Іллєнко Володимир Віталійович","role":"Вчений секретар","specialty":"03.00.01"},{"name":"Борисова Тетяна Олександрівна","role":"Член ради","specialty":"03.00.04"},{"name":"Гудков Ігор Миколайович","role":"Член ради","specialty":"03.00.01"},{"name":"Калінін Ігор Васильович","role":"Член ради","specialty":"03.00.04"},{"name":"Карповський Валентин Іванович","role":"Член ради","specialty":"03.00.04"},{"name":"Кашпаров Валерій Олександрович","role":"Член ради","specialty":"03.00.01"},{"name":"Кравець Олександра Петрівна","role":"Член ради","specialty":"03.00.01"},{"name":"Рашидов Намік Мамед огли","role":"Член ради","specialty":"03.00.01"},{"name":"Савчук Олексій Миколайович","role":"Член ради","specialty":"03.00.04"},{"name":"Хижняк Світлана Володимирівна","role":"Член ради","specialty":"03.00.04"},{"name":"Чоботько Григорій Михайлович","role":"Член ради","specialty":"03.00.01"}]},"Д 26.004.09":{"source":"https://nubip.edu.ua/sklad-spetsializovanoyi-vchenoyi-rady-d-2600409","persons":[{"name":"Василишин Роман Дмитрович","role":"Голова ради","specialty":"06.03.02"},{"name":"Ковалевський Сергій Борисович","role":"Заступник голови","specialty":"06.03.01"},{"name":"Сошенський Олександр Михайлович","role":"Вчений секретар","specialty":"06.03.02"},{"name":"Білоус Андрій Михайлович","role":"Член ради","specialty":"06.03.03"},{"name":"Гайда Юрій Іванович","role":"Член ради","specialty":"06.03.01"},{"name":"Геник Ярослав Вячеславович","role":"Член ради","specialty":"06.03.01"},{"name":"Гойчук Анатолій Федорович","role":"Член ради","specialty":"06.03.03"},{"name":"Зібцев Сергій Вікторович","role":"Член ради","specialty":"06.03.03"},{"name":"Іванюк Ігор Дмитрович","role":"Член ради","specialty":"06.03.03"},{"name":"Кульбанська Іванна Миколаївна","role":"Член ради","specialty":"06.03.03"},{"name":"Колесніченко Олена Валеріївна","role":"Член ради","specialty":"06.03.01"},{"name":"Лавний Василь Володимирович","role":"Член ради","specialty":"06.03.03"},{"name":"Ліханов Артур Федорович","role":"Член ради","specialty":"06.03.01"},{"name":"Матушевич Любов Миколаївна","role":"Член ради","specialty":"06.03.02"},{"name":"Миклуш Степан Іванович","role":"Член ради","specialty":"06.03.02"},{"name":"Миронюк Віктор Валентинович","role":"Член ради","specialty":"06.03.02"},{"name":"Пастернак Володимир Петрович","role":"Член ради","specialty":"06.03.02"},{"name":"Попович Сергій Юрійович","role":"Член ради","specialty":"06.03.01"},{"name":"Юхновський Василь Юрійович","role":"Член ради","specialty":"06.03.02"}]},"Д 26.004.10":{"source":"https://nubip.edu.ua/sklad-spetsializovanoyi-vchenoyi-rady-d-2600410","persons":[{"name":"Каленська Світлана Михайлівна","role":"Голова ради","specialty":"06.01.09"},{"name":"Тонха Оксана Леонідівна","role":"Заступник голови","specialty":"06.01.03"},{"name":"Новицька Наталія Валеріївна","role":"Заступник голови","specialty":"06.01.09"},{"name":"Пилипенко Вікторія Сергіївна","role":"Вчений секретар","specialty":"06.01.09"},{"name":"Балаєв Анатолій Джалілович","role":"Член ради","specialty":"06.01.03"},{"name":"Бикін Анатолій Вікторович","role":"Член ради","specialty":"06.01.09"},{"name":"Булигін Сергій Юрійович","role":"Член ради","specialty":"06.01.03"},{"name":"Дегтярьов Василь Володимирович","role":"Член ради","specialty":"06.01.03"},{"name":"Кравченко Юрій Станіславович","role":"Член ради","specialty":"06.01.03"},{"name":"Літвінов Дмитро Вікторович","role":"Член ради","specialty":"06.01.09"},{"name":"Мельник Андрій Васильович","role":"Член ради","specialty":"06.01.09"},{"name":"Присяжнюк Олег Іванович","role":"Член ради","specialty":"06.01.09"},{"name":"Ткаченко Микола Адамович","role":"Член ради","specialty":"06.01.03"}]},"Д 26.004.13":{"source":"https://nubip.edu.ua/sklad-spetsializovanoyi-vchenoyi-rady-d-2600413","persons":[{"name":"Баль-Прилипко Лариса Вацлавівна","role":"Голова ради","specialty":"03.00.20"},{"name":"Паламарчук Ігор Павлович","role":"Заступник голови","specialty":"05.18.12"},{"name":"Слободянюк Наталія Михайлівна","role":"Вчений секретар","specialty":"03.00.20"},{"name":"Бандура Валентина Миколаївна","role":"Член ради","specialty":"05.18.12"},{"name":"Берник Ірина Миколаївна","role":"Член ради","specialty":"05.18.12"},{"name":"Голуб Геннадій Анатолійович","role":"Член ради","specialty":"03.00.20"},{"name":"Даниленко Світлана Григорівна","role":"Член ради","specialty":"03.00.20"},{"name":"Лопатько Костянтин Георгійович","role":"Член ради","specialty":"03.00.20"},{"name":"Поліщук Віктор Миколайович","role":"Член ради","specialty":"03.00.20"},{"name":"Самілик Марина Михайлівна","role":"Член ради","specialty":"05.18.12"},{"name":"Стадник Ігор Ярославович","role":"Член ради","specialty":"05.18.12"},{"name":"Хмельовський Василь Степанович","role":"Член ради","specialty":"05.18.12"},{"name":"Циганков Сергій Петрович","role":"Член ради","specialty":"05.18.12"}]},"Д 26.004.14":{"source":"https://nubip.edu.ua/sklad-spetsializovanoyi-vchenoyi-rady-d-2600414","persons":[{"name":"Малюк Микола Олексійович","role":"Голова ради","specialty":"16.00.02"},{"name":"Сорока Наталія Михайлівна","role":"Заступник голови","specialty":"16.00.11"},{"name":"Мельник Володимир Васильович","role":"Вчений секретар","specialty":"16.00.03"},{"name":"Борисевич Борис Володимирович","role":"Член ради","specialty":"16.00.02"},{"name":"Виговська Лілія Миколаївна","role":"Член ради","specialty":"16.00.03"},{"name":"Галат Марина Владиславівна","role":"Член ради","specialty":"16.00.11"},{"name":"Галатюк Олександр Євстафійович","role":"Член ради","specialty":"16.00.03"},{"name":"Герілович Антон Павлович","role":"Член ради","specialty":"16.00.03"},{"name":"Гончаров Сергій Леонідович","role":"Член ради","specialty":"16.00.11"},{"name":"Довгій Юрій Юрійович","role":"Член ради","specialty":"16.00.11"},{"name":"Євстаф’єва Валентина Олександрівна","role":"Член ради","specialty":"16.00.11"},{"name":"Журенко Олена Василівна","role":"Член ради","specialty":"16.00.11"},{"name":"Кладницька Лариса Володимирівна","role":"Член ради","specialty":"16.00.02"},{"name":"Коцюмбас Галина Іванівна","role":"Член ради","specialty":"16.00.02"},{"name":"Мазуркевич Тетяна Анатоліївна","role":"Член ради","specialty":"16.00.02"},{"name":"Недосєков Віталій Володимирович","role":"Член ради","specialty":"16.00.03"},{"name":"Радзиховський Микола Леонідович","role":"Член ради","specialty":"16.00.03"},{"name":"Скрипка Марина Вікторівна","role":"Член ради","specialty":"16.00.02"},{"name":"Ушкалов Валерій Олександрович","role":"Член ради","specialty":"16.00.03"}]},"Д 26.004.16":{"source":"https://nubip.edu.ua/sklad-spetsializovanoyi-vchenoyi-rady-d-2600416","persons":[{"name":"Ладиченко Віктор Валерійович","role":"Голова ради","specialty":"12.00.06"},{"name":"Піддубний Олексій Юрійович","role":"Заступник голови","specialty":"12.00.06"},{"name":"Гулак Олена Василівна","role":"Вчений секретар","specialty":"12.00.07"},{"name":"Дейнега Марина Андріївна","role":"Член ради","specialty":"12.00.06"},{"name":"Дмитренко Емілія Станіславівна","role":"Член ради","specialty":"12.00.07"},{"name":"Задирака Наталія Юріївна","role":"Член ради","specialty":"12.00.07"},{"name":"Краснова Юлія Андріївна","role":"Член ради","specialty":"12.00.06"},{"name":"Курило Володимир Іванович","role":"Член ради","specialty":"12.00.07"},{"name":"Малишева Наталія Рафаелівна","role":"Член ради","specialty":"12.00.06"},{"name":"Мартин Андрій Геннадійович","role":"Член ради","specialty":"12.00.06"},{"name":"Світличний Олександр Петрович","role":"Член ради","specialty":"12.00.07"},{"name":"Яра Олена Сергіївна","role":"Член ради","specialty":"12.00.07"}]},"Д 26.004.17":{"source":"https://nubip.edu.ua/sklad-spetsializovanoyi-vchenoyi-rady-d-2600417","persons":[{"name":"Вдовенко Наталія Михайлівна","role":"Голова ради","specialty":"08.00.09"},{"name":"Бондаренко Валерій Михайлович","role":"Заступник голови","specialty":"08.00.04"},{"name":"Гуцаленко Любов Василівна","role":"Вчений секретар","specialty":"08.00.09"},{"name":"Головніна Олена Германівна","role":"Член ради","specialty":"08.00.09"},{"name":"Лазаришина Інна Дмитрівна","role":"Член ради","specialty":"08.00.09"},{"name":"Ларіна Тетяна Федорівна","role":"Член ради","specialty":"08.00.04"},{"name":"Левицька Інна Ванадіївна","role":"Член ради","specialty":"08.00.04"},{"name":"Макарович Вікторія Костянтинівна","role":"Член ради","specialty":"08.00.09"},{"name":"Мостенська Тетяна Леонідівна","role":"Член ради","specialty":"08.00.04"},{"name":"Нестеренко Оксана Олександрівна","role":"Член ради","specialty":"08.00.09"},{"name":"Орел Володимир Миколайович","role":"Член ради","specialty":"08.00.04"},{"name":"Радько Віталій Іванович","role":"Член ради","specialty":"08.00.04"}]},"Д 26.004.20":{"source":"https://nubip.edu.ua/sklad-spetsializovanoyi-vchenoyi-rady-d-2600420","persons":[{"name":"Євсюков Тарас Олексійович","role":"Голова ради","specialty":"08.00.06"},{"name":"Мартин Андрій Геннадійович","role":"Заступник голови","specialty":"08.00.06"},{"name":"Опенько Іван Анатолійович","role":"Вчений секретар","specialty":"08.00.06"},{"name":"Верстяк Андрій Васильович","role":"Член ради","specialty":"08.00.06"},{"name":"Голян Василь Анатолійович","role":"Член ради","specialty":"08.00.06"},{"name":"Дорош Ольга Степанівна","role":"Член ради","specialty":"08.00.06"},{"name":"Дребот Оксана Іванівна","role":"Член ради","specialty":"08.00.06"},{"name":"Дубас Ростислав Григорович","role":"Член ради","specialty":"08.00.06"},{"name":"Карпук Анатолій Іванович","role":"Член ради","specialty":"08.00.06"},{"name":"Ковальчук Іван Платонович","role":"Член ради","specialty":"08.00.06"},{"name":"Купріянчик Ірина Петрівна","role":"Член ради","specialty":"08.00.06"},{"name":"Мединська Наталія Василівна","role":"Член ради","specialty":"08.00.06"},{"name":"Новаковська Ірина Олексіївна","role":"Член ради","specialty":"08.00.06"},{"name":"Попов Андрій Сергійович","role":"Член ради","specialty":"08.00.06"},{"name":"Ступень Роман Михайлович","role":"Член ради","specialty":"08.00.06"}]},"Д 26.004.02":{"source":"https://nubip.edu.ua/sklad-spetsializovanoyi-vchenoyi-rady-d-2600402","persons":[{"name":"Коломієць Юлія Василівна","role":"Голова ради","specialty":"03.00.20"},{"name":"Прилуцька Світлана Володимирівна","role":"Заступник голови","specialty":"03.00.20"},{"name":"Бондарь Валерія Іванівна","role":"Вчений секретар","specialty":"03.00.16"},{"name":"Бабич Анатолій Григорович","role":"Член ради","specialty":"06.01.11"},{"name":"Бородай Віра Віталіївна","role":"Член ради","specialty":"06.01.11"},{"name":"Буценко Людмила Миколаївна","role":"Член ради","specialty":"06.01.11"},{"name":"Дем’янюк Олена Сергіївна","role":"Член ради","specialty":"03.00.16"},{"name":"Дробик Надія Михайлівна","role":"Член ради","specialty":"03.00.20"},{"name":"Кляченко Оксана Леонідівна","role":"Член ради","specialty":"03.00.20"},{"name":"Ковалишина Ганна Миколаївна","role":"Член ради","specialty":"06.01.11"},{"name":"Копилов Євгеній Павлович","role":"Член ради","specialty":"03.00.16"},{"name":"Лісовий Микола Михайлович","role":"Член ради","specialty":"03.00.16"},{"name":"Ліханов Артур Федорович","role":"Член ради","specialty":"03.00.16"},{"name":"Лопатько Костянтин Георгійович","role":"Член ради","specialty":"03.00.20"},{"name":"Макаренко Наталія Анатоліївна","role":"Член ради","specialty":"03.00.16"},{"name":"Піковський Мирослав Йосипович","role":"Член ради","specialty":"06.01.11"},{"name":"Стабніков Віктор Петрович","role":"Член ради","specialty":"03.00.20"},{"name":"Туренко Володимир Петрович","role":"Член ради","specialty":"06.01.11"},{"name":"Хомутінін Юрій Володимирович","role":"Член ради","specialty":"03.00.16"}]},"Д 26.004.05":{"source":"https://nubip.edu.ua/sklad-spetsializovanoyi-vchenoyi-rady-d-2600405","persons":[{"name":"Сичов Михайло Юрійович","role":"Голова ради","specialty":"06.02.02"},{"name":"Лихач Анна Василівна","role":"Заступник голови","specialty":"06.02.04"},{"name":"Отченашко Володимир Віталійович","role":"Заступник голови","specialty":"06.02.02"},{"name":"Ільчук Ігор Іванович","role":"Вчений секретар","specialty":"06.02.02"},{"name":"Борщ Олександр Олександрович","role":"Член ради","specialty":"06.02.04"},{"name":"Ібатуллін Ільдус Ібатуллович","role":"Член ради","specialty":"06.02.02"},{"name":"Лихач Вадим Ярославович","role":"Член ради","specialty":"06.02.02"},{"name":"Недашківський Володимир Михайлович","role":"Член ради","specialty":"06.02.02"},{"name":"Повозніков Микола Гаврилович","role":"Член ради","specialty":"06.02.02"},{"name":"Прудніков Василь Григорович","role":"Член ради","specialty":"06.02.04"},{"name":"Рубан Сергій Юрійович","role":"Член ради","specialty":"06.02.04"},{"name":"Туринський Василь Михайлович","role":"Член ради","specialty":"06.02.04"},{"name":"Угнівенко Анатолій Миколайович","role":"Член ради","specialty":"06.02.04"}]},"Д 26.004.07":{"source":"https://nubip.edu.ua/sklad-spetsializovanoyi-vchenoyi-rady-d-2600407","persons":[{"name":"Лисенко Віталій Пилипович","role":"Голова ради","specialty":"05.09.03"},{"name":"Хиленко Володимир Васильович","role":"Заступник голови","specialty":"05.13.07"},{"name":"Заєць Наталія Анатоліївна","role":"Вчений секретар","specialty":"05.09.03"},{"name":"Бібік Олена Василівна","role":"Член ради","specialty":"05.09.03"},{"name":"Болбот Ігор Михайлович","role":"Член ради","specialty":"05.13.07"},{"name":"Єгоров Віктор Богданович","role":"Член ради","specialty":"05.13.07"},{"name":"Заблодський Микола Миколайович","role":"Член ради","specialty":"05.09.03"},{"name":"Каплун Віктор Володимирович","role":"Член ради","specialty":"05.09.03"},{"name":"Коваль Валерій Вікторович","role":"Член ради","specialty":"05.13.07"},{"name":"Луцька Наталія Миколаївна","role":"Член ради","specialty":"05.13.07"},{"name":"Червінський Леонід Степанович","role":"Член ради","specialty":"05.09.03"},{"name":"Шворов Сергій Андрійович","role":"Член ради","specialty":"05.13.07"}]},"Д 26.004.11":{"source":"https://nubip.edu.ua/sklad-spetsializovanoyi-vchenoyi-rady-d-2600411","persons":[{"name":"Пилипака Сергій Федорович","role":"Голова ради","specialty":"05.01.01"},{"name":"Яковенко Ігор Анатолійович","role":"Заступник голови","specialty":"05.23.01"},{"name":"Ромасевич Юрій Олександрович","role":"Вчений секретар","specialty":"05.01.01"},{"name":"Аушева Наталія Миколаївна","role":"Член ради","specialty":"05.01.01"},{"name":"Головач Іван Володимирович","role":"Член ради","specialty":"05.01.01"},{"name":"Гумен Олена Миколаївна","role":"Член ради","specialty":"05.01.01"},{"name":"Кічаєва Оксана Володимирівна","role":"Член ради","specialty":"05.23.01"},{"name":"Мар’єнков Микола Григорович","role":"Член ради","specialty":"05.23.01"},{"name":"Несвідомін Віктор Миколайович","role":"Член ради","specialty":"05.01.01"},{"name":"Нікіфорова Тетяна Дмитрівна","role":"Член ради","specialty":"05.23.01"},{"name":"Пінчевська Олена Олексіївна","role":"Член ради","specialty":"05.23.01"},{"name":"Цапко Юрій Володимирович","role":"Член ради","specialty":"05.23.06"}]},"Д 26.004.18":{"source":"https://nubip.edu.ua/sklad-spetsializovanoyi-vchenoyi-rady-d-2600418","persons":[{"name":"Ніколаєнко Станіслав Миколайович","role":"Голова ради","specialty":"13.00.02"},{"name":"Амеліна Світлана Миколаївна","role":"Заступник голови","specialty":"13.00.04"},{"name":"Сопівник Ірина Віталіївна","role":"Вчений секретар","specialty":"13.00.07"},{"name":"Батечко Ніна Григорівна","role":"Член ради","specialty":"13.00.04"},{"name":"Боголюбов Володимир Миколайович","role":"Член ради","specialty":"13.00.02"},{"name":"Буцик Ігор Михайлович","role":"Член ради","specialty":"13.00.02"},{"name":"Васюк Оксана Вікторівна","role":"Член ради","specialty":"13.00.04"},{"name":"Волярська Олена Станіславівна","role":"Член ради","specialty":"13.00.04"},{"name":"Гедзик Андрій Миколайович","role":"Член ради","specialty":"13.00.02"},{"name":"Демченко Ірина Іванівна","role":"Член ради","specialty":"13.00.07"},{"name":"Дьоміна Вікторія Володимирівна","role":"Член ради","specialty":"13.00.07"},{"name":"Журавська Ніна Станіславівна","role":"Член ради","specialty":"13.00.02"},{"name":"Костриця Наталія Миколаївна","role":"Член ради","specialty":"13.00.04"},{"name":"Кошук Олександр Богданович","role":"Член ради","specialty":"13.00.02"},{"name":"Мірошніченко Валентина Іванівна","role":"Член ради","specialty":"13.00.07"},{"name":"Мукан Наталія Василівна","role":"Член ради","specialty":"13.00.04"},{"name":"Потапчук Тетяна Володимирівна","role":"Член ради","specialty":"13.00.07"},{"name":"Шинкарук Василь Дмитрович","role":"Член ради","specialty":"13.00.07"}]}};
  function renderDoctoralCouncils(page){
    if(new URL(page.url).pathname!=='/doktorski-spetsializovani-vcheni-rady')return false;
    const source=document.createElement('div');source.append(...readableFragment(page.html,page.url));
    const headings=[...source.querySelectorAll('h2')].filter(n=>/^Д\s*\d+\.\d+\.\d+$/.test(n.textContent.trim()));
    if(!headings.length)return false;
    const list=document.createElement('div');list.className='doctoral-list';
    const normalized=n=>n.textContent.replace(/\s+/g,' ').trim();
    function field(parent,label,value){if(!value)return;const p=document.createElement('p'),strong=document.createElement('strong');strong.textContent=label+': ';p.append(strong,value);parent.append(p);}
    for(const heading of headings){
      const code=normalized(heading),nodes=[];let next=heading.nextElementSibling;
      while(next&&!headings.includes(next)){nodes.push(next);next=next.nextElementSibling;}
      const specialties=[],fields=[];let inSpecialties=false;let detailUrl=null;
      for(const node of nodes){
        const text=normalized(node);if(!text||/^_+$/.test(text))continue;
        const detailsLink=[...node.querySelectorAll('a[href]')].find(a=>a.textContent.includes('Детальніше'));if(detailsLink){detailUrl=detailsLink.href;continue;}
        if(/^Спеціальн(?:ості|ість)\s*:/.test(text)){inSpecialties=true;continue;}
        const match=text.match(/^([^:]+):\s*(.*)$/);
        if(match){inSpecialties=false;let value=match[2];const label=match[1];
          if(/^E-mail/i.test(label)){
            const link=node.querySelector('a[href]');if(link){const url=new URL(link.href);const hex=url.pathname==='/cdn-cgi/l/email-protection'?url.hash.slice(1):'';
              if(/^(?:[a-f0-9]{2})+$/i.test(hex)){const bytes=hex.match(/../g).map(h=>parseInt(h,16));const decoded=bytes.slice(1).map(b=>String.fromCharCode(b^bytes[0])).join('');if(/^[\w.+-]+@[\w.-]+$/.test(decoded))value=decoded;}
            }
            if(value.includes('protected'))value='';
          }
          if(value)fields.push({label,value});
        }else if(inSpecialties&&/^\d{2}\.\d{2}\.\d{2}\s/.test(text))specialties.push(text);
      }
      const card=document.createElement('details');card.className='council-card doctoral-card';
      const summary=document.createElement('summary'),badge=document.createElement('span');badge.className='council-badge';badge.textContent=code;summary.append(badge);
      const preview=document.createElement('span');preview.className='council-candidate doctoral-specialties';
      for(const specialty of specialties){const line=document.createElement('span');line.textContent=specialty.replace(/^\d{2}\.\d{2}\.\d{2}\s*/,'');preview.append(line);}summary.append(preview);card.append(summary);
      const body=document.createElement('div');body.className='council-body';
      const specialtyTitle=document.createElement('h3');specialtyTitle.className='doctoral-detail-title';specialtyTitle.textContent=specialties.length===1?'Спеціальність':'Спеціальності';body.append(specialtyTitle);
      const ul=document.createElement('ul');ul.className='doctoral-specialty-list';for(const specialty of specialties){const li=document.createElement('li');li.textContent=specialty;ul.append(li);}body.append(ul);
      const composition=doctoralMembership[code];
      const leaders=composition?.persons?.filter(p=>p.role!=='Член ради').map(p=>({label:p.role,value:p.name}))||fields.filter(item=>/^(?:Голова ради|Заступник|Вчений секретар)/i.test(item.label));
      function section(title){const fold=document.createElement('details');fold.className='doctoral-fold';const summary=document.createElement('summary');summary.textContent=title;fold.append(summary);body.append(fold);return fold;}
      function personBlock(name,role){const block=document.createElement('section');block.className='doctoral-person';if(role&&role!=='Член ради'){const label=document.createElement('p');label.className='doctoral-person-role';label.textContent=role;block.append(label);}const fullName=document.createElement('p');fullName.className='doctoral-person-name';fullName.textContent=name;block.append(fullName);return block;}
      const leadershipFold=section('Керівництво ради');
      if(leaders.length){const grid=document.createElement('div');grid.className='doctoral-leaders';for(const leader of leaders)grid.append(personBlock(leader.value,leader.label));leadershipFold.append(grid);}
      else{const note=document.createElement('p');note.textContent='Відомості про керівництво ще не додано';leadershipFold.append(note);}
      const compositionFold=section('Члени ради');
      if(composition?.persons?.length){const grid=document.createElement('div');grid.className='doctoral-members';for(const person of composition.persons.filter(p=>p.role==='Член ради'))grid.append(personBlock(person.name,person.role));compositionFold.append(grid);}
      else{const note=document.createElement('p');note.textContent='Відомості про склад ще не додано';compositionFold.append(note);}
      for(const item of fields){
        if(/^(?:Голова ради|Заступник|Вчений секретар)/i.test(item.label))continue;
        if(/^Контактний телефон|^E-mail/i.test(item.label)){
          const p=document.createElement('p'),label=document.createElement('strong');label.textContent=item.label+': ';p.append(label);
          const link=document.createElement('a');link.textContent=item.value;link.href=/^E-mail/i.test(item.label)?'mailto:'+item.value:'tel:'+item.value.replace(/[^+\d]/g,'').replace(/^0/,'+380');p.append(link);body.append(p);
        }else field(body,item.label,item.value);
      }
      if(detailUrl){const link=document.createElement('a');link.className='secondary doctoral-more';link.href=detailUrl;link.target='_blank';link.rel='noopener noreferrer';link.textContent='Докладніше про раду ↗';body.append(link);}
      card.append(body);list.append(card);
    }
    $('reader-content').append(list);return true;
  }

  function renderReader(url){
    const page=savedPage(url);
    // Snapshot refresh must not reset a form while a person is completing it.
    if(url==='https://nubip.edu.ua/zamovlennya-dovidok'&&$('reader-content').querySelector('.certificate-native'))return;
    $('reader-content').replaceChildren();$('reader-updated').textContent='';$('reader-updated').hidden=true;
    if(renderCertificate(url))return;
    if(page){
      $('title-page').textContent=page.title;
      if(!renderDoctoralCouncils(page)&&!renderTeam(page)&&!renderCouncils(page))$('reader-content').append(...readableFragment(page.html,page.url));
      const failed=snapshot.errors?.some(item=>item.url===url||(page.aliases||[]).includes(item.url));
      if(failed){$('reader-updated').hidden=false;$('reader-updated').textContent='Показано збережений зміст: під час останньої перевірки джерело було недоступне.';}
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

  let councilDialog=null,councilTrigger=null;
  function closeCouncilDialog(){if(councilDialog?.open)councilDialog.close();}
  function openCouncilDialog(summary){
    if(!councilDialog){
      councilDialog=document.createElement('dialog');councilDialog.className='council-dialog';councilDialog.setAttribute('aria-labelledby','council-dialog-title');
      councilDialog.innerHTML='<header class="council-dialog-header"><h2 id="council-dialog-title"></h2><button class="secondary council-dialog-close" type="button" autofocus>Закрити ✕</button></header><div class="council-dialog-scroll"></div>';
      document.body.append(councilDialog);
      councilDialog.querySelector('.council-dialog-close').onclick=closeCouncilDialog;
      councilDialog.addEventListener('close',()=>{document.body.classList.remove('council-dialog-open');councilTrigger?.focus({preventScroll:true});});
      councilDialog.addEventListener('click',event=>{if(event.target===councilDialog)closeCouncilDialog();if(event.target.closest('a[href]'))closeCouncilDialog();});
      window.addEventListener('hashchange',closeCouncilDialog);
    }
    councilTrigger=summary;
    councilDialog.querySelector('h2').textContent=summary.querySelector('.council-badge').textContent;
    const body=councilDialog.querySelector('.council-dialog-scroll');body.replaceChildren();
    const candidate=document.createElement('p');candidate.className='council-dialog-candidate';
    if(summary.parentElement.classList.contains('doctoral-card'))candidate.textContent='Докторська спеціалізована вчена рада';
    else{candidate.append('Захист дисертації ');const fullName=document.createElement('strong');fullName.textContent=summary.querySelector('.council-candidate').dataset.fullName||summary.querySelector('.council-candidate strong').textContent;candidate.append(fullName);}body.append(candidate);
    const detail=summary.parentElement.querySelector('.council-body').cloneNode(true);body.append(detail);
    document.body.classList.add('council-dialog-open');councilDialog.showModal();body.scrollTop=0;
  }
  document.addEventListener('click',event=>{const summary=event.target.closest('.council-card > summary');if(!summary)return;event.preventDefault();openCouncilDialog(summary);});

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
    $('sync-status').parentElement.hidden=name!=='home';
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
