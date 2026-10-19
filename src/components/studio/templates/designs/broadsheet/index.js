import '@fontsource/unifrakturmaguntia/400.css';
import '@fontsource/libre-caslon-display/400.css';
import '@fontsource/libre-caslon-text/400.css';
import '@fontsource/libre-caslon-text/400-italic.css';
import '@fontsource/libre-caslon-text/700.css';
import './broadsheet.css';
import Masthead from './Masthead.jsx';

/** A classic newspaper: blackletter masthead, Caslon type, rules and boxed panels. */
export default {
  id: 'broadsheet',
  label: 'Broadsheet',
  description: 'A classic newspaper: blackletter masthead, Caslon type and ruled sections.',
  className: 'nl-broadsheet',
  Masthead,
  options: { essayKicker: 'Analysis', dropCap: true, numberedTakeaways: true },
};
