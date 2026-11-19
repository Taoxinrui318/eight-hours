/* Eight Hours · local-first timeline engine. Also usable by Node for verification. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.Eight = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const MIN = 60000, HOUR = MIN * 60;
  const CATEGORIES = ['sleep', 'study', 'life'];
  const DEFAULT_ACTIVITIES = [
    ['sleep', '睡觉', 'sleep', 'rest', 'moon'], ['nap', '午睡', 'sleep', 'rest', 'moon'],
    ['class', '上课', 'study', 'class', 'school'], ['study', '自主学习', 'study', 'self', 'book'],
    ['project', '项目推进', 'study', 'self', 'flag'], ['paper', '阅读文献', 'study', 'self', 'file'],
    ['meal', '吃饭', 'life', 'essential', 'meal'], ['commute', '通勤', 'life', 'essential', 'train'],
    ['wash', '洗漱', 'life', 'essential', 'drop'], ['errand', '处理事务', 'life', 'essential', 'check'],
    ['exercise', '运动', 'life', 'essential', 'activity'], ['game', '游戏', 'life', 'fun', 'game'],
    ['phone', '刷手机', 'life', 'fun', 'phone']
  ].map(([id, name, category, kind, icon]) => ({id, name, category, kind, icon, pinned: true}));
  function uid() { return globalThis.crypto?.randomUUID?.() || 'id-' + Date.now().toString(36) + Math.random().toString(36).slice(2); }
  function clone(x) { return JSON.parse(JSON.stringify(x)); }
  function dateKey(value) {
    const d = new Date(value);
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  }
  function bounds(key) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) throw Error('日期格式不正确');
    const [y,m,d] = key.split('-').map(Number);
    const start = new Date(y,m-1,d), end = new Date(y,m-1,d+1);
    if (dateKey(start) !== key) throw Error('日期不存在');
    return [+start,+end];
  }
  function createState(now = Date.now()) {
    return {version:1, revision:0, createdAt:now, trackingStart:null, records:[], active:null,
      activities:clone(DEFAULT_ACTIVITIES), courses:[], targets:{sleep:480,study:480,life:480},
      dailyPlans:{}, preferences:{focusMinutes:45,sound:false}, undo:null};
  }
  function snapshot(a) {
    if (!a || !CATEGORIES.includes(a.category) || typeof a.name !== 'string' || !a.name.trim()) throw Error('请选择有效活动');
    return {activityId:a.id || uid(),name:a.name.trim().slice(0,60),category:a.category,kind:a.kind || 'self',icon:a.icon || 'circle'};
  }
  function pending(start,end) { return {id:uid(),start,end,activityId:'pending',name:'待补录',category:null,kind:'pending',icon:'help',note:''}; }
  function ensureStarted(s, now) {
    if (s.trackingStart === null) s.trackingStart = bounds(dateKey(s.createdAt))[0];
    if (!s.active && !s.records.length && now > s.trackingStart) s.records.push(pending(s.trackingStart,now));
  }
  function switchActivity(input, activity, now = Date.now(), options = {}) {
    const s = clone(input), item = snapshot(activity);
    if (s.active && now < s.active.start) throw Error('系统时间早于当前记录，请校准设备时间后重试');
    const previous = {records:clone(s.records),active:clone(s.active),trackingStart:s.trackingStart};
    ensureStarted(s,now);
    if (s.active && now > s.active.start) s.records.push({...s.active,end:now});
    s.active = {id:uid(),start:now,...item,note:String(options.note || '').slice(0,500),focusMinutes:item.category==='study' ? Number(options.focusMinutes || 0) : 0};
    s.undo = previous;
    return s;
  }
  function undoSwitch(input) {
    if (!input.undo) throw Error('没有可撤销的切换');
    const s=clone(input), old=s.undo;
    s.records=old.records; s.active=old.active; s.trackingStart=old.trackingStart; s.undo=null;
    return s;
  }
  function daySegments(s, key, now=Date.now()) {
    const [begin,finish] = bounds(key), end=Math.min(finish,now);
    if (end <= begin) return [];
    const raw=s.records.concat(s.active ? [{...s.active,end:now}] : [])
      .filter(x=>x.end>begin && x.start<end).map(x=>({...x,start:Math.max(x.start,begin),end:Math.min(x.end,end)})).sort((a,b)=>a.start-b.start);
    const out=[]; let cursor=begin;
    for (const x of raw) {
      if(x.start>cursor) out.push(pending(cursor,x.start));
      if(x.start<cursor) throw Error('记录存在重叠，请检查备份');
      if(x.end>x.start) {out.push(x);cursor=x.end;}
    }
    if(cursor<end) out.push(pending(cursor,end));
    return out;
  }
  function totals(s,key,now=Date.now()) {
    const segs=daySegments(s,key,now), used={sleep:0,study:0,life:0,pending:0}, byActivity={};
    let classTime=0,fun=0,essential=0,longest=0,studySegments=0;
    for(const x of segs) {
      const duration=x.end-x.start;
      used[x.category||'pending']+=duration;
      const k=(x.category||'pending')+'|'+x.name;
      if(!byActivity[k]) byActivity[k]={name:x.name,category:x.category,kind:x.kind,duration:0};
      byActivity[k].duration+=duration;
      if(x.category==='study') {longest=Math.max(longest,duration);studySegments++;if(x.kind==='class')classTime+=duration;}
      if(x.category==='life') {if(x.kind==='fun')fun+=duration;else essential+=duration;}
    }
    return {segs,used,byActivity:Object.values(byActivity).sort((a,b)=>b.duration-a.duration),classTime,fun,essential,longest,studySegments};
  }
  function editInterval(input, from, to, activity, note='', now=Date.now()) {
    if(!Number.isFinite(from)||!Number.isFinite(to)||from>=to||to>now) throw Error('请选择有效的已发生时间段，结束时间不能晚于现在');
    const s=clone(input), first=s.trackingStart??bounds(dateKey(s.createdAt))[0];
    if(from<first) throw Error('只能补录首次使用当天及之后的时间');
    if(!s.active) {
      s.trackingStart=first; s.records=[];
      if(now>first)s.records.push(pending(first,now));
      s.active={id:uid(),start:now,activityId:'pending',name:'待补录',category:null,kind:'pending',icon:'help',note:''};
    }
    const pieces=[];
    for(const x of s.records.concat([{...s.active,end:Infinity}])) {
      if(x.end<=from || x.start>=to) {pieces.push(x);continue;}
      if(x.start<from) pieces.push({...x,end:from});
      if(x.end>to) pieces.push({...x,id:uid(),start:to});
    }
    pieces.push({id:uid(),start:from,end:to,...snapshot(activity),note:String(note).slice(0,500),focusMinutes:0});
    pieces.sort((a,b)=>a.start-b.start);
    const active=pieces.pop();
    if(active.end!==Infinity) throw Error('记录修正失败');
    delete active.end; s.active=active; s.records=pieces; s.undo=null;
    validateState(s);
    return s;
  }
  function updateNote(input,note) { const s=clone(input); if(!s.active)throw Error('请先开始计时');s.active.note=String(note).slice(0,500);s.undo=null;return s; }
  function isClock(v) { return typeof v==='string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(v); }
  function clockMinutes(v) { const [h,m]=v.split(':').map(Number);return h*60+m; }
  function validateCourse(c) {
    if(!c || typeof c.id!=='string'||typeof c.name!=='string'||!c.name.trim()||c.name.length>60||!Number.isInteger(c.weekday)||c.weekday<1||c.weekday>7||!isClock(c.start)||!isClock(c.end)||c.end<=c.start||!['all','odd','even'].includes(c.parity)) throw Error('课表格式不正确，请检查课程名称和时间');
    bounds(c.validFrom);bounds(c.validTo);bounds(c.anchor);
    if(c.validTo<c.validFrom)throw Error('课程结束日期不能早于开始日期');
    if(c.location!==undefined&&(typeof c.location!=='string'||c.location.length>100))throw Error('课程地点格式不正确');
    if(c.excluded!==undefined){if(!Array.isArray(c.excluded)||c.excluded.length>366)throw Error('排除日期格式不正确');c.excluded.forEach(bounds);}
  }
  function coursesForDay(s,key) {
    const [start]=bounds(key), dow=new Date(start).getDay()||7;
    return s.courses.filter(c=>{
      if(c.weekday!==dow||key<c.validFrom||key>c.validTo||(c.excluded||[]).includes(key))return false;
      const anchor=bounds(c.anchor)[0], ad=new Date(anchor), monday=new Date(ad.getFullYear(),ad.getMonth(),ad.getDate()-((ad.getDay()||7)-1));
      const calendarDay=t=>Math.round(Date.UTC(new Date(t).getFullYear(),new Date(t).getMonth(),new Date(t).getDate())/86400000);
      const week=Math.floor((calendarDay(start)-calendarDay(+monday))/7)+1;
      return week>=1 && (c.parity==='all'||(c.parity==='odd'?week%2===1:week%2===0));
    }).sort((a,b)=>a.start.localeCompare(b.start));
  }
  function plannedMinutes(courses) {
    const spans=courses.map(c=>[clockMinutes(c.start),clockMinutes(c.end)]).sort((a,b)=>a[0]-b[0]);
    let count=0,end=0;for(const [a,b] of spans){count+=Math.max(0,b-Math.max(a,end));end=Math.max(end,b);}return count;
  }
  function validateState(s) {
    if(!s||s.version!==1||!Number.isFinite(s.createdAt)||!Array.isArray(s.records)||s.records.length>100000||!Array.isArray(s.activities)||s.activities.length>200||!Array.isArray(s.courses)||s.courses.length>1000)throw Error('不是有效的 Eight Hours 备份');
    if(!s.targets||CATEGORIES.some(k=>!Number.isFinite(s.targets[k])||s.targets[k]<0||s.targets[k]>1440)||CATEGORIES.reduce((n,k)=>n+s.targets[k],0)!==1440)throw Error('三类预算必须合计 24 小时');
    const validSeg=(r,closed)=>{
      if(!r||!Number.isFinite(r.start)||(closed&&(!Number.isFinite(r.end)||r.end<=r.start))||!['sleep','study','life',null].includes(r.category)||typeof r.name!=='string'||!r.name||r.name.length>60||typeof r.id!=='string'||(r.note!==undefined&&(typeof r.note!=='string'||r.note.length>500))||(r.focusMinutes!==undefined&&(!Number.isFinite(r.focusMinutes)||r.focusMinutes<0||r.focusMinutes>1440)))throw Error('备份中存在无效时间记录');
    };
    s.records.forEach(r=>validSeg(r,true));if(s.active)validSeg(s.active,false);
    if(s.trackingStart!==null) {
      if(!Number.isFinite(s.trackingStart)||s.trackingStart>s.createdAt||s.createdAt-s.trackingStart>27*HOUR)throw Error('备份起始时间不正确');
      let cursor=s.trackingStart;
      for(const r of s.records){if(r.start!==cursor)throw Error('备份记录不连续或有重叠');cursor=r.end;}
      if(!s.active||s.active.start!==cursor)throw Error('备份缺少连续的当前活动');
    }else if(s.records.length||s.active)throw Error('备份计时状态不正确');
    const ids=new Set();for(const a of s.activities){snapshot(a);if(typeof a.id!=='string'||ids.has(a.id)||!['rest','class','self','essential','fun'].includes(a.kind)||typeof a.pinned!=='boolean')throw Error('快捷活动格式不正确');ids.add(a.id);}
    s.courses.forEach(validateCourse);
    if(!s.dailyPlans||typeof s.dailyPlans!=='object'||Array.isArray(s.dailyPlans)||Object.entries(s.dailyPlans).some(([k,v])=>{try{bounds(k);return !Number.isFinite(v)||v<0||v>1440;}catch{return true;}}))throw Error('生活预留时间格式不正确');
    if(!s.preferences||!Number.isFinite(s.preferences.focusMinutes)||s.preferences.focusMinutes<0||s.preferences.focusMinutes>1440||typeof s.preferences.sound!=='boolean')throw Error('偏好设置格式不正确');
    return true;
  }
  function parseBackup(text) {
    if(text.length>15*1024*1024)throw Error('备份文件过大');
    let wrapper;try{wrapper=JSON.parse(text);}catch{throw Error('文件不是有效的 JSON');}
    if(wrapper.app!=='eight-hours'||!wrapper.data)throw Error('请选择本应用导出的备份');
    validateState(wrapper.data);
    const s=clone(wrapper.data);s.undo=null;s.revision=Number.isInteger(s.revision)?s.revision:0;return s;
  }
  return {MIN,HOUR,CATEGORIES,DEFAULT_ACTIVITIES,uid,clone,dateKey,bounds,createState,switchActivity,undoSwitch,daySegments,totals,editInterval,updateNote,coursesForDay,plannedMinutes,validateCourse,validateState,parseBackup,clockMinutes};
});
