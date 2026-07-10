import Stage from 'openfl/display/Stage';
import Main from './Main';

var stage = new Stage(800, 600, 0xffffff, Main);
stage.element.style.width = '800px';
stage.element.style.height = '600px';
document.getElementById('app')?.remove();
document.body.appendChild(stage.element);
