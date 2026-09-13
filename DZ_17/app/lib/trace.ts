import {appendFile,mkdir,readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {randomUUID} from 'node:crypto';

export type TraceSource='http'|'script'|'test'|'system';
export type TraceStatus='start'|'ok'|'error'|'info';

export type TraceEvent={
 event_id:string;
 trace_id:string;
 at:string;
 source:TraceSource;
 stage:string;
 action:string;
 status:TraceStatus;
 route?:string;
 method?:string;
 test_id?:string;
 duration_ms?:number;
 details?:Record<string,unknown>;
};

const traceDir=resolve(process.cwd(),'runtime','trace');
const traceFile=resolve(traceDir,'events.jsonl');

function redactValue(value:unknown,key=''):unknown{
 const blocked=/token|secret|password|authorization|api[_-]?key|private[_-]?key/i.test(key);
 if(blocked)return '[REDACTED]';
 if(Array.isArray(value))return value.map(item=>redactValue(item));
 if(value&&typeof value==='object'){
  return Object.fromEntries(Object.entries(value as Record<string,unknown>).map(([k,v])=>[k,redactValue(v,k)]));
 }
 if(typeof value==='string'&&value.length>1000)return `${value.slice(0,1000)}…[truncated]`;
 return value;
}

export function createTraceId(prefix='TRC'){return `${prefix}-${randomUUID()}`;}

export function requestTraceId(request:Request,prefix='HTTP'){
 const incoming=request.headers.get('x-trace-id')?.trim();
 return incoming||createTraceId(prefix);
}

export async function recordTrace(input:Omit<TraceEvent,'event_id'|'at'>):Promise<TraceEvent>{
 const event:TraceEvent={event_id:randomUUID(),at:new Date().toISOString(),...input,details:input.details?redactValue(input.details) as Record<string,unknown>:undefined};
 await mkdir(traceDir,{recursive:true});
 await appendFile(traceFile,JSON.stringify(event)+'\n','utf8');
 const duration=typeof event.duration_ms==='number'?` ${event.duration_ms}ms`:'';
 console.log(`[TRACE] ${event.trace_id} ${event.source} ${event.stage}/${event.action} ${event.status}${duration}`);
 return event;
}

export async function recentTraceEvents(options?:{limit?:number;traceId?:string;testId?:string}){
 const limit=Math.max(1,Math.min(Number(options?.limit||100),500));
 let rows:string[]=[];
 try{rows=(await readFile(traceFile,'utf8')).split(/\r?\n/).filter(Boolean);}catch{return [] as TraceEvent[];}
 const parsed=rows.map(line=>{try{return JSON.parse(line) as TraceEvent;}catch{return null;}}).filter((item):item is TraceEvent=>Boolean(item));
 const filtered=parsed.filter(event=>(!options?.traceId||event.trace_id===options.traceId)&&(!options?.testId||event.test_id===options.testId));
 return filtered.slice(-limit).reverse();
}

export function traceHeaders(traceId:string){return {'x-trace-id':traceId};}
