import Stage from 'openfl/display/Stage';
import Main from './Main';

var stage = new Stage(550, 400, 0xffffff, Main);
stage.element.style.width = '550px';
stage.element.style.height = '400px';
document.getElementById('app')?.remove();
document.body.appendChild(stage.element);
