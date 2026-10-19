import '@fontsource/anton/400.css';
import '@fontsource/oswald/500.css';
import '@fontsource/oswald/600.css';
import '@fontsource-variable/source-serif-4/opsz.css';
import '@fontsource-variable/source-serif-4/opsz-italic.css';
import './evening.css';
import Masthead from './Masthead.jsx';

/** A tabloid evening edition: red banner, heavy condensed headlines, black rules. */
export default {
  id: 'evening',
  label: 'Evening Edition',
  description: 'A punchy tabloid: red banner, heavy condensed headlines and bold rules.',
  className: 'nl-evening',
  Masthead,
  options: { essayKicker: 'Analysis', dropCap: false, numberedTakeaways: true },
};
