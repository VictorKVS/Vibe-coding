'use client';
import { useEffect } from 'react';
import { flushSync } from 'react-dom';
type Context = { registerTool: (tool: {name:string;description:string;inputSchema:object;annotations:object;execute:(input:unknown)=>unknown},options:{signal:AbortSignal})=>void|Promise<void> };
export function AgentTools({open}:{open:()=>void}){
useEffect(()=>{const context=(document as Document & {modelContext?:Context}).modelContext;if(!context?.registerTool)return;const lifecycle=new AbortController();try{void Promise.resolve(context.registerTool({name:'start_story_brief',description:'Open the three-question story brief demonstration. Does not submit an order.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:false,untrustedContentHint:false},execute(input){if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).length)throw new Error('Expected an empty object');flushSync(open);return {screen:'story_brief',orderSubmitted:false};}},{signal:lifecycle.signal})).catch(()=>{});}catch{}return()=>lifecycle.abort();},[open]);return null;}
