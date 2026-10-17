"""Read public department pages into a sanitized, offline-readable snapshot.

Only Python's standard library is required. Existing pages survive network failures.
"""
from __future__ import annotations
import argparse
from collections import deque
from datetime import datetime, timezone
from html import escape
from html.parser import HTMLParser
import json
from pathlib import Path
import re
import time
from urllib.error import HTTPError, URLError
from urllib.parse import urljoin, urlsplit, urlunsplit, unquote, quote
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parent
VOID = {'area','base','br','col','embed','hr','img','input','link','meta','param','source','track','wbr'}
DROP = {'script','style','noscript','nav','header','footer','button','form','input','select','textarea','svg','canvas'}
ALLOWED = {'p','div','section','span','h2','h3','h4','h5','h6','strong','b','em','i','u','s','br','hr','ul','ol','li','blockquote','pre','code','table','thead','tbody','tfoot','tr','th','td','caption','a','img','details','summary','figure','figcaption','dl','dt','dd','sup','sub'}
PREFIXES = ('shablony-','pamyat','osvitn','spetsialnosti','vstup-do-','normatyvno-','akredyt','vidomosti-','rekomendatsiyi-','zamovlennya-','komanda','akademichna-','antykoruptsiyni-','obhovorennya','anketuvannya','doktorski-spetsializovani','razovi-spetsializovani','reytynhovi-spysky-')

class Node:
    def __init__(self, tag='', attrs=None):
        self.tag, self.attrs, self.children = tag, dict(attrs or []), []
    def walk(self):
        yield self
        for child in self.children:
            if isinstance(child, Node): yield from child.walk()
    def text(self):
        return ' '.join(c.text() if isinstance(c, Node) else c for c in self.children)

class Document(HTMLParser):
    def __init__(self, html):
        super().__init__(convert_charrefs=True)
        self.root=Node('root'); self.stack=[self.root]; self.feed(html)
    def handle_starttag(self, tag, attrs):
        # Close common optional HTML elements before attaching siblings.
        if tag in {'li','tr','td','th','p'} and self.stack[-1].tag==tag: self.stack.pop()
        node=Node(tag, attrs); self.stack[-1].children.append(node)
        if tag not in VOID: self.stack.append(node)
    def handle_startendtag(self, tag, attrs):
        self.handle_starttag(tag,attrs)
        if tag not in VOID: self.handle_endtag(tag)
    def handle_endtag(self, tag):
        for i in range(len(self.stack)-1,0,-1):
            if self.stack[i].tag==tag:
                self.stack=self.stack[:i]; break
    def handle_data(self, data): self.stack[-1].children.append(data)

def canonical(url):
    parsed=urlsplit(url)
    if parsed.hostname not in {'nubip.edu.ua','www.nubip.edu.ua'}: return None
    if parsed.scheme not in {'http','https'}: return None
    path=quote(parsed.path.rstrip('/') or '/',safe="/%:@-._~!$&'()*+,;=")
    return urlunsplit(('https','nubip.edu.ua',path,parsed.query,''))

def safe_url(value, base):
    absolute=urljoin(base, value.strip())
    return absolute if urlsplit(absolute).scheme.lower() in {'http','https','mailto','tel'} else ''

def render(node, base):
    if isinstance(node,str): return escape(node)
    if node.tag in DROP or 'hidden' in node.attrs or node.attrs.get('aria-hidden')=='true': return ''
    classes=set(node.attrs.get('class','').split())
    if any(c.startswith(('slider__button','slider__counter','share-','social-')) for c in classes): return ''
    if node.tag=='iframe':
        src=safe_url(node.attrs.get('src',''),base)
        return '<p><a href="'+escape(src,quote=True)+'" target="_blank" rel="noopener noreferrer">Відкрити вбудований матеріал</a></p>' if src else ''
    inner=''.join(render(c,base) for c in node.children)
    if node.tag not in ALLOWED: return inner
    attrs={}
    if node.attrs.get('id'): attrs['id']=node.attrs['id'][:180]
    if node.tag=='a':
        href=safe_url(node.attrs.get('href',''),base)
        if not href: return inner
        attrs.update(href=href,target='_blank',rel='noopener noreferrer')
    if node.tag=='img':
        src=safe_url(node.attrs.get('src',''),base)
        if not src: return ''
        attrs.update(src=src,alt=node.attrs.get('alt',''),loading='lazy')
    if node.tag in {'td','th'}:
        for key in ['colspan','rowspan']:
            if node.attrs.get(key,'').isdigit(): attrs[key]=str(min(100,max(1,int(node.attrs[key]))))
    attr=''.join(' '+k+'="'+escape(v,quote=True)+'"' for k,v in attrs.items())
    return '<'+node.tag+attr+'>'+('' if node.tag in VOID else inner+'</'+node.tag+'>')

