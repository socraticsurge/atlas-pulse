import { test } from 'node:test';
import assert from 'node:assert/strict';
import { extractFromHtml } from '@extractus/article-extractor';
import { fillPictureImageSrc, largestInSrcset } from './articleExtractor.js';

const IMAGE = 'https://miro.medium.com/v2/resize:fit:1400/1*abc.png';

// A Medium figure, trimmed: the URLs are only on the <source> tags.
const MEDIUM_FIGURE = `<figure><div role="button" tabindex="0"><span>Press enter or click to view image in full size</span>
<div><picture><source srcSet="https://miro.medium.com/v2/resize:fit:640/format:webp/1*abc.png 640w, https://miro.medium.com/v2/resize:fit:1400/format:webp/1*abc.png 1400w" type="image/webp"/>
<source srcSet="https://miro.medium.com/v2/resize:fit:640/1*abc.png 640w, ${IMAGE} 1400w"/>
<img alt="" width="700" height="394" loading="lazy" role="presentation"/></picture></div></div>
<figcaption>Figure 1: a chart</figcaption></figure>`;

const PARAGRAPH = `<p>${'The article body runs long enough for the extractor to keep it as content. '.repeat(6)}</p>`;
const page = (figure) => `<html><head><title>A post</title></head><body><article>${PARAGRAPH}${figure}${PARAGRAPH}</article></body></html>`;

test('largestInSrcset picks the widest or densest candidate', () => {
  assert.equal(largestInSrcset('a.png 640w, b.png 1400w, c.png 720w'), 'b.png');
  assert.equal(largestInSrcset('a.png 1x, b.png 2x'), 'b.png');
  assert.equal(largestInSrcset('https://e.com/w_640,c_fill/a.png 640w'), 'https://e.com/w_640,c_fill/a.png');
  assert.equal(largestInSrcset('only.png'), 'only.png');
  assert.equal(largestInSrcset(''), '');
  assert.equal(largestInSrcset(undefined), '');
});

test('fillPictureImageSrc gives a <picture> image with no src its first source', () => {
  const html = fillPictureImageSrc(page(MEDIUM_FIGURE));
  assert.match(html, /<img [^>]*src="https:\/\/miro\.medium\.com\/v2\/resize:fit:1400\/format:webp\/1\*abc\.png"/);
});

test('fillPictureImageSrc leaves pages with nothing to fill unchanged', () => {
  const noPicture = page(`<figure><img src="${IMAGE}" alt=""></figure>`);
  assert.equal(fillPictureImageSrc(noPicture), noPicture);
  const alreadySet = page(`<picture><source srcset="${IMAGE} 1400w"><img src="https://e.com/own.png" alt=""></picture>`);
  assert.equal(fillPictureImageSrc(alreadySet), alreadySet);
});

test('a Medium figure keeps its image through extraction', async () => {
  const url = 'https://pub.example.com/a-post';
  const article = await extractFromHtml(fillPictureImageSrc(page(MEDIUM_FIGURE)), url);
  assert.match(article.content, /<img [^>]*src="https:\/\/miro\.medium\.com\//);
  assert.match(article.content, /Figure 1: a chart/);
});
