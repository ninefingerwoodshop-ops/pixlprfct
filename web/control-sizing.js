// Control height comes from its parts and variables, never a canvas resize.
const hugHeightKinds=new Set(['segmented','checkbox','radio','switch','text','password','email','number','tel','url','search','date','datetime-local','month','week','time','textarea','select','range','color','file']);
export const hasHugControlHeight=shape=>hugHeightKinds.has(shape?.control?.kind)||(shape?.control?.kind==='button'&&!!shape.control.starter);
