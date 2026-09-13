import {recentTraceEvents,recordTrace,requestTraceId,traceHeaders} from '@/lib/trace';

export async function GET(request:Request){
 const traceId=requestTraceId(request,'TRACE-READ');
 const url=new URL(request.url);
 const limit=Number(url.searchParams.get('limit')||100);
 const filterTraceId=String(url.searchParams.get('trace_id')||'').trim()||undefined;
 const testId=String(url.searchParams.get('test_id')||'').trim()||undefined;
 const events=await recentTraceEvents({limit:Number.isFinite(limit)?limit:100,traceId:filterTraceId,testId});
 await recordTrace({trace_id:traceId,source:'http',stage:'TRACE',action:'trace.read',status:'ok',route:'/api/v1/trace',method:'GET',details:{returned:events.length,filter_trace_id:filterTraceId||null,test_id:testId||null}});
 return Response.json({
  ok:true,
  data:{events,count:events.length},
  trace:{trace_id:traceId,service:'runtime-trace',schema_version:'v1',created_at:new Date().toISOString()},
 },{headers:traceHeaders(traceId)});
}

export async function POST(request:Request){
 const traceId=requestTraceId(request,'TRACE-MARK');
 let body:Record<string,unknown>={};
 try{body=await request.json() as Record<string,unknown>;}catch{return Response.json({ok:false,error:{code:'INVALID_JSON',message:'Некорректный JSON.'},trace:{trace_id:traceId}},{status:400,headers:traceHeaders(traceId)});}
 const stage=String(body.stage||'CLIENT').trim();
 const action=String(body.action||'client.marker').trim();
 const statusRaw=String(body.status||'info');
 const status=statusRaw==='start'||statusRaw==='ok'||statusRaw==='error'||statusRaw==='info'?statusRaw:'info';
 const testId=typeof body.test_id==='string'?body.test_id:undefined;
 const details=body.details&&typeof body.details==='object'?body.details as Record<string,unknown>:{};
 const event=await recordTrace({trace_id:traceId,source:testId?'test':'script',stage,action,status,test_id:testId,details});
 return Response.json({ok:true,data:event,trace:{trace_id:traceId}},{status:201,headers:traceHeaders(traceId)});
}
