"""Refresh only structured education data; preserve all curated application pages."""
from __future__ import annotations
from datetime import datetime, timezone
from io import BytesIO
import json
import logging
from pathlib import Path
import re
import time
from urllib.parse import urljoin, urlsplit
from urllib.request import Request, urlopen
from lxml import html as lh
import pdfplumber

BASE='https://nubip.edu.ua/'
SOURCES={'calendar':BASE+'hrafik-osvitnoho-protsesu-6','bells':BASE+'rozklad-dzvinkiv-u-zakladi-osvity','groups':BASE+'hrupy-aspirantiv'}
logging.getLogger('pdfminer').setLevel(logging.ERROR)

def norm(text):return re.sub(r'\s+',' ',text).strip()
def text(node):return norm(node.text_content())
def check_url(url):
    p=urlsplit(url)
    if p.scheme!='https' or p.hostname not in {'nubip.edu.ua','www.nubip.edu.ua'}:raise ValueError('Неприпустима адреса джерела')
    return url

def download(url,pdf=False):
    check_url(url)
    for attempt in range(3):
        try:
            req=Request(url,headers={'User-Agent':'Mozilla/5.0 (compatible; NUBiP-Office-Data/1.0)','Accept':'application/pdf' if pdf else 'text/html'})
            with urlopen(req,timeout=40) as response:
                check_url(response.geturl());raw=response.read(12_000_001)
                if len(raw)>12_000_000:raise ValueError('Завеликий документ')
                if pdf:
                    if not raw.startswith(b'%PDF-'):raise ValueError('Замість списку отримано не PDF')
                    return raw
                result=raw.decode(response.headers.get_content_charset() or 'utf-8')
                if re.search(r'<title[^>]*>\s*(Just a moment|One moment|Access denied)',result,re.I):raise ValueError('Джерело тимчасово недоступне')
                return result
        except Exception:
            if attempt==2:raise
            time.sleep(attempt+1)

def article(html):
    doc=lh.fromstring(html)
    matches=doc.xpath('//*[contains(concat(" ",normalize-space(@class)," ")," static-page ")]')
    if len(matches)!=1:raise ValueError('Не знайдено основний вміст сторінки')
    return matches[0]

def table_matrix(table):
    cells={};rows=table.xpath('.//tr')
    for r,row in enumerate(rows):
        c=0
        for cell in row.xpath('./th|./td'):
            while (r,c) in cells:c+=1
            rs=int(cell.get('rowspan','1'));cs=int(cell.get('colspan','1'))
            if not 1<=rs<=30 or not 1<=cs<=20:raise ValueError('Некоректні об’єднані клітинки')
            for dr in range(rs):
                for dc in range(cs):cells[r+dr,c+dc]=text(cell)
            c+=cs
    width=max((c for r,c in cells),default=-1)+1
    return [[cells.get((r,c),'') for c in range(width)] for r in range(len(rows))]

def weeks(value):
    if not re.fullmatch(r'\d{1,2}',value):raise ValueError('Не вдалося прочитати тривалість')
    n=int(value);word='тиждень' if n%10==1 and n%100!=11 else 'тижні' if n%10 in (2,3,4) and n%100 not in (12,13,14) else 'тижнів'
    return f'{n} {word}'