def page_from(html, url):
    doc=Document(html); all_nodes=list(doc.root.walk())
    articles=[n for n in all_nodes if n.tag=='article']
    preferred=[n for n in articles if set(n.attrs.get('class','').split()) & {'static-page','node--type-page','news-full','news-page'}]
    candidates=preferred or articles
    if not candidates: raise ValueError('Не знайдено основний вміст сторінки')
    article=max(candidates,key=lambda n:len(n.text()))
    heading=next((n for n in article.walk() if n.tag=='h1'),None)
    description=next((n for n in article.walk() if 'description' in n.attrs.get('class','').split()),None)
    body=description or article
    title=re.sub(r'\s+',' ',heading.text()).strip() if heading else ''
    if not title:
        title_node=next((n for n in all_nodes if n.tag=='h1'),None)
        title=re.sub(r'\s+',' ',title_node.text()).strip() if title_node else ''
    if not title: raise ValueError('Немає заголовка сторінки')
    # Strip the page title from content; the app has its own accessible heading.
    content=''.join(render(n,url) for n in body.children if not isinstance(n,Node) or n.tag!='h1')
    content_doc=Document(content)
    visible=' '.join(content_doc.root.text().split())
    has_image=any(n.tag=='img' and urlsplit(n.attrs.get('src','')).scheme in {'https','http'} for n in content_doc.root.walk())
    if len(visible)<25 and not has_image: raise ValueError('Зміст сторінки порожній або неповний')
    if len(content)>2_000_000: raise ValueError('Сторінка перевищує допустимий розмір')
    links=[]
    for n in body.walk():
        if n.tag=='a' and n.attrs.get('href'):
            href=canonical(urljoin(url,n.attrs['href']))
            if href and href!=canonical(url): links.append(href)
    aliases=[]
    for n in all_nodes:
        if n.tag=='link' and n.attrs.get('rel')=='canonical':
            alias=canonical(urljoin(url,n.attrs.get('href','')))
            if alias: aliases.append(alias)
    return {'title':title,'url':canonical(url),'html':content,'aliases':list(dict.fromkeys(aliases))},list(dict.fromkeys(links))

def department_links(html,base):
    doc=Document(html);main=next((n for n in doc.root.walk() if n.tag=='main'),doc.root)
    menu=[];news=[]
    for n in main.walk():
        if n.tag!='a' or not n.attrs.get('href'):continue
        url=canonical(urljoin(base,n.attrs['href']))
        if not url:continue
        title=' '.join(n.text().split())
        if urlsplit(url).path.startswith('/news/') and len(title)>15:
            if not any(x['url']==url for x in news):news.append({'url':url,'title':title,'category':'Новини відділу','date':None})
        elif eligible(url): menu.append(url)
    return list(dict.fromkeys(menu)),news[:6]

def eligible(url):
    path=unquote(urlsplit(url).path).lstrip('/')
    return bool(path.startswith(PREFIXES)) and not re.search(r'\.(pdf|docx?|xlsx?|zip|png|jpe?g|gif|webp)$',path,re.I)

def contact_from(html):
    doc=Document(html)
    footer=next((n for n in doc.root.walk() if 'department-footer' in n.attrs.get('class','').split()),None)
    if not footer:return None
    address=next((n for n in footer.walk() if 'department-footer__address' in n.attrs.get('class','').split()),None)
    phones=[];emails=[]
    for n in footer.walk():
        encoded=n.attrs.get('data-cfemail','')
        href=n.attrs.get('href','')
        if '/cdn-cgi/l/email-protection#' in href:encoded=href.split('#',1)[1]
        if encoded:
            try:
                raw=bytes.fromhex(encoded);email_address=''.join(chr(b^raw[0]) for b in raw[1:])
                if re.fullmatch(r'[\w.+-]+@[\w.-]+',email_address) and not any(e['label']==email_address for e in emails):emails.append({'label':email_address,'url':'mailto:'+email_address})
            except (ValueError,IndexError):pass
        if n.tag!='a':continue
        href=n.attrs.get('href','')
        if href.startswith('tel:'):
            for label in re.findall(r'\(\d{3}\)\s*\d{3}-\d{2}-\d{2}',n.text()):
                number='+38'+re.sub(r'\D','',label)
                if not any(p['url']=='tel:'+number for p in phones):phones.append({'label':label,'url':'tel:'+number})
        elif href.startswith('mailto:') and re.fullmatch(r'mailto:[\w.+-]+@[\w.-]+',href) and not any(e['url']==href for e in emails):emails.append({'label':href[7:],'url':href})
    if not address or not phones:return None
    return {'address':' '.join(address.text().split()),'phones':phones,'emails':emails}

