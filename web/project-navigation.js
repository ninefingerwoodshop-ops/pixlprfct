export function projectUrl(project){
 if(!['local','cloud'].includes(project.kind)||!project.id)throw new Error('Choose a project to open.');
 const params=new URLSearchParams({[project.kind==='local'?'draft':'cloud']:project.id});if(project.workspace&&project.workspace!=='personal')params.set('workspace',project.workspace);
 return '/editor/index.html?'+params;
}
export function projectRoute(search){
 const params=new URLSearchParams(search),draft=params.get('draft'),cloud=params.get('cloud');
 if(params.has('draft')&&params.has('cloud')||params.has('draft')&&!draft?.trim()||params.has('cloud')&&!cloud?.trim())throw new Error('This project link is incomplete. Choose a project from Home.');
 return draft?{kind:'local',id:draft}:cloud?{kind:'cloud',id:cloud}:null;
}
export function visibleProjects(projects,{query='',scope='all',sort='edited'}={}){
 const text=query.trim().toLocaleLowerCase();
 return projects.filter(p=>(scope==='all'||p.kind===scope)&&p.name.toLocaleLowerCase().includes(text)).sort((a,b)=>sort==='name'?a.name.localeCompare(b.name):b.updatedAt-a.updatedAt||a.name.localeCompare(b.name));
}
