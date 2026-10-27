export function automaticLayoutClass(shape){
 let slug=String(shape.name??'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')||'layer';
 if(/^[0-9]/.test(slug)||slug.startsWith('px-'))slug='layer-'+slug;
 return `${slug}-${shape.id}`;
}
export const layoutClass=shape=>shape.layout_class||automaticLayoutClass(shape);
export function validateLayoutClass(name,shape,shapes=[]){
 if(!/^[A-Za-z_][A-Za-z0-9_-]*$/.test(name))throw new Error('Use one class name starting with a letter or underscore, followed by letters, numbers, hyphens or underscores.');
 if(name.startsWith('px-')||name==='layout'||(/^layout-\d+$/.test(name)&&name!==`layout-${shape.id}`))throw new Error('That name is reserved. Choose a different class name.');
 if(shapes.some(s=>s.id!==shape.id&&layoutClass(s)===name))throw new Error(`The class “${name}” is already used by another layer.`);
 return name;
}
export function renameLayoutSelector(text,from,to){
 return text.replace(new RegExp('\\.'+from+'(?=\\s*\\{)','g'),'.'+to);
}