def download(url):
    last=None
    for attempt in range(3):
        try:
            req=Request(url,headers={'User-Agent':'NUBiP-Postgraduate-Office/1.0 (+https://github.com/boiarchukserhii-svg/nubip-postgraduate-office)','Accept':'text/html'})
            with urlopen(req,timeout=50) as response:
                if 'html' not in response.headers.get('Content-Type','').lower(): raise ValueError('Відповідь не є HTML')
                raw=response.read(6_000_001)
                if len(raw)>6_000_000:raise ValueError('Завелика сторінка')
                text=raw.decode(response.headers.get_content_charset() or 'utf-8',errors='replace')
                if re.search(r'<title[^>]*>\s*(?:One moment|Just a moment|Access denied)',text,re.I):raise ValueError('Сайт повернув сторінку захисту замість змісту')
                return text,response.geturl()
        except HTTPError as exc:
            last=exc
            if exc.code in {404,410}: break
        except (URLError,TimeoutError,OSError,ValueError) as exc:last=exc
        if attempt<2: time.sleep(2**(attempt+1))
    raise RuntimeError(str(last))

def sync(base=ROOT, allow_stale=False):
    config=json.loads((base/'source-pages.json').read_text(encoding='utf-8-sig'))
    path=base/'data.json'
    old=json.loads(path.read_text(encoding='utf-8-sig')) if path.exists() else {}
    pages=dict(old.get('pages',{})); news=old.get('news',[]); contact=old.get('contact'); errors=[]; now=datetime.now(timezone.utc).isoformat(); fetched=0
    queue=deque((url,0) for url in config['seeds']);seen=set();department=config['department'];maximum=config.get('maxPages',80)
    while queue and len(seen)<maximum:
        # Prefer the landing page, missing pages, then the oldest saved pages.
        # The next run can therefore finish newly discovered children after a size-limited run.
        def priority(item):
            key=canonical(item[0]);saved=pages.get(key) or next((p for p in pages.values() if key in p.get('aliases',[])),None)
            return (0 if key==department else 1 if saved is None else 2, '' if saved is None else saved.get('checkedAt',''),item[1])
        queue=deque(sorted((item for item in queue if canonical(item[0]) not in seen),key=priority))
        if not queue:break
        requested,depth=queue.popleft();requested=canonical(requested)
        if not requested or requested in seen:continue
        seen.add(requested)
        try:
            html,final=download(requested);final=canonical(final)
            if not final: raise ValueError('Сторінка перенаправлена за межі сайту НУБіП')
            if requested==department:
                menu,latest=department_links(html,final)
                if latest:news=latest
                contact=contact_from(html) or contact
                queue.extend((url,0) for url in menu if url not in seen)
                queue.extend((item['url'],0) for item in news if item['url'] not in seen)
                # The department landing page is navigation; individual articles supply app content.
                fetched+=1;time.sleep(.25);continue
            page,links=page_from(html,final);page['aliases']=list(dict.fromkeys(page['aliases']+[requested,final]));page['checkedAt']=now
            previous=next((p for p in pages.values() if requested==p.get('url') or requested in p.get('aliases',[])),None)
            page['updatedAt']=previous.get('updatedAt',now) if previous and previous.get('html')==page['html'] and previous.get('title')==page['title'] else now
            for key in list(pages):
                if key in page['aliases'] and key!=final:del pages[key]
            pages[final]=page;fetched+=1
            if depth<config.get('maxDepth',2):queue.extend((url,depth+1) for url in links if eligible(url) and url not in seen)
        except Exception as exc:
            errors.append({'url':requested,'message':str(exc)[:300]});print('WARNING',requested,str(exc)[:300])
        time.sleep(.3)
    if fetched==0 and allow_stale and old.get('version')==1 and not old.get('pending') and old.get('pages') and all(isinstance(p,dict) and p.get('title') and p.get('html') and p.get('url') for p in old['pages'].values()):
        print('::warning::Сайт НУБіП недоступний для автоматичного читання. Публікуємо зміни застосунку з попередніми даними; дата їх перевірки залишається без змін.')
        return old
    if not pages or fetched==0:raise RuntimeError('Не отримано жодної придатної сторінки. Попередній файл даних залишено без змін.')
    result={'version':1,'checkedAt':now,'updatedAt':now,'pages':pages,'news':news,'contact':contact,'errors':errors,'pending':False,'stats':{'checked':len(seen),'received':fetched,'saved':len(pages),'remaining':len(queue)}}
    payload=json.dumps(result,ensure_ascii=False,indent=2)+'\n'
    if len(payload.encode())>25_000_000:raise RuntimeError('Дані завеликі; попередня версія збережена')
    temporary=path.with_suffix('.tmp');temporary.write_text(payload,encoding='utf-8');temporary.replace(path)
    print(json.dumps(result['stats'],ensure_ascii=False));return result

if __name__=='__main__':
    parser=argparse.ArgumentParser()
    parser.add_argument('--directory',type=Path,default=ROOT)
    parser.add_argument('--refresh-source',action='store_true',help='Explicitly refresh content from the NUBiP website')
    args=parser.parse_args()
    if args.refresh_source:
        sync(args.directory,allow_stale=True)
    else:
        from sync_education import refresh
        refresh(args.directory)
