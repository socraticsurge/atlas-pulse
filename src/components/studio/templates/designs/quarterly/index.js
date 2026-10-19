import '@fontsource-variable/bodoni-moda/opsz.css';
import '@fontsource-variable/bodoni-moda/opsz-italic.css';
import '@fontsource/libre-franklin/400.css';
import '@fontsource/libre-franklin/600.css';
import './quarterly.css';
import Masthead from './Masthead.jsx';

/** A mid-century magazine: Bodoni display, Franklin text, hairlines and room to breathe. */
export default {
  id: 'quarterly',
  label: 'Quarterly',
  description: 'A refined mid-century magazine: Bodoni italics, hairlines and generous space.',
  className: 'nl-quarterly',
  Masthead,
  options: { essayKicker: 'Essay', dropCap: true, numberedTakeaways: true },
};
