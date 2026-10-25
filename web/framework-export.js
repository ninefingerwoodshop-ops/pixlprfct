// Framework packages use the same compiled HTML/CSS as the live CSS canvas.
const json=value=>JSON.stringify(value,null,2);
const body=html=>html.match(/<body>([\s\S]*)<\/body>/)[1];
const decode=s=>s.replace(/&(#x[\da-f]+|#\d+|amp|lt|gt|quot|apos);/gi,(_,v)=>v[0]==='#'?String.fromCodePoint(v[1].toLowerCase()==='x'?parseInt(v.slice(2),16):Number(v.slice(1))):({amp:'&',lt:'<',gt:'>',quot:'"',apos:"'"}[v]));
// Generated HTML is a known, escaped subset. Preserve text as JSX expressions.
export function reactMarkup(html){
 return html.replace(/<[^>]+>|[^<]+/g,token=>{
  if(!token.startsWith('<'))return '{'+JSON.stringify(decode(token).replaceAll('&#39;',"'"))+'}';
  if(token.startsWith('</'))return token;
  return token.replace(/([\w:-]+)="([^"]*)"/g,(_,name,value)=>{
   let key=({class:'className',for:'htmlFor','xlink:href':'xlinkHref',tabindex:'tabIndex',xmlns:'xmlns'}[name]??name);
   if(!key.startsWith('data-')&&!key.startsWith('aria-'))key=key.replace(/[-:]([a-z])/g,(_,c)=>c.toUpperCase());
   let val=decode(value).replaceAll('&#39;',"'");
   if(key==='style')val=Object.fromEntries(val.split(';').filter(Boolean).map(s=>{const i=s.indexOf(':');return [s.slice(0,i).trim().replace(/-([a-z])/g,(_,c)=>c.toUpperCase()),s.slice(i+1).trim()];}));
   return key+'={'+JSON.stringify(val)+'}';
  }).replace(/<(br|img|input|hr)(\s[^>]*?)?>/g,(m)=>m.endsWith('/>')?m:m.slice(0,-1)+' />');
 });
}
export function frameworkFiles(raw,{target,scope}){
 if(!['react','vue','angular','rust'].includes(target))throw new Error('Choose a valid framework');
 const manifest=JSON.parse(raw.find(f=>f.name==='project.json').text),files=[],whole=scope==='project';
 const add=(name,text)=>files.push({name,text});
 const pages=manifest.pages.map((page,i)=>{
  const name='Page'+(i+1),stem='page-'+(i+1),html=body(raw.find(f=>f.name===page.html).text);
  // Contain generic scene selectors so imported pages cannot override each other.
  const css=raw.find(f=>f.name===page.css).text.replace('body{margin:0}','').replace(/([^{}]+)\{/g,(_,selectors)=>selectors.split(',').map(s=>`.${stem} ${s.trim()}`).join(',')+'{');
  add(stem+'.css',css);
  if(target==='react')add(name+'.jsx',`import React from 'react';\nimport './${stem}.css';\nexport default function ${name}(){\n return <div className="${stem}">${reactMarkup(html)}</div>;\n}\n`);
  if(target==='vue')add(name+'.vue',`<template>\n <div class="${stem}" v-pre>${html}</div>\n</template>\n<style src="./${stem}.css"></style>\n`);
  if(target==='angular'){
   add(stem+'.html',`<div class="${stem}" ngNonBindable>${html}</div>`);
   add(stem+'.ts',`import {Component, ViewEncapsulation} from '@angular/core';\n@Component({selector:'px-${stem}',standalone:true,templateUrl:'./${stem}.html',styleUrl:'./${stem}.css',encapsulation:ViewEncapsulation.None})\nexport class ${name} {}\n`);
  }
  if(target==='rust'){
   add(stem+'.html',`<div class="${stem}">${html}</div>`);
   add('page_'+(i+1)+'.rs',`use leptos::prelude::*;\n#[component]\npub fn ${name}() -> impl IntoView {\n view! { <style>{include_str!("${stem}.css")}</style><div inner_html=include_str!("${stem}.html")></div> }\n}\n`);
  }
  return {...page,component:name,stem};
 });
 if(whole){
  const navigation=pages.map((p,i)=>`<a href="?page=${i+1}">${p.name.replace(/[&<>"']/g,c=>'&#'+c.charCodeAt(0)+';')}</a>`).join(' ');
  const entry=`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>PixlPrfct project</title></head><body style="margin:0"><nav style="padding:12px;display:flex;gap:16px;font:14px system-ui">${navigation}</nav>`;
  if(target==='rust'){
   add('Cargo.toml','[package]\nname = "pixlprfct-export"\nversion = "0.1.0"\nedition = "2021"\n\n[dependencies]\nleptos = { version = "0.8", features = ["csr"] }\nweb-sys = { version = "0.3", features = ["Window", "Location", "UrlSearchParams"] }\n\n[[bin]]\nname = "pixlprfct-export"\npath = "main.rs"\n');
   add('index.html',entry+'<link data-trunk rel="rust" data-wasm-opt="z"></body></html>');
   add('main.rs',`use leptos::prelude::*;\n${pages.map((p,i)=>`mod page_${i+1};`).join('\n')}\nfn main(){\n let search=web_sys::window().unwrap().location().search().unwrap_or_default();\n let page=web_sys::UrlSearchParams::new_with_str(&search).ok().and_then(|p|p.get("page")).unwrap_or_default();\n leptos::mount::mount_to_body(move || match page.as_str(){\n${pages.map((p,i)=>` "${i+1}" => view!{<page_${i+1}::${p.component}/>}.into_any(),`).join('\n')}\n _ => view!{<page_1::Page1/>}.into_any(),\n });\n}\n`);
  }else{
   const pkg={name:'pixlprfct-export',version:'1.0.0',private:true,type:'module',scripts:{dev:'vite --host 127.0.0.1',build:'vite build',preview:'vite preview'},dependencies:{},devDependencies:{vite:'^7.0.0'}};
   if(target==='react'){
    Object.assign(pkg.dependencies,{react:'^19.0.0','react-dom':'^19.0.0'});
    add('main.jsx',`import React from 'react';\nimport {createRoot} from 'react-dom/client';\n${pages.map(p=>`import ${p.component} from './${p.component}.jsx';`).join('\n')}\nconst pages=[${pages.map(p=>p.component).join(',')}];\nconst Page=pages[Number(new URLSearchParams(location.search).get('page')||1)-1]||pages[0];\ncreateRoot(document.getElementById('app')).render(<Page/>);\n`);
    add('index.html',entry+'<div id="app"></div><script type="module" src="/main.jsx"></script></body></html>');
   }else if(target==='vue'){
    pkg.dependencies.vue='^3.5.0';pkg.devDependencies['@vitejs/plugin-vue']='^6.0.0';
    add('vite.config.js',"import {defineConfig} from 'vite';\nimport vue from '@vitejs/plugin-vue';\nexport default defineConfig({plugins:[vue()]});\n");
    add('main.js',`import {createApp} from 'vue';\n${pages.map(p=>`import ${p.component} from './${p.component}.vue';`).join('\n')}\nconst pages=[${pages.map(p=>p.component).join(',')}];\ncreateApp(pages[Number(new URLSearchParams(location.search).get('page')||1)-1]||pages[0]).mount('#app');\n`);
    add('index.html',entry+'<div id="app"></div><script type="module" src="/main.js"></script></body></html>');
   }else{
    pkg.scripts={dev:'ng serve --host 127.0.0.1',build:'ng build'};
    pkg.dependencies={'@angular/core':'^20.0.0','@angular/common':'^20.0.0','@angular/compiler':'^20.0.0','@angular/platform-browser':'^20.0.0',rxjs:'^7.8.0','zone.js':'~0.15.0',tslib:'^2.8.0'};
    pkg.devDependencies={'@angular/cli':'^20.0.0','@angular/build':'^20.0.0','@angular/compiler-cli':'^20.0.0',typescript:'~5.8.3'};
    add('main.ts',`import 'zone.js';\nimport {Component} from '@angular/core';\nimport {bootstrapApplication} from '@angular/platform-browser';\n${pages.map(p=>`import {${p.component}} from './${p.stem}';`).join('\n')}\n@Component({selector:'app-root',standalone:true,imports:[${pages.map(p=>p.component).join(',')}],template:${JSON.stringify(pages.map((p,i)=>`@if(page===${i+1}){<px-${p.stem}/>} `).join(''))}})\nclass App { page=Math.min(${pages.length},Math.max(1,Number(new URLSearchParams(location.search).get('page'))||1)); }\nbootstrapApplication(App).catch(console.error);\n`);
    add('index.html',entry+'<app-root></app-root></body></html>');
    add('tsconfig.json',json({compilerOptions:{target:'ES2022',module:'preserve',moduleResolution:'bundler',experimentalDecorators:true,skipLibCheck:true,strict:true,lib:['ES2022','DOM']},angularCompilerOptions:{strictTemplates:true},files:['main.ts']}));
    add('angular.json',json({version:1,projects:{app:{projectType:'application',root:'',sourceRoot:'',architect:{build:{builder:'@angular/build:application',options:{browser:'main.ts',index:'index.html',tsConfig:'tsconfig.json',outputPath:'dist'}},serve:{builder:'@angular/build:dev-server',options:{buildTarget:'app:build'}}}}}}));
   }
   add('package.json',json(pkg));add('.gitignore','node_modules/\ndist/\n.angular/\n');
  }
 }
 add('project.json',json({name:manifest.name,target,pages:pages.map(({id,name,component,stem})=>({id,name,component,stem}))}));
 add('README.md',`# ${manifest.name.replace(/[\r\n]/g,' ')}\n\n${target.toUpperCase()} ${whole?'runnable project':'page/component export'}.\n\n${whole?(target==='rust'?'Install Rust and Trunk, then run:\n\n    rustup target add wasm32-unknown-unknown\n    cargo install trunk --locked\n    trunk serve --open\n\nProduction build: trunk build --release':'Requires Node.js 22.12+ and npm. Run:\n\n    npm install\n    npm run dev\n\nProduction build: npm run build'):`Copy the component and its companion HTML/CSS files into your existing ${target} application and import ${pages[0].component}. ${target==='rust'?'Add leptos 0.8 with the csr feature; declare the page_1 module.':''}`}\n\n${pages.map(p=>`- ${p.name}: ${p.component}`).join('\n')}\n\nThe design uses real CSS, including layout and glass effects, with inline SVG paint where needed. Supply the fonts used by your design.\n\nPrototype actions are not converted. Add application state, events and navigation in the generated components. ${target==='vue'?'Remove v-pre on the wrapper when adding Vue bindings (escape literal template syntax in design text).':target==='angular'?'Remove ngNonBindable when adding Angular bindings (escape literal template syntax in design text).':target==='rust'?'The Leptos component embeds editable HTML using include_str! and inner_html. Convert interactive elements into view! nodes when adding Rust event handlers.':''}\n`);
 return files;
}
