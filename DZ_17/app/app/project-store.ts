export type ProjectSnapshot={
 version:1;
 updatedAt:string;
 stage:number;
 answers:string[];
 researchPack:string[];
 storyDna:string[];
 world:string;
 variants:string[];
 names:string[];
 approved:boolean;
};

const KEY='wild-ideas:project-memory:v1';

export function loadProjectSnapshot():ProjectSnapshot|null{
 if(typeof window==='undefined')return null;
 try{
  const raw=window.localStorage.getItem(KEY);
  if(!raw)return null;
  const value=JSON.parse(raw) as ProjectSnapshot;
  if(value?.version!==1||!Array.isArray(value.answers)||!Array.isArray(value.storyDna))return null;
  return value;
 }catch{return null;}
}

export function saveProjectSnapshot(snapshot:Omit<ProjectSnapshot,'version'|'updatedAt'>){
 if(typeof window==='undefined')return;
 const value:ProjectSnapshot={version:1,updatedAt:new Date().toISOString(),...snapshot};
 try{window.localStorage.setItem(KEY,JSON.stringify(value));}catch{/* Demo remains usable when storage is blocked. */}
}

export function clearProjectSnapshot(){
 if(typeof window==='undefined')return;
 try{window.localStorage.removeItem(KEY);}catch{/* no-op */}
}
