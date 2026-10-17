"""Selective council refresh. Failures keep the last verified council records."""
from concurrent.futures import ThreadPoolExecutor,as_completed
from datetime import datetime,timezone
import copy,json,re
from pathlib import Path
from urllib.parse import urljoin,urlsplit
from lxml import html as lh
from sync_education import download,norm,check_url
from sync_office import page_from

BASE='https://nubip.edu.ua/'
ONE=BASE+'razovi-spetsializovani-vcheni-rady';DOCTOR=BASE+'doktorski-spetsializovani-vcheni-rady'
CODE=re.compile(r'Д\s*26\.004\.\d{2}')
NAME=re.compile(r"^[А-ЯІЇЄҐA-Z][А-ЯІЇЄҐа-яіїєґA-Za-z’'ʼ-]+(?:\s+[А-ЯІЇЄҐA-Z][А-ЯІЇЄҐа-яіїєґA-Za-z’'ʼ-]+){1,4}(?:\s+(?:огли|оглу|кизи|кызы))?$")
def txt(node):return norm(node.text_content())
def body(html):
    doc=lh.fromstring(html);nodes=doc.xpath('//article')
    if not nodes:raise ValueError('Немає вмісту сторінки ради')
    return max(nodes,key=lambda n:len(txt(n)))
def lines(node):
    clone=copy.deepcopy(node)
    for br in clone.xpath('.//br'):br.tail='\n'+(br.tail or '')
    return [norm(s) for s in clone.text_content().splitlines() if norm(s)]
def link_url(a,base):
    url=urljoin(base,a.get('href',''));check_url(url);return url
def council_links(html):
    root=body(html);result={};code=None
    for node in root.iter():
        if node.tag in ['h2','h3'] and CODE.fullmatch(txt(node)):code=norm(txt(node))
        if node.tag=='a' and code and 'Детальніше' in txt(node):result[code]=link_url(node,DOCTOR)
    if not result:raise ValueError('Немає переліку докторських рад')
    return result
def one_links(html):
    result=[]
    for a in body(html).xpath('.//a[@href]'):
        url=urljoin(ONE,a.get('href'))
        if urlsplit(url).path.startswith(('/zakhyst','/node/')) and 1<len(txt(a))<240:
            check_url(url)
            if url not in result:result.append(url)
    if not result or len(result)>1200:raise ValueError('Не прочитано перелік разових рад')
    return result

def parse_membership(html,url):
    root=body(html);persons=[]
    full=norm(' '.join(root.itertext()));cursor=0
    headers=list(re.finditer(r'(Голова(?: спеціалізованої вченої)? ради|Заступник(?:и)? голови(?: спеціалізованої вченої ради)?|Вчений секретар(?: спеціалізованої вченої ради)?|Члени(?: спеціалізованої вченої)? ради)\s*:',full,re.I))
    names=[txt(n).strip(' ,;:') for n in root.xpath('.//strong|.//b') if NAME.fullmatch(txt(n).strip(' ,;:'))]
    if not names:
        names=[m[1] for m in re.finditer(r"([А-ЯІЇЄҐ][а-яіїєґ’'ʼ-]+(?:\s+[А-ЯІЇЄҐ][а-яіїєґ’'ʼ-]+){2})\s*,",full)]
    for name in names:
        pos=full.find(name,cursor)
        if pos<0:continue
        cursor=pos+len(name)
        preceding=[h for h in headers if h.start()<pos];header=preceding[-1][1].lower() if preceding else ''
        role='Голова ради' if header.startswith('голова') else 'Заступник голови' if header.startswith('заступник') else 'Вчений секретар' if header.startswith('вчений') else 'Член ради'
        if any(n['name']==name for n in persons):continue
        end=min([full.find(n,cursor) for n in names if full.find(n,cursor)>=0] or [len(full)])
        specialty=re.search(r'\b\d{2}\.\d{2}\.\d{2}\b',full[cursor:end])
        persons.append({'name':name,'role':role,'specialty':specialty[0] if specialty else ''})
    if not persons or not any(p['role']=='Голова ради' for p in persons):raise ValueError('Не прочитано повний склад ради')
    return {'source':url,'persons':persons}

