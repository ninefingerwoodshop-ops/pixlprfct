import {field,form,button} from '/editor/account-ui.js';
const address=field('Workspace server address','address',{type:'url',autocomplete:'url',maxLength:2048});
address.querySelector('input').placeholder='https://design.example.com';
const panel=form('Connect to a team server',[address],'Connect',async({address})=>window.pixlDesktop.submitServer(address));
panel.append(button('Cancel',()=>window.pixlDesktop.closeConnect()));
document.getElementById('connection-form').append(panel);address.querySelector('input').focus();
