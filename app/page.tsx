import type {Metadata} from 'next';
import ProjectHome from '../components/project-home';
import '../web/inspector-dropdown.css';
import '../web/ui-typography.css';
import '../web/ui-spacing.css';
import '../web/ui-radii.css';
import '../web/ui-colors.css';
import '../web/ui-shadows.css';
import '../web/ui-states.css';
import '../web/ui-motion.css';
import '../web/design-browser.css';
import '../web/project-home.css';
import '../web/inspector-fields.css';
import '../web/inspector-actions.css';
import '../web/popover-controls.css';
import '../web/dialog-controls.css';
export const metadata:Metadata={title:'Projects · PixlPrfct'};
export default function Home(){return <ProjectHome/>;}
