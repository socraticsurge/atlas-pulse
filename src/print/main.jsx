import { createRoot } from 'react-dom/client';
import { designById } from '../components/studio/templates/designs/index.js';
import { fetchStudioItem } from '../utils/api.js';
import PrintPage from './PrintPage.jsx';
import './print.css';

// print.html?id=<studio item>&design=<design id>: one newsletter page, drawn
// for the export renderer (server/utils/pageRenderer.js). <body data-ready>
// says when it is done ("1") or why it failed ("error" + data-error).

const nextFrame = () => new Promise((resolve) => requestAnimationFrame(() => resolve()));

async function draw() {
  const params = new URLSearchParams(location.search);
  const item = await fetchStudioItem(Number(params.get('id')));
  const design = designById(params.get('design') || item.template);
  createRoot(document.getElementById('root')).render(<PrintPage item={item} design={design} />);
  await nextFrame();
  await document.fonts.ready;
  await nextFrame();
  // The paper colour fills the whole sheet, margins included.
  document.documentElement.style.background = getComputedStyle(document.querySelector('.nl')).backgroundColor;
  document.title = item.title;
  document.body.dataset.ready = '1';
}

draw().catch((err) => {
  document.body.dataset.error = err.message;
  document.body.dataset.ready = 'error';
});