def parse_doctoral_detail(html,url):
    root=body(html);years={};year=None;composition=None;passports={}
    for a in root.xpath('.//a[@href]'):
        label=txt(a)
        if 'Склад спеціалізованої' in label:composition=link_url(a,url)
        if 'Паспорт спеціальності' in label:
            match=re.search(r'\d{2}\.\d{2}\.\d{2}',label)
            if match:passports[match[0]]=link_url(a,url)
    nodes=root.xpath('.//p|.//li|.//h2|.//h3|.//h4')
    for node in nodes:
        if node.xpath('.//p|.//li'):continue
        for line in lines(node):
            if re.fullmatch(r'20\d{2}\s*рік(?:\s*\([ДК]\s*26\.004\.\d{2}\))?',line):year=line;years.setdefault(year,[]);continue
            if not year:continue
            name=re.sub(r'^\d+[.)]\s*','',line).strip(' ;')
            if not NAME.fullmatch(name):continue
            a=next((a for a in node.xpath('.//a[@href]') if txt(a)==name),None)
            row=[name,link_url(a,url) if a is not None else None]
            if row not in years[year]:years[year].append(row)
    # Empty archive is valid only when there are no year headings or applicant list at all.
    years={year:rows for year,rows in years.items() if rows}
    return {'years':years,'membershipUrl':composition,'passports':passports,'source':url}

def parse_one_detail(html,url,expected_name=None):
    root=body(html);persons=[];advisor=[]
    full=norm(' '.join(root.itertext())).casefold().replace('’',"'").replace('ʼ',"'")
    if not re.search('захист.{0,40}дисертац|дисертац.{0,100}захист',full):raise ValueError('Посилання не веде на сторінку захисту')
    if expected_name and norm(expected_name).casefold().replace('’',"'").replace('ʼ',"'") not in full:raise ValueError('Сторінка посилання не відповідає здобувачу')
    for p in root.xpath('.//p'):
        value=txt(p);m=re.match(r'^(Голова(?: ради)?|Рецензент|Офіційний опонент|Науковий керівник|Науковий консультант)\s*[-–—:]?',value,re.I)
        if not m:continue
        role=m[1];names=[txt(n).strip(' ,;:') for n in p.xpath('.//strong|.//b') if NAME.fullmatch(txt(n).strip(' ,;:')) and not re.fullmatch(r'Голова ради|Офіційний опонент|Науковий керівник|Науковий консультант',txt(n),re.I)]
        if not names:
            found=re.search(r"([А-ЯІЇЄҐ][А-ЯІЇЄҐ’'ʼ-]{1,}\s+[А-ЯІЇЄҐ][а-яіїєґ’'ʼ-]+(?:\s+[А-ЯІЇЄҐ][а-яіїєґ’'ʼ-]+)?)",value)
            if found:names=[found[1]]
        for name in names:
            item={'role':role[0].upper()+role[1:],'name':name,'description':value}
            target=advisor if role.lower().startswith('науков') else persons
            if not any(p['name']==name and p['role']==item['role'] for p in target):target.append(item)
    times=root.xpath('.//time[@datetime]');locations=root.xpath('.//dl[contains(@class,"location")]//dd');documents=[]
    for a in root.xpath('.//a[@href]'):
        href=urljoin(url,a.get('href'));label=txt(a)
        if label and urlsplit(href).scheme=='https' and (urlsplit(href).hostname in {'www.youtube.com','youtube.com','youtu.be'} or re.search(r'\.(?:pdf|docx?|zip|p7s|asice)(?:$|\?)',href,re.I)):
            item={'title':label,'url':href}
            if item not in documents:documents.append(item)
    if not persons and not times and not documents:raise ValueError('Не прочитано відомості про захист')
    return {'persons':persons,'advisors':advisor,'date':txt(times[0]) if times else '', 'dateISO':times[0].get('datetime') if times else '', 'location':' '.join(txt(n) for n in locations),'documents':documents,'source':url}