def parse_calendar(html):
    body=article(html);tables=body.xpath('.//table')
    if not tables:raise ValueError('Немає таблиці графіка')
    matrix=table_matrix(tables[0]);year=re.search(r'(20\d{2})\s*[-–—]\s*(20\d{2})\s+навчальн',text(body))
    if not year or int(year[2])!=int(year[1])+1:raise ValueError('Не визначено навчальний рік')
    result=[];last_title=None
    for row in matrix[2:]:
        if len(row)!=3:raise ValueError('Змінена структура таблиці графіка')
        title,duration,dates=row
        if not title or not re.search(r'20\d{2}',dates):raise ValueError('Неповний рядок графіка')
        dates=norm(re.sub(r'\s*\(аспіранти.*$','',dates,flags=re.I)).replace('–','-').replace('—','-')
        note='';m=re.search(r'\((\d\s*[-–]\s*\d) року навчання\)',title)
        if m:note=m[1].replace('–','-')+' роки навчання';title=norm(title[:m.start()])
        if duration=='*':
            if 'Індивідуально' not in text(body):raise ValueError('Відсутня примітка до практики')
            duration='Індивідуально, відповідно до затверджених навчальних планів'
        else:duration=weeks(duration)
        if title==last_title and 'семестр' in title.lower():
            if 'заочної' not in row[2]:raise ValueError('Не визначено форму навчання')
            result[-1][3:5]=[dates,duration]
        else:
            result.append([title,dates,duration,None,None,note]);last_title=title
    if len(result)<6 or len(result)>25:raise ValueError('Неповний графік освітнього процесу')
    for row in result:
        if 'семестр' in row[0].lower() and not row[3]:raise ValueError('Відсутній графік заочної форми')
    return {'year':year[1]+'-'+year[2],'periods':result,'source':SOURCES['calendar']}

def parse_bells(html):
    tables=article(html).xpath('.//table')
    if not tables:raise ValueError('Немає таблиці розкладу дзвінків')
    rows=table_matrix(tables[0]);result=[];last=-1
    for row in rows[1:]:
        if len(row)!=3:raise ValueError('Змінена структура розкладу дзвінків')
        times=[]
        for value in row[1:]:
            m=re.fullmatch(r'(\d{1,2}):(\d{2})',value)
            if not m or int(m[1])>23 or int(m[2])>59:raise ValueError('Некоректний час заняття')
            times.append(f'{int(m[1]):02}:{int(m[2]):02}')
        mins=[int(t[:2])*60+int(t[3:]) for t in times]
        if not last<mins[0]<mins[1]:raise ValueError('Некоректна послідовність занять')
        last=mins[1];result.append(times)
    if not 1<=len(result)<=12:raise ValueError('Некоректна кількість пар')
    return {'rows':result,'source':SOURCES['bells']}

def parse_group_pdf(raw,url):
    groups=[];subject=None
    with pdfplumber.open(BytesIO(raw)) as pdf:
        if not 1<=len(pdf.pages)<=40:raise ValueError('Некоректна кількість сторінок списку')
        for pn,page in enumerate(pdf.pages):
            extracted=page.extract_text(x_tolerance=1) or ''
            for chunk in re.split(r'(?=Списки аспірантів)',extracted):
                lines=[norm(line) for line in chunk.splitlines() if norm(line)]
                if not lines:continue
                heading=next((line for line in lines if line.startswith('Дисципліна ')),None)
                if not heading:raise ValueError('Не прочитано назву дисципліни')
                m=re.search(r'«(.+)»',heading)
                if not m:raise ValueError('Змінено формат назви дисципліни')
                title=m[1]
                if subject and subject!=title:raise ValueError('У документі змішані дисципліни')
                subject=title
                language=next((line for line in lines if re.fullmatch(r'[А-ЯІЇЄҐа-яіїєґ’\s-]+ мова',line)),'')
                gn=next((line for line in lines if re.fullmatch(r'\d+ група',line)),language)
                if not gn:raise ValueError('Не прочитано назву групи')
                first=next((n for n,line in enumerate(lines) if line.startswith('№')),None)
                if first is None:raise ValueError('Немає заголовка списку')
                meta=norm(' '.join(lines[lines.index(gn)+1:first]))
                lecturer=next((line for line in lines[:first] if line.startswith('(') and re.search('доцент|професор',line)),'')
                students=[]
                for line in lines[first:]:
                    match=re.match(r'^(\d+)\s+(.+)$',line)
                    if not match:continue
                    parts=re.split(r'\s+(?=[A-ZА-ЯІЇЄҐ]\d+\s)',match[2],maxsplit=1);name=parts[0].strip()
                    if not 2<=len(name.split())<=6 or len(name)>180:raise ValueError('Не вдалося повністю прочитати ім’я')
                    students.append({'number':int(match[1]),'name':name,**({'specialty':parts[1]} if len(parts)>1 else {})})
                if not students or [s['number'] for s in students]!=list(range(1,len(students)+1)):raise ValueError('Порушена нумерація списку')
                if len({s['name'] for s in students})!=len(students):raise ValueError('Повторення імені в одній групі')
                # In a one-person language table the specialty may wrap above and below the name.
                if language and gn==language:
                    before=[l for l in lines[first:] if re.match(r'^[A-ZА-ЯІЇЄҐ]\d+\s',l)]
                    after=[l for l in lines[first:] if not re.match(r'^(?:\d+\s|№|з/п|Прізвище)',l) and not re.match(r'^[A-ZА-ЯІЇЄҐ]\d+\s',l)]
                    if before:meta=' '.join(before+after)
                groups.append({'title':(language+' · ' if language and gn!=language else '')+gn,'specialties':meta,'lecturer':lecturer,'students':students,'page':pn+1})
    if not subject or not groups:raise ValueError('Документ не містить груп')
    return {'title':subject,'source':url,'groups':groups}

