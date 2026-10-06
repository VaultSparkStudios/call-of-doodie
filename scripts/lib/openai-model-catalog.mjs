// OpenAI API catalog verified 2026-10-01 against the model pages below.
// Model/API availability is NOT evidence of this account's access. Codex uses
// its own dynamic runtime catalog and context metadata; never infer these from API limits.
import fs from 'node:fs';
import path from 'node:path';
export const OPENAI_CATALOG_VERIFIED_AT = '2026-10-01';
export const OPENAI_SOURCES = {
  api: 'https://developers.openai.com/api/docs/models/',
  codex: 'https://learn.chatgpt.com/docs/models',
  aliases: 'https://developers.openai.com/api/docs/models/gpt-5.6-sol',
};
const current=(tier,input,cacheRead,output,efforts)=>({
  tier,contextWindow:1_050_000,maxOutputTokens:128_000,supports:['tools','vision','streaming'],
  reasoningEfforts:efforts,price:{input,cacheRead,cacheWrite:input*1.25,output},
  longContext:{inputThreshold:272_000,inputMultiplier:2,outputMultiplier:1.5},
});
const standard=['none','low','medium','high','xhigh','max'];
export const CURRENT_OPENAI_MODELS = {
  'gpt-6-astra':current('frontier',10,1,50,standard.filter(e=>e!=='none')),
  'gpt-6.1-sol':current('flagship',2,0.1,10,standard.filter(e=>e!=='none')),
  'gpt-6-sol':current('flagship',2,0.2,10,standard),
  'gpt-6-luna':current('fast',0.1,0.01,0.5,standard),
  // Retained explicit versions are never silently redirected to a newer family.
  'gpt-5.6-sol':current('flagship',4,0.4,20,standard),
  'gpt-5.6-terra':current('mid',2,0.2,12,standard),
  'gpt-5.6-luna':current('fast',0.2,0.02,1.2,standard),
};
export const OPENAI_MODEL_EVIDENCE = Object.freeze(Object.fromEntries(Object.keys(CURRENT_OPENAI_MODELS).map(id=>[id,{
  url:'https://developers.openai.com/api/docs/models/'+id,verifiedAt:OPENAI_CATALOG_VERIFIED_AT,
  pricingBasis:'standard list estimate; account billing and entitlement unverified',
  toolCalling:id==='gpt-6-astra'||id==='gpt-6.1-sol'?'responses-only':id==='gpt-6-sol'||id==='gpt-6-luna'?'responses-or-chat-with-none':'responses-supported',
}])));
export const OPENAI_MODEL_ALIASES = {'gpt-5.6':'gpt-5.6-sol'};
export function resolveOpenAIModel(model) {
  const id=String(model||'').replace(/^openai\//,'');
  return OPENAI_MODEL_ALIASES[id]||id;
}
export function shortOpenAIModelName(model) { return resolveOpenAIModel(model)||null; }
export function priceForOpenAIModel(model,{inputTokens=0}={}) {
  const entry=CURRENT_OPENAI_MODELS[resolveOpenAIModel(model)];
  if(!entry)return null; // Unknown/older IDs must never be charged at another provider's price.
  if(!Number.isFinite(inputTokens)||inputTokens<0)throw Error('inputTokens must be finite and nonnegative');
  const long=inputTokens>entry.longContext.inputThreshold;
  return Object.fromEntries(Object.entries(entry.price).map(([key,value])=>[
    key,value*(long?(key==='output'?entry.longContext.outputMultiplier:entry.longContext.inputMultiplier):1),
  ]));
}
export function validateOpenAIReasoning(model,reasoning) {
  const entry=CURRENT_OPENAI_MODELS[resolveOpenAIModel(model)];
  if(reasoning?.effort && entry && !entry.reasoningEfforts.includes(reasoning.effort))
    throw Error('Unsupported API reasoning effort '+reasoning.effort+' for '+model);
}
const RETIRED_CODEX_CHATGPT = {
  'gpt-5.4':'gpt-6-sol','gpt-5.4-mini':'gpt-6-luna',
  'gpt-5.2':null,'gpt-5.3-codex':null,'gpt-5.3-codex-spark':null,
};
export const OPENAI_RETIREMENTS = Object.freeze({
  'gpt-5.5':{surface:'codex-chatgpt',retiresOn:'2026-10-14',source:OPENAI_SOURCES.codex},
  'whisper-1':{surface:'openai-api',retiresOn:'2027-02-26',source:'https://developers.openai.com/api/docs/changelog'},
});
/** Reads only literal model/provider fields; arbitrary TOML is not interpreted. */
export function assessCodexModelConfig(text,{authMode='unknown',now=Date.now()}={}) {
  const pins=[];let section='';const errors=[];
  for(const [i,line]of String(text||'').split(/\r?\n/).entries()){
    const header=line.match(/^\s*\[([^\]]+)\]\s*(?:#.*)?$/);if(header){section=header[1];continue;}
    // Root and named profiles carry model settings; provider tables do not.
    if(section&&!/^profiles\.[\w-]+$/.test(section))continue;
    const match=line.match(/^\s*model\s*=\s*(["'])([^"']+)\1\s*(?:#.*)?$/);
    if(match)pins.push({model:match[2],line:i+1,section:section||'root'});
    else if(/^\s*model\s*=/.test(line))errors.push({line:i+1,reason:'model-value-unparsed'});
  }
  const stale=Date.parse(OPENAI_CATALOG_VERIFIED_AT+'T00:00:00Z')>now || now-Date.parse(OPENAI_CATALOG_VERIFIED_AT+'T00:00:00Z')>7*86400000;
  return {pins,unparsed:errors,currency:stale?'review-due':'dated-official-evidence',
    findings:pins.flatMap(pin=>{
      if(pin.model==='gpt-5.3-codex-spark')return [{...pin,severity:'fail',kind:'codex-preview-retired',detail:'Spark preview retired September 14 across Codex CLI, desktop app and IDE. Select a model listed by the current runtime.',replacement:null,authMode,source:OPENAI_SOURCES.codex}];
      const scheduled=OPENAI_RETIREMENTS[pin.model];
      if(!Object.hasOwn(RETIRED_CODEX_CHATGPT,pin.model)&&scheduled?.surface!=='codex-chatgpt')return [];
      const replacement=RETIRED_CODEX_CHATGPT[pin.model]||null;
      const retiring=scheduled&&now<Date.parse(scheduled.retiresOn+'T00:00:00Z');
      return [{...pin,severity:authMode==='chatgpt'?(retiring?'warn':'fail'):authMode==='api-key'?'advisory':'warn',
        kind:authMode==='api-key'?'codex-api-pin-preserved':retiring?'codex-chatgpt-model-retiring':'codex-chatgpt-retired-model',
        detail:authMode==='api-key'?'ChatGPT-sign-in retirement does not retire API-key access.':
          (retiring?'Retires '+scheduled.retiresOn:'Retired')+' for Codex ChatGPT sign-in; '+(authMode==='unknown'?'authentication unmeasured; ':'')+(replacement?'consider '+replacement+' only when available to this account/client.':'select a model listed by the target runtime.'),
        replacement,authMode,...(scheduled?{retiresOn:scheduled.retiresOn}:{}),source:OPENAI_SOURCES.codex}];
    })};
}
export function assessCodexProjectModels(root,options={}) {
  const file=path.join(root,'.codex','config.toml');
  try{return {file,state:'present',...assessCodexModelConfig(fs.readFileSync(file,'utf8'),options)};}
  catch(error){if(error.code==='ENOENT')return {file,state:'absent',pins:[],findings:[]};
    return {file,state:'unreadable',pins:[],findings:[{severity:'warn',kind:'codex-config-unreadable',detail:error.code||'read failed'}]};}
}


/** Codex metadata is an observation of the client catalog, never API entitlement. */
export function resolveCodexRuntimeModel(model,{cache=null,now=Date.now(),maxAgeMs=86400000}={}) {
  const resolved=resolveOpenAIModel(model);
  const base={model,resolved,source:'codex-runtime-cache',apiAccess:'unverified'};
  const stamp=Date.parse(cache?.fetched_at);
  if(!Number.isFinite(stamp)||stamp>now||now-stamp>maxAgeMs||!Array.isArray(cache?.models))
    return {...base,state:'unmeasured',reason:'cache-missing-stale-or-invalid',contextWindow:null};
  const row=cache.models.find(m=>m.slug===resolved&&m.visibility==='list');
  if(!row)return {...base,state:'unmeasured',reason:'model-not-listed',contextWindow:null};
  return {...base,state:'listed',observedAt:cache.fetched_at,clientVersion:cache.client_version||null,
    contextWindow:Number.isInteger(row.context_window)&&row.context_window>0?row.context_window:null,
    reasoningEfforts:(row.supported_reasoning_levels||[]).map(r=>r.effort).filter(e=>typeof e==='string')};
}


export const OPENAI_MODEL_CURRENCY = Object.freeze({
  verifiedAt: OPENAI_CATALOG_VERIFIED_AT+'T00:00:00Z',
  maxAgeDays: 7,
  fingerprints: {
    'openai-codex-changelog':'df162916c995c78c8005e057297fa5d4d82e91b102569e92faad3b3e9774935e',
    'openai-api-changelog':'9b16b25b058a08528b3c807cd804b6ff343308a61722fbf6580f8af091a632ab',
  },
});
// Source changes require review; a successful fetch alone cannot renew this catalog.
export function assessOpenAIModelCurrency(radar,now=Date.now()) {
  const maxAge=OPENAI_MODEL_CURRENCY.maxAgeDays*86400000;
  const reviewed=Date.parse(OPENAI_MODEL_CURRENCY.verifiedAt);
  if(!Number.isFinite(now)||reviewed>now||now-reviewed>maxAge)
    return {ok:false,reason:'openai-model-review-stale'};
  for(const [id,hash] of Object.entries(OPENAI_MODEL_CURRENCY.fingerprints)) {
    const source=radar?.sources?.find(s=>s.id===id);
    if(!source||source.status!=='ok'||!source.contentSha256)
      return {ok:false,reason:'openai-vendor-evidence-unavailable',sourceId:id};
    if(source.contentSha256!==hash)
      return {ok:false,reason:'openai-vendor-catalog-changed',sourceId:id};
    const observed=Date.parse(source.observedAt);
    if(!Number.isFinite(observed)||observed>now||now-observed>maxAge)
      return {ok:false,reason:'openai-vendor-evidence-stale',sourceId:id};
  }
  return {ok:true,reason:'current-reviewed-openai-catalog'};
}
