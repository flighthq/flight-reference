import AntiAliasType from 'openfl/text/AntiAliasType';
import Event from 'openfl/events/Event';
import GridFitType from 'openfl/text/GridFitType';
import TextField from 'openfl/text/TextField';
import TextFormat from 'openfl/text/TextFormat';
import TextFormatAlign from 'openfl/text/TextFormatAlign';

import { createReferenceStage } from '../../../../harness/stage';

const WIDTH = 800;
const HEIGHT = 600;

const { root } = createReferenceStage(WIDTH, HEIGHT, 0xffffff);

let textWidth = 300;
let widthInc = 5;

const normalTextFormat = new TextFormat('_sans', 28, 0, true);
normalTextFormat.align = TextFormatAlign.LEFT;

const textField = new TextField();
textField.antiAliasType = AntiAliasType.ADVANCED;
textField.gridFitType = GridFitType.SUBPIXEL;
textField.defaultTextFormat = normalTextFormat;
textField.x = 100;
textField.y = 100;
textField.width = textWidth;
textField.height = HEIGHT - 2 * textField.y;
textField.textColor = 0xe8c343;
textField.multiline = true;
textField.wordWrap = true;
textField.border = true;
textField.borderColor = 0xe8c343;

textField.htmlText =
  'Here is some UTF-8: ' +
  'angelo <i>Ephesi ecclesiae</i> scribe haec dicit qui tenet septem ' +
  '<b>stellas</b> in dextera sua qui ambulat in medio septem ' +
  'candelabrorum aureorum scio <u>opera tua et laborem</u> et ' +
  '<br>&lt; (less than), &gt; (greater than), &amp; ' +
  '(ampersand), &quot; (double quote), &apos; (apostrophe), ' +
  '&lt;&gt;&amp;&quot;&apos; (all)' +
  'patientiam <font size="+10">tuam et quia</font> nom potes ' +
  '<font size="-6" color="#123456">sustinere malos</font> et ' +
  'temptasti eos qui se dicunt apostolos et non sunt et ' +
  'invenisti eos mendaces et patientiam habes et sustinuisti ' +
  'propter nomen meum et non defecisti sed habeo adversus te <p><p>' +
  'quod caritatem tuam primam reliquisti memor esto itaque ' +
  'unde excideris et age paenitentiam et prima opera fac sin ' +
  'autem venio tibi et movebo candelabrum tuum de loco suo nisi ' +
  'paenitentiam egeris sed hoc habes quia odisti facta ' +
  'Nicolaitarum quae et ego odi qui habet aurem audiat quid ' +
  'Spiritus dicat ecclesiis vincenti dabo ei edere de ligno ' +
  'vitae quod est in paradiso Dei mei';

root.addChild(textField);

const maxWidth = WIDTH - textField.x - textField.x;

root.addEventListener(Event.ENTER_FRAME, () => {
  textWidth += widthInc;
  if (textWidth <= 5 || textWidth >= maxWidth) widthInc = -widthInc;
  textField.width = textWidth;
});