def refresh(base,fetch=download):
    path=Path(base)/'data.json';data=json.loads(path.read_text(encoding='utf-8-sig'));previous=data.get('councils',{});now=datetime.now(timezone.utc).isoformat();errors=[]
    result=copy.deepcopy(previous);result.setdefault('membership',{});result.setdefault('doctoralDefenses',{});result.setdefault('passports',{});result.setdefault('oneTimeDetails',{})
    main={};received=0;one_names={}
    for key,url in [('oneTime',ONE),('doctoral',DOCTOR)]:
        try:
            html=fetch(url);page,_=page_from(html,url)
            links=one_links(html) if key=='oneTime' else council_links(html)
            if key=='oneTime':one_names={urljoin(ONE,a.get('href')):txt(a) for a in body(html).xpath('.//a[@href]')}
            saved_previous=data['pages'].get(url,{})
            if saved_previous.get('html'):
                old_html='<article>'+saved_previous['html']+'</article>'
                try:old_links=one_links(old_html) if key=='oneTime' else council_links(old_html)
                except ValueError:old_links=[]
                if len(links)<len(old_links)*.8:raise ValueError('Перелік рад суттєво скоротився; збережено попередній')
            saved=data['pages'].get(url,{});page.update(checkedAt=now,updatedAt=saved.get('updatedAt',now) if saved.get('html')==page['html'] else now)
            page['aliases']=list(dict.fromkeys(page.get('aliases',[])+[url]));data['pages'][url]=page;main[key]=links;received+=1
        except Exception as exc:errors.append({'section':key,'message':str(exc)[:200]})
    def task(kind,key,url):
        try:
            html=fetch(url);value=parse_doctoral_detail(html,url) if kind=='doctoral' else parse_one_detail(html,url,one_names.get(url)) if kind=='oneTime' else parse_membership(html,url)
            value['checkedAt']=now;return kind,key,value,None
        except Exception as exc:return kind,key,None,str(exc)[:200]
    jobs=[('doctoral',code,url) for code,url in main.get('doctoral',{}).items()]+[('oneTime',url,url) for url in main.get('oneTime',[])]
    memberships=[]
    with ThreadPoolExecutor(max_workers=4) as executor:
        futures=[executor.submit(task,*job) for job in jobs]
        for future in as_completed(futures):
            kind,key,value,error=future.result()
            if error:errors.append({'section':kind,'url':key,'message':error});continue
            received+=1
            if kind=='oneTime':
                old_detail=result['oneTimeDetails'].get(key,{})
                if old_detail.get('persons') and not value['persons']:
                    value['persons']=old_detail['persons'];errors.append({'section':kind,'url':key,'message':'Склад не прочитано; залишено попередній'})
                result['oneTimeDetails'][key]=value;continue
            old_years=result['doctoralDefenses'].get(key,{})
            # A missing year or a sudden large reduction requires review; don't discard history.
            for year,old_rows in old_years.items():
                if year not in value['years'] or len(value['years'][year])<len(old_rows)*.8:
                    value['years'][year]=old_rows;errors.append({'section':'doctoral','url':key,'message':'Річний перелік скоротився; збережено попередні записи'})
            result['doctoralDefenses'][key]=value['years'];result['passports'][key]=value['passports']
            if value['membershipUrl']:memberships.append(('membership',key,value['membershipUrl']))
        for kind,key,value,error in executor.map(lambda job:task(*job),memberships):
            if error:errors.append({'section':kind,'url':key,'message':error});continue
            old_people=result['membership'].get(key,{}).get('persons',[])
            if len(value['persons'])<len(old_people)*.8:
                errors.append({'section':kind,'url':key,'message':'Склад суттєво скоротився; збережено попередній'});continue
            result['membership'][key]=value;received+=1
    result.update(version=1,attemptedAt=now,errors=errors)
    if received:result['checkedAt']=now
    data['councils']=result
    payload=json.dumps(data,ensure_ascii=False,indent=2)+'\n'
    if len(payload.encode('utf-8'))>25_000_000:raise ValueError('Завеликий файл даних рад')
    temporary=path.with_suffix('.tmp');temporary.write_text(payload,encoding='utf-8');temporary.replace(path)
    print(f'Ради: оновлено {received} сторінок; не оновлено або потрібна перевірка: {len(errors)}.')
    return data
