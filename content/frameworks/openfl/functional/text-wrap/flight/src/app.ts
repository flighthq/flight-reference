import {
  addNodeChild,
  createDisplayContainer,
  createRichText,
  parseTextMarkup,
  RichTextKind,
  setRichTextContent,
  setRichTextWidth,
} from '@flighthq/sdk';
import { createFunctionalTarget } from '@ft/render';

const { height, render, width } = await createFunctionalTarget({
  width: 800,
  height: 600,
  background: 0xffffffff,
  kinds: [RichTextKind],
});

const root = createDisplayContainer();

const W = width;
const H = height;

const field = createRichText();
field.data.defaultTextFormat = { font: 'sans-serif', size: 28, bold: true };
field.data.textColor = 0xe8c343;
field.data.multiline = true;
field.data.wordWrap = true;
field.data.border = true;
field.data.borderColor = 0xe8c343;
field.x = 100;
field.y = 100;
field.data.width = 300;
field.data.height = H - 200;
// Flight has no `htmlText` magic property: markup is parsed explicitly into a plain string plus
// format ranges and assigned via setRichTextContent. Flight markup uses absolute font sizes, so
// OpenFL's relative "+10"/"-6" (against the 28px base) are encoded here as their resolved values
// 38/22 to match the reference's rendered sizes.
setRichTextContent(
  field,
  parseTextMarkup(
    'Here is some UTF-8: ' +
      'angelo <i>Ephesi ecclesiae</i> scribe haec dicit qui tenet septem ' +
      '<b>stellas</b> in dextera sua qui ambulat in medio septem ' +
      'candelabrorum aureorum scio <u>opera tua et laborem</u> et ' +
      '<br>&lt; (less than), &gt; (greater than), &amp; ' +
      '(ampersand), &quot; (double quote), &apos; (apostrophe), ' +
      '&lt;&gt;&amp;&quot;&apos; (all)' +
      'patientiam <font size="38">tuam et quia</font> nom potes ' +
      '<font size="22" color="#123456">sustinere malos</font> et ' +
      'temptasti eos qui se dicunt apostolos et non sunt et ' +
      'invenisti eos mendaces et patientiam habes et sustinuisti ' +
      'propter nomen meum et non defecisti sed habeo adversus te <p><p>' +
      'quod caritatem tuam primam reliquisti memor esto itaque ' +
      'unde excideris et age paenitentiam et prima opera fac sin ' +
      'autem venio tibi et movebo candelabrum tuum de loco suo nisi ' +
      'paenitentiam egeris sed hoc habes quia odisti facta ' +
      'Nicolaitarum quae et ego odi qui habet aurem audiat quid ' +
      'Spiritus dicat ecclesiis vincenti dabo ei edere de ligno ' +
      'vitae quod est in paradiso Dei mei',
  ),
);
addNodeChild(root, field);

const maxWidth = W - field.x - 100;
let textWidth = 300;
let widthInc = 5;

function enterFrame(): void {
  textWidth += widthInc;
  if (textWidth <= 5 || textWidth >= maxWidth) widthInc = -widthInc;
  setRichTextWidth(field, textWidth);

  render(root);
  requestAnimationFrame(enterFrame);
}

enterFrame();