def parse_groups(html,fetch_pdf):
    links=[]
    for a in article(html).xpath('.//a[@href]'):
        url=urljoin(SOURCES['groups'],a.get('href'))
        if urlsplit(url).path.lower().endswith('.pdf') and 'списки аспірантів' in text(a).lower():
            check_url(url)
            if url not in links:links.append(url)
    if not 1<=len(links)<=15:raise ValueError('Не знайдено повний перелік документів груп')
    catalog=[parse_group_pdf(fetch_pdf(url),url) for url in links]
    if len({s['title'] for s in catalog})!=len(catalog):raise ValueError('Повторені документи дисциплін')
    return {'catalog':catalog,'source':SOURCES['groups']}

def refresh(base,fetch=download):
    path=Path(base)/'data.json';old=json.loads(path.read_text(encoding='utf-8-sig'))
    if old.get('version')!=1 or not old.get('pages') or old.get('pending'):raise ValueError('Відсутні збережені дані застосунку')
    previous=old.get('education',{});education=dict(previous);now=datetime.now(timezone.utc).isoformat();errors=[];received=0
    for key,url in SOURCES.items():
        try:
            html=fetch(url)
            value=parse_calendar(html) if key=='calendar' else parse_bells(html) if key=='bells' else parse_groups(html,lambda u:fetch(u,pdf=True))
            if key=='groups' and previous.get('groups'):
                before=previous['groups']['catalog'];after=value['catalog']
                old_count=sum(len(g['students']) for s in before for g in s['groups']);new_count=sum(len(g['students']) for s in after for g in s['groups'])
                if new_count<old_count*.8 or len(after)<len(before):raise ValueError('Списки суттєво скоротилися; потрібна ручна перевірка')
            same={k:v for k,v in previous.get(key,{}).items() if k not in {'checkedAt','updatedAt'}}==value
            value['checkedAt']=now;value['updatedAt']=previous.get(key,{}).get('updatedAt',now) if same else now
            education[key]=value;received+=1
        except Exception as exc:
            errors.append({'section':key,'message':str(exc)[:240]});print(f'::warning::Не оновлено розділ {key}; збережено попередні дані. {type(exc).__name__}')
    education.update(version=1,attemptedAt=now,errors=errors)
    if received:education['checkedAt']=now
    old['education']=education
    payload=json.dumps(old,ensure_ascii=False,indent=2)+'\n'
    if len(payload.encode('utf-8'))>25_000_000:raise ValueError('Завеликий файл даних')
    temporary=path.with_suffix('.tmp');temporary.write_text(payload,encoding='utf-8');temporary.replace(path)
    print(f'Освітній процес: оновлено {received}/3 розділів. Інші сторінки не змінено.')
    return old
