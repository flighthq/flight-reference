import Stage from 'openfl/display/Stage';
import Main from './Main';

const stage = new Stage(170, 170, 0xffffff, Main);
stage.element.style.width = '170px';
stage.element.style.height = '170px';
document.body.appendChild(stage.element);
