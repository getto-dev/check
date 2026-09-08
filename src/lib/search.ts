import type { CatalogItem } from './types';
import type { Service } from './catalog';
const STOP_WORDS=new Set(['с','в','на','по','и','к','о','у','за','из','от','до','для','без','под','над','при','через','а','но','или','не','же','бы','ли','уже','ещё','так','как','что','это','то','все']);
const SUFFIXES=['ого','ому','ыми','ими','ость','ости','остью','ами','ями','ая','ее','ие','ий','им','их','ую','юю','ое','ые','ый','ым','ов','ев','ей','ой','ам','ям','ах','ях','ом','ем','а','е','и','о','у','ы','ю','ь'];
export const stem=(word:string)=>{let r=word.toLowerCase();for(const s of SUFFIXES){if(r.endsWith(s)&&r.length-s.length>=3){r=r.slice(0,-s.length);break}}return r};
export const tokenizeQuery=(query:string)=>query.toLowerCase().trim().split(/\s+/).filter(Boolean).filter(x=>!STOP_WORDS.has(x)).map(x=>stem(x.replace(/[0-9øØ°№]/g,''))).filter(x=>x.length>=2);
const score=(item:CatalogItem|Service,q:string)=>{if(!q.trim())return 1;const text=`${item.n} ${item.d}`.toLowerCase();return tokenizeQuery(q).reduce((s,t)=>s+(text.includes(t)?(item.n.toLowerCase().includes(t)?10:4):0),0)};
export const searchCatalog=(catalog:Record<string,Service[]>,query:string,categoryId?:string):CatalogItem[]=>Object.entries(catalog).flatMap(([cat,items])=>categoryId&&cat!==categoryId?[]:items.map(i=>({id:i.id,categoryId:cat,name:i.n,description:i.d,unit:i.u,priceKopecks:i.p*100}))).map(i=>({...i,__score:score({n:i.name,d:i.description,u:i.unit,id:i.id,p:i.priceKopecks/100},query)})).filter(i=>i.__score>0).sort((a,b)=>b.__score-a.__score).map(({__score:_,...i})=>i);
