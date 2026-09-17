export type SecurityStatus=
 |'SECURITY_UNREVIEWED'
 |'SECURITY_APPROVED'
 |'SECURITY_RESTRICTED'
 |'SECURITY_HOLD'
 |'SECURITY_REJECTED';

export type StructureNodeType=
 |'document'|'part'|'chapter'|'section'|'subsection'
 |'article'|'clause'|'subclause'|'paragraph'|'list'
 |'list_item'|'table'|'figure'|'example'|'case'|'appendix'|'unknown';

export type SourceRecord={
 source_id:string;
 source_type:string;
 canonical_uri:string|null;
 acquisition_uri:string|null;
 title:string|null;
 language:string|null;
 metadata:Record<string,unknown>;
 status:string;
 created_at:string;
};

export type CaptureRecord={
 capture_id:string;
 source_id:string;
 captured_at:string;
 sha256:string;
 mime_type:string|null;
 size_bytes:number|null;
 storage_ref:string|null;
 parser_status:string;
 security_status:SecurityStatus;
 metadata:Record<string,unknown>;
};

export type StructureNodeRecord={
 structure_node_id:string;
 capture_id:string;
 parent_id:string|null;
 node_type:StructureNodeType;
 ordinal:number|null;
 label:string|null;
 page_from:number|null;
 page_to:number|null;
 metadata:Record<string,unknown>;
};

export type SourceSpanRecord={
 span_id:string;
 capture_id:string;
 structure_node_id:string|null;
 page_from:number|null;
 page_to:number|null;
 char_from:number|null;
 char_to:number|null;
 text_hash:string|null;
 text_content:string|null;
 storage_ref:string|null;
 metadata:Record<string,unknown>;
};

export type IngestBundle={
 schema_version:'alina-kf-ingest-v1';
 source:Omit<SourceRecord,'created_at'> & {created_at?:string};
 capture:Omit<CaptureRecord,'captured_at'> & {captured_at?:string};
 structure_nodes:StructureNodeRecord[];
 source_spans:SourceSpanRecord[];
 trace?:Record<string,unknown>;
};

export type IngestResult={
 schema_version:'alina-kf-ingest-result-v1';
 source_id:string;
 capture_id:string;
 structure_nodes:number;
 source_spans:number;
 duplicate_capture:boolean;
 event_id:string;
 stored_at:string;
};

export type SourceTrace={
 source:SourceRecord;
 captures:Array<{
  capture:CaptureRecord;
  structure_nodes:StructureNodeRecord[];
  source_spans:SourceSpanRecord[];
 }>;
};
