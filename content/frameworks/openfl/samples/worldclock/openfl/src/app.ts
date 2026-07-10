import Stage from 'openfl/display/Stage';
import Main from './Main';

const stage = new Stage(370, 140, 0xffffff, Main);
stage.element.style.width = '370px';
stage.element.style.height = '140px';
document.getElementById('app')?.remove();
document.body.appendChild(stage.element);
