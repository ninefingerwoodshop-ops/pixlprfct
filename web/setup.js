import {shell} from './account-ui.js';
import {mountSetup} from './setup-controls.js';
mountSetup(shell(document.getElementById('account-app'),'setup'));
